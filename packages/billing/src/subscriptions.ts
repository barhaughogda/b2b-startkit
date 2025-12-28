import { eq, and } from 'drizzle-orm'
import { getStripe } from './stripe'
import { superadminDb } from '@startkit/database'
import { subscriptions, organizations } from '@startkit/database/schema'
import type { CheckoutConfig, SubscriptionData } from './types'
import type { PlanTier, SubscriptionStatus } from '@startkit/config'
import type Stripe from 'stripe'

/**
 * Map Stripe subscription status to our SubscriptionStatus type
 */
function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
    paused: 'paused',
  }
  return statusMap[status] ?? 'incomplete'
}

/**
 * Map Stripe price ID to plan tier
 * This should match your Stripe product configuration
 */
function mapPriceIdToPlan(priceId: string | null | undefined): PlanTier {
  if (!priceId) return 'free'
  // TODO: This should be configurable per product
  // For now, assume price IDs contain the plan name
  if (priceId.includes('free')) return 'free'
  if (priceId.includes('starter')) return 'starter'
  if (priceId.includes('pro')) return 'pro'
  if (priceId.includes('enterprise')) return 'enterprise'
  return 'free'
}

/**
 * Create a Stripe checkout session for new subscriptions
 *
 * @example
 * const session = await createCheckoutSession({
 *   organizationId: org.id,
 *   priceId: 'price_xxx',
 *   successUrl: '/billing/success',
 *   cancelUrl: '/billing',
 * })
 * // Redirect to session.url
 */
export async function createCheckoutSession(config: CheckoutConfig): Promise<{ url: string }> {
  const stripe = getStripe()

  // Get organization to ensure it exists
  const [org] = await superadminDb
    .select()
    .from(organizations)
    .where(eq(organizations.id, config.organizationId))
    .limit(1)

  if (!org) {
    throw new Error(`Organization ${config.organizationId} not found`)
  }

  // Get or create Stripe customer
  let customerId: string
  const [existingSubscription] = await superadminDb
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, config.organizationId))
    .limit(1)

  if (existingSubscription?.stripeCustomerId) {
    customerId = existingSubscription.stripeCustomerId
  } else {
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      metadata: {
        organizationId: config.organizationId,
        clerkOrgId: org.clerkOrgId,
      },
      name: org.name,
    })
    customerId = customer.id

    // Create subscription record in database
    await superadminDb.insert(subscriptions).values({
      organizationId: config.organizationId,
      stripeCustomerId: customerId,
      status: 'incomplete',
      plan: mapPriceIdToPlan(config.priceId),
    })
  }

  // Build line items
  const lineItems = [
    {
      price: config.priceId,
      quantity: config.quantity ?? 1,
    },
  ]

  // Build session params
  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: lineItems,
    success_url: config.successUrl,
    cancel_url: config.cancelUrl,
    customer: customerId,
    metadata: {
      organizationId: config.organizationId,
      ...config.metadata,
    },
    subscription_data: {
      metadata: {
        organizationId: config.organizationId,
      },
    },
  }

  // Add trial if specified
  if (config.trialDays) {
    sessionParams.subscription_data!.trial_period_days = config.trialDays
  }

  // Add promotion code if specified
  if (config.promotionCode) {
    sessionParams.discounts = [{ promotion_code: config.promotionCode }]
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  if (!session.url) {
    throw new Error('Failed to create checkout session URL')
  }

  return { url: session.url }
}

/**
 * Create a billing portal session for managing subscriptions
 *
 * @example
 * const portal = await createBillingPortalSession(org.stripeCustomerId, '/billing')
 * // Redirect to portal.url
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = getStripe()

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return { url: session.url }
}

/**
 * Get subscription data from database (synced from Stripe)
 * Falls back to Stripe API if not in database
 */
export async function getSubscription(
  organizationId: string
): Promise<SubscriptionData | null> {
  const [subscription] = await superadminDb
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1)

  if (!subscription) {
    return null
  }

  // If we have a Stripe subscription ID, fetch latest data
  if (subscription.stripeSubscriptionId) {
    try {
      const stripe = getStripe()
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId,
        {
          expand: ['default_payment_method', 'latest_invoice'],
        }
      )

      // Sync latest data from Stripe
      await superadminDb
        .update(subscriptions)
        .set({
          status: mapStripeStatus(stripeSubscription.status),
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
            ? new Date(stripeSubscription.cancel_at_period_end * 1000)
            : null,
          canceledAt: stripeSubscription.canceled_at
            ? new Date(stripeSubscription.canceled_at * 1000)
            : null,
          seatCount: stripeSubscription.items.data[0]?.quantity ?? 1,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id))
    } catch (error) {
      // If Stripe subscription doesn't exist, mark as canceled
      console.error(`Failed to fetch Stripe subscription: ${error}`)
    }
  }

  // Return updated subscription
  const [updated] = await superadminDb
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1)

  if (!updated) return null

  return {
    id: updated.id,
    organizationId: updated.organizationId,
    stripeCustomerId: updated.stripeCustomerId,
    stripeSubscriptionId: updated.stripeSubscriptionId,
    stripePriceId: updated.stripePriceId,
    status: updated.status,
    plan: updated.plan,
    currentPeriodStart: updated.currentPeriodStart,
    currentPeriodEnd: updated.currentPeriodEnd,
    cancelAtPeriodEnd: updated.cancelAtPeriodEnd !== null,
    seatCount: updated.seatCount,
    maxSeats: updated.maxSeats,
  }
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(organizationId: string): Promise<void> {
  const [subscription] = await superadminDb
    .select({ stripeSubscriptionId: subscriptions.stripeSubscriptionId })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1)

  if (!subscription?.stripeSubscriptionId) {
    throw new Error('No active subscription found')
  }

  const stripe = getStripe()
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  })

  // Update database
  await superadminDb
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: new Date(), // Will be updated by webhook with exact date
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId))
}

/**
 * Resume a subscription that was set to cancel
 */
export async function resumeSubscription(organizationId: string): Promise<void> {
  const [subscription] = await superadminDb
    .select({ stripeSubscriptionId: subscriptions.stripeSubscriptionId })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1)

  if (!subscription?.stripeSubscriptionId) {
    throw new Error('No subscription found')
  }

  const stripe = getStripe()
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  })

  // Update database
  await superadminDb
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId))
}

/**
 * Change subscription (upgrade/downgrade)
 */
export async function changeSubscription(
  organizationId: string,
  newPriceId: string
): Promise<void> {
  const [subscription] = await superadminDb
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1)

  if (!subscription?.stripeSubscriptionId) {
    throw new Error('No active subscription found')
  }

  const stripe = getStripe()
  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId
  )

  // Get the subscription item to update
  const subscriptionItem = stripeSubscription.items.data[0]
  if (!subscriptionItem) {
    throw new Error('No subscription item found')
  }

  // Update the subscription item to the new price
  await stripe.subscriptionItems.update(subscriptionItem.id, {
    price: newPriceId,
    proration_behavior: 'create_prorations', // Prorate the change
  })

  // Update database - webhook will sync the rest
  await superadminDb
    .update(subscriptions)
    .set({
      stripePriceId: newPriceId,
      plan: mapPriceIdToPlan(newPriceId),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId))
}

/**
 * Update subscription quantity (for seat-based billing)
 */
export async function updateSubscriptionQuantity(
  organizationId: string,
  quantity: number
): Promise<void> {
  const [subscription] = await superadminDb
    .select({ stripeSubscriptionId: subscriptions.stripeSubscriptionId })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1)

  if (!subscription?.stripeSubscriptionId) {
    throw new Error('No active subscription found')
  }

  const stripe = getStripe()
  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId
  )
  const itemId = stripeSubscription.items.data[0]?.id

  if (!itemId) {
    throw new Error('No subscription item found')
  }

  await stripe.subscriptionItems.update(itemId, { quantity })

  // Update database - webhook will sync the rest
  await superadminDb
    .update(subscriptions)
    .set({
      seatCount: quantity,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId))
}

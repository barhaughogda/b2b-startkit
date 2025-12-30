import { eq, and } from 'drizzle-orm'
import type Stripe from 'stripe'
import { getStripe } from './stripe'
import { superadminDb } from '@startkit/database'
import { subscriptions, organizations, auditLogs } from '@startkit/database/schema'
import type { WebhookEvent } from './types'
import type { SubscriptionStatus, PlanTier } from '@startkit/config'

/**
 * Idempotency tracking for webhooks
 * In production, use Redis or database for distributed idempotency
 */
const processedEvents = new Set<string>()

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
 */
function mapPriceIdToPlan(priceId: string | null | undefined, metadata?: Record<string, string>): PlanTier {
  // 1. Check metadata (Zenthea uses this)
  if (metadata?.tier) {
    if (['free', 'starter', 'pro', 'enterprise'].includes(metadata.tier)) {
      return metadata.tier as PlanTier;
    }
  }

  // 2. Check env variables (StartKit template uses this)
  if (priceId) {
    if (priceId === process.env.STRIPE_PRICE_ID_FREE) return 'free';
    if (priceId === process.env.STRIPE_PRICE_ID_STARTER) return 'starter';
    if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro';
    if (priceId === process.env.STRIPE_PRICE_ID_ENTERPRISE) return 'enterprise';

    // 3. Fallback to substring matching
    const id = priceId.toLowerCase();
    if (id.includes('free')) return 'free';
    if (id.includes('starter')) return 'starter';
    if (id.includes('pro')) return 'pro';
    if (id.includes('enterprise')) return 'enterprise';
  }

  return 'free';
}

/**
 * Verify Stripe webhook signature
 *
 * @ai-no-modify Signature verification is critical for security.
 * Never skip this step.
 */
export function verifyStripeSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripe = getStripe()

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${(err as Error).message}`)
  }
}

/**
 * Handle Stripe webhook events
 *
 * @example
 * // In your API route
 * const result = await handleStripeWebhook(event)
 * if (!result.processed) {
 *   console.error('Webhook error:', result.error)
 * }
 *
 * @ai-no-modify Webhook handlers are critical for billing integrity.
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<WebhookEvent> {
  // Idempotency check
  if (processedEvents.has(event.id)) {
    return {
      type: event.type,
      stripeEvent: event,
      processed: true,
    }
  }

  const result: WebhookEvent = {
    type: event.type,
    stripeEvent: event,
    processed: false,
  }

  try {
    switch (event.type) {
      // Checkout completed - new subscription
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      // Subscription lifecycle events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      // Payment events
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      // Customer events
      case 'customer.deleted':
        await handleCustomerDeleted(event.data.object as Stripe.Customer)
        break

      default:
        // Log unhandled events but don't fail
        console.log(`Unhandled Stripe event: ${event.type}`)
    }

    // Mark as processed
    processedEvents.add(event.id)
    // Clean up old events periodically (simplified - use Redis in production)
    if (processedEvents.size > 10000) {
      const eventsArray = Array.from(processedEvents)
      processedEvents.clear()
      // Keep last 1000 events
      eventsArray.slice(-1000).forEach((id) => processedEvents.add(id))
    }

    result.processed = true
  } catch (error) {
    result.error = (error as Error).message
    console.error(`Error processing webhook ${event.type}:`, error)
  }

  return result
}

/**
 * Handle checkout.session.completed
 * Creates or updates subscription in database
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const organizationId = session.metadata?.organizationId
  if (!organizationId) {
    throw new Error('Missing organizationId in checkout session metadata')
  }

  if (!session.subscription || typeof session.subscription !== 'string') {
    throw new Error('Missing subscription ID in checkout session')
  }

  if (!session.customer || typeof session.customer !== 'string') {
    throw new Error('Missing customer ID in checkout session')
  }

  const stripe = getStripe()
  const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription)
  const priceId = stripeSubscription.items.data[0]?.price.id
  const metadata = (stripeSubscription.items.data[0]?.price.metadata || {}) as Record<string, string>

  // Check if subscription already exists
  const [existing] = await superadminDb
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1)

  const subscriptionData = {
    organizationId,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    stripePriceId: priceId ?? null,
    status: mapStripeStatus(stripeSubscription.status),
    plan: mapPriceIdToPlan(priceId, metadata),
    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
      ? new Date(stripeSubscription.cancel_at_period_end * 1000)
      : null,
    seatCount: stripeSubscription.items.data[0]?.quantity ?? 1,
    updatedAt: new Date(),
  }

  if (existing) {
    // Update existing subscription
    await superadminDb
      .update(subscriptions)
      .set(subscriptionData)
      .where(eq(subscriptions.id, existing.id))
  } else {
    // Create new subscription
    await superadminDb.insert(subscriptions).values(subscriptionData)
  }

  // Log to audit log
  await superadminDb.insert(auditLogs).values({
    organizationId,
    userId: null, // System action
    action: 'subscription.created',
    resourceType: 'subscription',
    resourceId: session.subscription,
    metadata: {
      stripeCustomerId: session.customer,
      priceId,
    },
  })
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const organizationId = subscription.metadata?.organizationId
  if (!organizationId) {
    // Try to find by customer ID
    const [sub] = await superadminDb
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, subscription.customer as string))
      .limit(1)

    if (!sub) {
      console.warn(`Cannot find subscription for Stripe subscription ${subscription.id}`)
      return
    }
    // Use the organization ID from database
    const orgId = sub.organizationId
    await updateSubscriptionFromStripe(orgId, subscription)
    return
  }

  await updateSubscriptionFromStripe(organizationId, subscription)
}

/**
 * Helper to update subscription from Stripe data
 */
async function updateSubscriptionFromStripe(
  organizationId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id
  const metadata = (subscription.items.data[0]?.price.metadata || {}) as Record<string, string>

  await superadminDb
    .update(subscriptions)
    .set({
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId ?? null,
      status: mapStripeStatus(subscription.status),
      plan: mapPriceIdToPlan(priceId, metadata),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
        ? new Date(subscription.cancel_at_period_end * 1000)
        : null,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      seatCount: subscription.items.data[0]?.quantity ?? 1,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId))

  // Log to audit log
  await superadminDb.insert(auditLogs).values({
    organizationId,
    userId: null,
    action: 'subscription.updated',
    resourceType: 'subscription',
    resourceId: subscription.id,
    metadata: {
      status: subscription.status,
      priceId,
    },
  })
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const organizationId = subscription.metadata?.organizationId
  if (!organizationId) {
    // Find by customer ID
    const [sub] = await superadminDb
      .select({ organizationId: subscriptions.organizationId })
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, subscription.customer as string))
      .limit(1)

    if (!sub) {
      console.warn(`Cannot find subscription for deleted Stripe subscription ${subscription.id}`)
      return
    }

    await superadminDb
      .update(subscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.organizationId, sub.organizationId))

    // Log to audit log
    await superadminDb.insert(auditLogs).values({
      organizationId: sub.organizationId,
      userId: null,
      action: 'subscription.deleted',
      resourceType: 'subscription',
      resourceId: subscription.id,
    })
    return
  }

  await superadminDb
    .update(subscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId))

  // Log to audit log
  await superadminDb.insert(auditLogs).values({
    organizationId,
    userId: null,
    action: 'subscription.deleted',
    resourceType: 'subscription',
    resourceId: subscription.id,
  })
}

/**
 * Handle successful payment
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.subscription || typeof invoice.subscription !== 'string') {
    return // Not a subscription invoice
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
  const organizationId = subscription.metadata?.organizationId

  if (!organizationId) {
    // Find by customer ID
    const [sub] = await superadminDb
      .select({ organizationId: subscriptions.organizationId })
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, invoice.customer as string))
      .limit(1)

    if (!sub) return

    // Update subscription status if it was past_due
    await superadminDb
      .update(subscriptions)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.organizationId, sub.organizationId))

    // Log to audit log
    await superadminDb.insert(auditLogs).values({
      organizationId: sub.organizationId,
      userId: null,
      action: 'invoice.paid',
      resourceType: 'invoice',
      resourceId: invoice.id,
      metadata: {
        amount: invoice.amount_paid,
        currency: invoice.currency,
      },
    })
    return
  }

  // Update subscription status if it was past_due
  await superadminDb
    .update(subscriptions)
    .set({
      status: 'active',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId))

  // Log to audit log
  await superadminDb.insert(auditLogs).values({
    organizationId,
    userId: null,
    action: 'invoice.paid',
    resourceType: 'invoice',
    resourceId: invoice.id,
    metadata: {
      amount: invoice.amount_paid,
      currency: invoice.currency,
    },
  })
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.subscription || typeof invoice.subscription !== 'string') {
    return // Not a subscription invoice
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
  const organizationId = subscription.metadata?.organizationId

  if (!organizationId) {
    // Find by customer ID
    const [sub] = await superadminDb
      .select({ organizationId: subscriptions.organizationId })
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, invoice.customer as string))
      .limit(1)

    if (!sub) return

    // Update subscription status to past_due
    await superadminDb
      .update(subscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.organizationId, sub.organizationId))

    // Log to audit log
    await superadminDb.insert(auditLogs).values({
      organizationId: sub.organizationId,
      userId: null,
      action: 'invoice.payment_failed',
      resourceType: 'invoice',
      resourceId: invoice.id,
      metadata: {
        amount: invoice.amount_due,
        currency: invoice.currency,
        attemptCount: invoice.attempt_count,
      },
    })
    return
  }

  // Update subscription status to past_due
  await superadminDb
    .update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId))

  // Log to audit log
  await superadminDb.insert(auditLogs).values({
    organizationId,
    userId: null,
    action: 'invoice.payment_failed',
    resourceType: 'invoice',
    resourceId: invoice.id,
    metadata: {
      amount: invoice.amount_due,
      currency: invoice.currency,
      attemptCount: invoice.attempt_count,
    },
  })
}

/**
 * Handle customer deletion
 */
async function handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
  // Find subscription by customer ID
  const [sub] = await superadminDb
    .select({ organizationId: subscriptions.organizationId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customer.id))
    .limit(1)

  if (!sub) {
    console.warn(`Cannot find subscription for deleted customer ${customer.id}`)
    return
  }

  // Mark subscription as canceled
  await superadminDb
    .update(subscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
      stripeCustomerId: customer.id, // Keep reference for audit
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, sub.organizationId))

  // Log to audit log
  await superadminDb.insert(auditLogs).values({
    organizationId: sub.organizationId,
    userId: null,
    action: 'customer.deleted',
    resourceType: 'customer',
    resourceId: customer.id,
  })
}

import { getStripe } from './stripe'
import type { CheckoutConfig, SubscriptionData } from './types'

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
 * Get subscription data from Stripe
 */
export async function getSubscription(subscriptionId: string) {
  const stripe = getStripe()

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method', 'latest_invoice'],
  })

  return subscription
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const stripe = getStripe()

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(subscriptionId: string): Promise<void> {
  const stripe = getStripe()

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}

/**
 * Update subscription quantity (for seat-based billing)
 */
export async function updateSubscriptionQuantity(
  subscriptionId: string,
  quantity: number
): Promise<void> {
  const stripe = getStripe()

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const itemId = subscription.items.data[0]?.id

  if (!itemId) {
    throw new Error('No subscription item found')
  }

  await stripe.subscriptionItems.update(itemId, { quantity })
}

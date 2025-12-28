/**
 * @startkit/billing
 *
 * Stripe billing integration for subscriptions and usage-based billing.
 *
 * @ai-context This package provides:
 * - Stripe client initialization
 * - Subscription management
 * - Usage tracking and reporting
 * - Webhook handlers
 *
 * CRITICAL: Stripe is the source of truth for billing state.
 * Always sync from Stripe, not the other way around.
 *
 * @ai-no-modify Webhook handlers are critical for billing integrity.
 */

// Stripe client
export { stripe, getStripe } from './stripe'

// Subscription management
export {
  createCheckoutSession,
  createBillingPortalSession,
  getSubscription,
  cancelSubscription,
  resumeSubscription,
  changeSubscription,
  updateSubscriptionQuantity,
} from './subscriptions'

// Usage tracking
export { trackUsage, getUsageSummary, reportUsageToStripe } from './usage'

// Webhook handling
export { handleStripeWebhook, verifyStripeSignature } from './webhooks'

// Pricing configuration
export { defaultPlans, getPlanConfig, getAvailablePlans, planToPriceConfig } from './pricing'

// Types
export type { CheckoutConfig, UsageEvent, WebhookEvent, PriceConfig } from './types'

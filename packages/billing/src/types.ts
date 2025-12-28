import type { PlanTier, SubscriptionStatus, UsageMetric } from '@startkit/config'
import type Stripe from 'stripe'

/**
 * Configuration for creating a checkout session
 */
export interface CheckoutConfig {
  /** Organization ID for the subscription */
  organizationId: string
  /** Price ID to subscribe to */
  priceId: string
  /** Number of seats (for per-seat pricing) */
  quantity?: number
  /** URL to redirect after successful checkout */
  successUrl: string
  /** URL to redirect if checkout is canceled */
  cancelUrl: string
  /** Trial period in days */
  trialDays?: number
  /** Promotion code to apply */
  promotionCode?: string
  /** Metadata to attach to the subscription */
  metadata?: Record<string, string>
}

/**
 * Usage event for tracking
 */
export interface UsageEvent {
  organizationId: string
  userId: string
  metric: UsageMetric
  value: number
  timestamp: Date
  metadata?: Record<string, unknown>
  /** Idempotency key to prevent duplicates */
  idempotencyKey?: string
}

/**
 * Usage summary for a period
 */
export interface UsageSummary {
  organizationId: string
  metric: UsageMetric
  totalValue: number
  periodStart: Date
  periodEnd: Date
  limit?: number
  percentUsed?: number
}

/**
 * Webhook event after processing
 */
export interface WebhookEvent {
  type: string
  stripeEvent: Stripe.Event
  processed: boolean
  error?: string
}

/**
 * Subscription data from our database
 */
export interface SubscriptionData {
  id: string
  organizationId: string
  stripeCustomerId: string
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  status: SubscriptionStatus
  plan: PlanTier
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  seatCount: number
  maxSeats: number | null
}

/**
 * Price configuration for products
 */
export interface PriceConfig {
  id: string
  productId: string
  name: string
  plan: PlanTier
  /** Monthly price in cents */
  monthlyPrice: number
  /** Yearly price in cents (typically discounted) */
  yearlyPrice: number
  /** Features included in this plan */
  features: string[]
  /** Usage limits */
  limits: {
    seats?: number
    apiCalls?: number
    storage?: number
  }
}

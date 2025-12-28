/**
 * @startkit/analytics - Event Types
 *
 * Type definitions for analytics events and tracking
 */

/**
 * Core event properties that all events should include
 */
export interface BaseEventProperties {
  /** Organization ID (if applicable) */
  organizationId?: string
  /** User ID */
  userId?: string
  /** Feature flag that enabled this event (if applicable) */
  featureFlag?: string
  /** Additional metadata */
  [key: string]: unknown
}

/**
 * Auth-related events
 */
export interface AuthEventProperties extends BaseEventProperties {
  /** Auth method used (e.g., 'email', 'oauth_google') */
  method?: string
  /** Whether this is a new user */
  isNewUser?: boolean
}

/**
 * Billing-related events
 */
export interface BillingEventProperties extends BaseEventProperties {
  /** Plan name (e.g., 'pro', 'enterprise') */
  plan?: string
  /** Plan price in cents */
  price?: number
  /** Currency code (e.g., 'usd') */
  currency?: string
  /** Subscription ID */
  subscriptionId?: string
  /** Previous plan (for upgrades/downgrades) */
  previousPlan?: string
}

/**
 * Feature usage events
 */
export interface FeatureEventProperties extends BaseEventProperties {
  /** Feature name */
  feature: string
  /** Action performed */
  action: string
  /** Additional feature-specific data */
  metadata?: Record<string, unknown>
}

/**
 * Event names for type safety
 */
export type AuthEventName =
  | 'user_signed_in'
  | 'user_signed_out'
  | 'user_signed_up'
  | 'user_verified_email'

export type BillingEventName =
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_canceled'
  | 'subscription_resumed'
  | 'checkout_started'
  | 'checkout_completed'
  | 'invoice_paid'
  | 'invoice_payment_failed'

export type FeatureEventName =
  | 'feature_used'
  | 'feature_accessed'
  | 'feature_limited'

export type AnalyticsEventName = AuthEventName | BillingEventName | FeatureEventName

/**
 * Event payload structure
 */
export interface AnalyticsEvent {
  /** Event name */
  name: AnalyticsEventName | string
  /** Event properties */
  properties?: BaseEventProperties | AuthEventProperties | BillingEventProperties | FeatureEventProperties
  /** Timestamp (auto-set if not provided) */
  timestamp?: Date
}

/**
 * User identification properties
 */
export interface IdentifyProperties {
  /** User email */
  email?: string
  /** User name */
  name?: string
  /** User avatar URL */
  avatarUrl?: string
  /** Whether user is superadmin */
  isSuperadmin?: boolean
  /** Additional user properties */
  [key: string]: unknown
}

/**
 * Organization identification properties
 */
export interface OrganizationProperties {
  /** Organization name */
  name?: string
  /** Organization slug */
  slug?: string
  /** Plan name */
  plan?: string
  /** Number of members */
  memberCount?: number
  /** Additional org properties */
  [key: string]: unknown
}

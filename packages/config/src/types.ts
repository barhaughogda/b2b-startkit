/**
 * Shared types used across all StartKit packages
 *
 * @ai-context These types define the core domain model.
 * Changes here affect all packages and products.
 */

// ============================================
// User & Organization Types
// ============================================

export type UserId = string
export type OrganizationId = string
export type ClerkUserId = string
export type ClerkOrgId = string

/**
 * Organization membership roles
 * These map to permission bundles in the RBAC system
 */
export type OrganizationRole = 'owner' | 'admin' | 'member'

/**
 * Global superadmin flag - separate from org roles
 */
export type GlobalRole = 'superadmin' | 'user'

/**
 * Subscription plan tiers
 * Products can define custom plans, but these are the base tiers
 */
export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise'

/**
 * Subscription status aligned with Stripe
 */
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'

// ============================================
// Permission Types
// ============================================

/**
 * Permission format: "action:resource"
 * Examples: "create:project", "delete:member", "read:billing"
 */
export type Permission = `${string}:${string}`

/**
 * Feature flag identifier
 * Format: "feature_name" in snake_case
 */
export type FeatureFlagKey = string

/**
 * Feature flag value - can be boolean or string for A/B tests
 */
export type FeatureFlagValue = boolean | string

// ============================================
// Billing Types
// ============================================

/**
 * Pricing model for a product
 */
export type PricingModel = 'per_seat' | 'usage_based' | 'flat_rate' | 'hybrid'

/**
 * Usage metric types for metered billing
 */
export type UsageMetric = 'api_calls' | 'tokens' | 'compute_seconds' | 'storage_gb' | 'active_users'

/**
 * Usage event for tracking and billing
 */
export interface UsageEvent {
  organizationId: OrganizationId
  userId: UserId
  metric: UsageMetric
  value: number
  metadata?: Record<string, unknown>
  timestamp: Date
}

// ============================================
// API Response Types
// ============================================

/**
 * Standard API success response
 */
export interface ApiResponse<T> {
  success: true
  data: T
}

/**
 * Standard API error response
 */
export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ============================================
// Context Types
// ============================================

/**
 * Request context passed through middleware
 * Contains authenticated user and organization info
 */
export interface RequestContext {
  userId: UserId
  clerkUserId: ClerkUserId
  organizationId: OrganizationId | null
  clerkOrgId: ClerkOrgId | null
  role: OrganizationRole | null
  isSuperadmin: boolean
  permissions: Permission[]
}

/**
 * Tenant context for database queries
 * Used by withTenant() wrapper
 */
export interface TenantContext {
  organizationId: OrganizationId
  userId: UserId
}

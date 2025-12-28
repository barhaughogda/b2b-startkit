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
 * Hierarchy: owner > admin > member > viewer
 */
export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer'

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

// ============================================
// Product Configuration Types
// ============================================

/**
 * Feature category for organizing features
 */
export type FeatureCategory = 'core' | 'premium' | 'beta' | 'enterprise'

/**
 * Feature definition within a product
 * Describes a capability that can be enabled/disabled per plan
 */
export interface FeatureDefinition {
  /**
   * Unique feature key (snake_case)
   * Example: "ai_assistant", "bulk_export"
   */
  key: string

  /**
   * Human-readable feature name
   */
  name: string

  /**
   * Optional description
   */
  description?: string

  /**
   * Feature category for grouping
   */
  category: FeatureCategory
}

/**
 * Plan-specific configuration within a product
 * Defines what features and limits apply to each plan tier
 */
export interface ProductPlanConfig {
  /**
   * Feature keys enabled for this plan
   * Must reference keys defined in product.features
   */
  features: string[]

  /**
   * Limits for this plan
   * undefined = unlimited
   */
  limits: {
    seats?: number
    apiCallsPerMonth?: number
    storageGb?: number
    [key: string]: number | undefined
  }

  /**
   * Additional feature flags to enable for this plan
   * These are in addition to the standard feature keys
   */
  customFlags?: string[]
}

/**
 * Kill switch defaults for a product
 */
export interface KillSwitchDefaults {
  /**
   * Whether the product is enabled
   * Set to false to disable the entire product
   */
  productEnabled: boolean

  /**
   * Whether the product is in maintenance mode
   * Users see a maintenance page but data is preserved
   */
  maintenanceMode: boolean
}

/**
 * Role override for product-specific permission adjustments
 */
export interface RoleOverride {
  /**
   * Additional permissions to grant this role
   */
  additionalPermissions?: Permission[]

  /**
   * Permissions to remove from this role
   */
  removePermissions?: Permission[]
}

/**
 * Product Configuration Contract
 *
 * The canonical source of truth for a product's capabilities.
 * Each product MUST have exactly one product.config.ts file
 * that satisfies this contract.
 *
 * @ai-context This is the single source of truth for:
 * - What features exist in the product
 * - What plans unlock what features
 * - What limits apply per plan
 * - Kill switch defaults
 */
export interface ProductConfigContract {
  /**
   * Product identifier (kebab-case)
   * Used in URLs, database prefixes, and file paths
   * Example: "my-saas-product"
   */
  id: string

  /**
   * Human-readable product name
   * Example: "My SaaS Product"
   */
  name: string

  /**
   * Semantic version of the product
   */
  version: string

  /**
   * Product description
   */
  description?: string

  /**
   * Feature definitions for this product
   * Key is the feature key, value is the definition
   */
  features: Record<string, FeatureDefinition>

  /**
   * Plan configurations
   * Defines what each plan tier unlocks
   */
  plans: Record<PlanTier, ProductPlanConfig>

  /**
   * Optional role overrides for product-specific permission adjustments
   */
  roles?: Partial<Record<OrganizationRole, RoleOverride>>

  /**
   * Kill switch defaults
   */
  killSwitches: KillSwitchDefaults

  /**
   * Stripe product configuration (optional, set via setup-stripe)
   */
  stripe?: {
    productId: string
    priceIds: Partial<Record<PlanTier, string>>
  }

  /**
   * Branding configuration
   */
  branding?: {
    primaryColor?: string
    logo?: string
    favicon?: string
  }

  /**
   * Navigation configuration
   */
  navigation?: {
    main: Array<{
      label: string
      href: string
      icon?: string
      requiredFeature?: string
    }>
  }
}

/**
 * @deprecated Use ProductConfigContract instead
 * Legacy product configuration - kept for backward compatibility
 */
export interface ProductConfig {
  id: string
  name: string
  description?: string
  features: string[]
  limits?: {
    maxOrganizations?: number
    maxUsersPerOrg?: number
    [key: string]: number | undefined
  }
  stripe?: {
    productId: string
    priceIds: {
      free?: string
      starter?: string
      pro?: string
      enterprise?: string
      [tier: string]: string | undefined
    }
  }
}

// ============================================
// Plan Configuration Types
// ============================================

/**
 * Plan feature definition
 * Describes what a plan includes
 */
export interface PlanFeature {
  /**
   * Feature name/description
   */
  name: string

  /**
   * Whether this feature is included (true) or not (false)
   * For usage-based features, use limits instead
   */
  included: boolean

  /**
   * Optional limit for this feature
   * Example: { apiCalls: 10000 } means 10k API calls included
   */
  limit?: number | Record<string, number>
}

/**
 * Plan configuration
 * Defines pricing, features, and limits for a subscription plan
 */
export interface PlanConfig {
  /**
   * Plan tier identifier
   */
  tier: PlanTier

  /**
   * Plan name
   * Example: "Pro", "Enterprise"
   */
  name: string

  /**
   * Plan description
   */
  description?: string

  /**
   * Pricing configuration
   */
  pricing: {
    /**
     * Monthly price in cents (USD)
     * Example: 2900 = $29.00/month
     */
    monthly?: number

    /**
     * Yearly price in cents (USD)
     * Example: 29000 = $290.00/year (equivalent to ~$24.17/month)
     */
    yearly?: number

    /**
     * Currency code (ISO 4217)
     * Default: "usd"
     */
    currency?: string

    /**
     * Whether this plan is usage-based
     * If true, base price is $0 and charges are per usage metric
     */
    usageBased?: boolean
  }

  /**
   * Features included in this plan
   */
  features: PlanFeature[]

  /**
   * Plan limits
   * These override product defaults
   */
  limits?: {
    /**
     * Maximum number of seats/users
     * undefined = unlimited
     */
    seats?: number

    /**
     * Maximum storage in GB
     * undefined = unlimited
     */
    storageGb?: number

    /**
     * Maximum API calls per month
     * undefined = unlimited
     */
    apiCallsPerMonth?: number

    /**
     * Custom limits keyed by metric name
     */
    [key: string]: number | undefined
  }

  /**
   * Stripe price ID for this plan
   * Created via setup-stripe script
   */
  stripePriceId?: string

  /**
   * Whether this plan is currently available for purchase
   * Set to false to hide from pricing page
   */
  available?: boolean
}

/**
 * Product Configuration Helper
 *
 * Provides type-safe definition and validation of product configurations.
 *
 * @ai-context This module:
 * - Validates product.config.ts files at build time
 * - Ensures all plan features reference existing feature keys
 * - Exports type-safe config objects
 */

import { z } from 'zod'
import type {
  ProductConfigContract,
  PlanTier,
  FeatureCategory,
  FeatureDefinition,
  ProductPlanConfig,
  KillSwitchDefaults,
  RoleOverride,
  Permission,
  OrganizationRole,
} from './types'

// ============================================
// Zod Schemas
// ============================================

const featureCategorySchema = z.enum(['core', 'premium', 'beta', 'enterprise'])

const featureDefinitionSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/, 'Feature key must be snake_case'),
  name: z.string().min(1),
  description: z.string().optional(),
  category: featureCategorySchema,
})

const productPlanConfigSchema = z.object({
  features: z.array(z.string()),
  limits: z.record(z.string(), z.number().optional()),
  customFlags: z.array(z.string()).optional(),
})

const killSwitchDefaultsSchema = z.object({
  productEnabled: z.boolean(),
  maintenanceMode: z.boolean(),
})

const permissionSchema = z.string().regex(/^[a-z_]+:[a-z_]+$/, 'Permission must be action:resource format')

const roleOverrideSchema = z.object({
  additionalPermissions: z.array(permissionSchema).optional(),
  removePermissions: z.array(permissionSchema).optional(),
})

const navigationItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  icon: z.string().optional(),
  requiredFeature: z.string().optional(),
})

const brandingSchema = z.object({
  primaryColor: z.string().optional(),
  logo: z.string().optional(),
  favicon: z.string().optional(),
})

const stripeConfigSchema = z.object({
  productId: z.string(),
  priceIds: z.record(z.string(), z.string().optional()),
})

const planTiers: PlanTier[] = ['free', 'starter', 'pro', 'enterprise']

const productConfigContractSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'Product ID must be kebab-case'),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must be semver format'),
  description: z.string().optional(),
  features: z.record(z.string(), featureDefinitionSchema),
  plans: z.record(z.enum(['free', 'starter', 'pro', 'enterprise']), productPlanConfigSchema),
  roles: z.record(z.enum(['owner', 'admin', 'member', 'viewer']), roleOverrideSchema).optional(),
  killSwitches: killSwitchDefaultsSchema,
  stripe: stripeConfigSchema.optional(),
  branding: brandingSchema.optional(),
  navigation: z.object({
    main: z.array(navigationItemSchema),
  }).optional(),
})

// ============================================
// Validation Errors
// ============================================

export class ProductConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[]
  ) {
    super(message)
    this.name = 'ProductConfigValidationError'
  }
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate that all plan features reference existing feature keys
 */
function validatePlanFeatures(
  features: Record<string, FeatureDefinition>,
  plans: Record<PlanTier, ProductPlanConfig>
): string[] {
  const errors: string[] = []
  const featureKeys = new Set(Object.keys(features))

  for (const [planTier, planConfig] of Object.entries(plans)) {
    for (const featureKey of planConfig.features) {
      if (!featureKeys.has(featureKey)) {
        errors.push(
          `Plan "${planTier}" references unknown feature "${featureKey}". ` +
          `Available features: ${Array.from(featureKeys).join(', ')}`
        )
      }
    }
  }

  return errors
}

/**
 * Validate that navigation items reference existing features
 */
function validateNavigationFeatures(
  features: Record<string, FeatureDefinition>,
  navigation?: { main: Array<{ requiredFeature?: string }> }
): string[] {
  if (!navigation) return []

  const errors: string[] = []
  const featureKeys = new Set(Object.keys(features))

  for (const item of navigation.main) {
    if (item.requiredFeature && !featureKeys.has(item.requiredFeature)) {
      errors.push(
        `Navigation item references unknown feature "${item.requiredFeature}". ` +
        `Available features: ${Array.from(featureKeys).join(', ')}`
      )
    }
  }

  return errors
}

/**
 * Validate feature key consistency
 */
function validateFeatureKeyConsistency(
  features: Record<string, FeatureDefinition>
): string[] {
  const errors: string[] = []

  for (const [key, definition] of Object.entries(features)) {
    if (key !== definition.key) {
      errors.push(
        `Feature key mismatch: object key "${key}" does not match definition.key "${definition.key}"`
      )
    }
  }

  return errors
}

// ============================================
// Main API
// ============================================

/**
 * Define and validate a product configuration
 *
 * @param config - The product configuration object
 * @returns Validated and frozen configuration
 * @throws ProductConfigValidationError if validation fails
 *
 * @example
 * ```typescript
 * export const productConfig = defineProductConfig({
 *   id: 'my-product',
 *   name: 'My Product',
 *   version: '1.0.0',
 *   features: {
 *     dashboard: { key: 'dashboard', name: 'Dashboard', category: 'core' },
 *     ai_assistant: { key: 'ai_assistant', name: 'AI Assistant', category: 'premium' },
 *   },
 *   plans: {
 *     free: { features: ['dashboard'], limits: { seats: 3 } },
 *     starter: { features: ['dashboard'], limits: { seats: 10 } },
 *     pro: { features: ['dashboard', 'ai_assistant'], limits: { seats: 50 } },
 *     enterprise: { features: ['dashboard', 'ai_assistant'], limits: {} },
 *   },
 *   killSwitches: { productEnabled: true, maintenanceMode: false },
 * })
 * ```
 */
export function defineProductConfig(config: ProductConfigContract): Readonly<ProductConfigContract> {
  const errors: string[] = []

  // Schema validation
  const result = productConfigContractSchema.safeParse(config)
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${issue.path.join('.')}: ${issue.message}`)
    }
  }

  // Semantic validation
  errors.push(...validateFeatureKeyConsistency(config.features))
  errors.push(...validatePlanFeatures(config.features, config.plans))
  errors.push(...validateNavigationFeatures(config.features, config.navigation))

  if (errors.length > 0) {
    throw new ProductConfigValidationError(
      `Invalid product configuration for "${config.id}":\n${errors.map(e => `  - ${e}`).join('\n')}`,
      errors
    )
  }

  // Freeze to prevent runtime mutations
  return Object.freeze(config)
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a feature is available on a given plan
 */
export function isFeatureAvailable(
  config: ProductConfigContract,
  featureKey: string,
  planTier: PlanTier
): boolean {
  const plan = config.plans[planTier]
  if (!plan) return false
  return plan.features.includes(featureKey)
}

/**
 * Get all features available for a plan (including inherited from lower tiers)
 */
export function getPlanFeatures(
  config: ProductConfigContract,
  planTier: PlanTier
): string[] {
  const plan = config.plans[planTier]
  if (!plan) return []
  return [...plan.features]
}

/**
 * Get the limit value for a specific metric on a plan
 * Returns undefined if unlimited
 */
export function getPlanLimit(
  config: ProductConfigContract,
  planTier: PlanTier,
  limitKey: string
): number | undefined {
  const plan = config.plans[planTier]
  if (!plan) return undefined
  return plan.limits[limitKey]
}

/**
 * Get all feature definitions for a product
 */
export function getFeatureDefinitions(
  config: ProductConfigContract
): FeatureDefinition[] {
  return Object.values(config.features)
}

/**
 * Get feature definitions by category
 */
export function getFeaturesByCategory(
  config: ProductConfigContract,
  category: FeatureCategory
): FeatureDefinition[] {
  return Object.values(config.features).filter(f => f.category === category)
}

/**
 * Check if product is in maintenance mode or disabled
 */
export function isProductAccessible(config: ProductConfigContract): {
  accessible: boolean
  reason?: string
} {
  if (!config.killSwitches.productEnabled) {
    return { accessible: false, reason: 'Product is disabled' }
  }
  if (config.killSwitches.maintenanceMode) {
    return { accessible: false, reason: 'Product is in maintenance mode' }
  }
  return { accessible: true }
}

// ============================================
// Type Exports
// ============================================

export type {
  ProductConfigContract,
  FeatureDefinition,
  ProductPlanConfig,
  KillSwitchDefaults,
  RoleOverride,
  FeatureCategory,
}

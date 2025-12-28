import type { FeatureFlagKey, PlanTier } from '@startkit/config'
import type { FeatureFlagContext, PermissionContext } from './types'

/**
 * Plan hierarchy for feature access
 * Higher index = more features available
 */
const PLAN_HIERARCHY: PlanTier[] = ['free', 'starter', 'pro', 'enterprise']

/**
 * Check if a feature flag is enabled for the current context
 *
 * @example
 * if (!hasFeature(ctx, 'ai_assistant')) {
 *   return <UpgradePrompt feature="AI Assistant" />
 * }
 */
export function hasFeature(ctx: PermissionContext, flagKey: FeatureFlagKey): boolean {
  // Superadmins see all features
  if (ctx.isSuperadmin) {
    return true
  }

  // Check feature flags map
  const flagValue = ctx.featureFlags.get(flagKey)
  if (flagValue !== undefined) {
    return flagValue
  }

  // Default to false if flag not found
  return false
}

/**
 * Get all enabled feature flags for a context
 */
export function getFeatureFlags(ctx: PermissionContext): FeatureFlagKey[] {
  if (ctx.isSuperadmin) {
    return Array.from(ctx.featureFlags.keys())
  }

  const enabled: FeatureFlagKey[] = []
  for (const [key, value] of ctx.featureFlags) {
    if (value) {
      enabled.push(key)
    }
  }
  return enabled
}

/**
 * Evaluate a feature flag with conditions
 *
 * @ai-context Feature flags can have complex conditions:
 * - Plan-based: Only available on certain plans
 * - Percentage rollout: Enabled for X% of orgs
 * - User-specific: Enabled for specific users
 * - Time-based: Auto-enable/disable at certain times
 */
export function evaluateFeatureFlag(
  ctx: FeatureFlagContext,
  flag: {
    key: FeatureFlagKey
    enabled: boolean
    minimumPlan?: PlanTier
    conditions?: {
      percentage?: number
      userIds?: string[]
      enableAfter?: Date
      disableAfter?: Date
    }
  }
): boolean {
  // Base check
  if (!flag.enabled) {
    return false
  }

  // Plan check
  if (flag.minimumPlan) {
    const planIndex = PLAN_HIERARCHY.indexOf(ctx.plan)
    const requiredIndex = PLAN_HIERARCHY.indexOf(flag.minimumPlan)
    if (planIndex < requiredIndex) {
      return false
    }
  }

  // Conditions check
  if (flag.conditions) {
    // Time-based
    const now = new Date()
    if (flag.conditions.enableAfter && now < flag.conditions.enableAfter) {
      return false
    }
    if (flag.conditions.disableAfter && now > flag.conditions.disableAfter) {
      return false
    }

    // User-specific override
    if (flag.conditions.userIds?.includes(ctx.userId)) {
      return true
    }

    // Percentage rollout (deterministic based on org ID)
    if (flag.conditions.percentage !== undefined) {
      const hash = simpleHash(ctx.organizationId + flag.key)
      const bucket = hash % 100
      if (bucket >= flag.conditions.percentage) {
        return false
      }
    }
  }

  return true
}

/**
 * Simple hash function for deterministic percentage rollouts
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Check if plan meets minimum requirement
 */
export function planMeetsMinimum(current: PlanTier, minimum: PlanTier): boolean {
  return PLAN_HIERARCHY.indexOf(current) >= PLAN_HIERARCHY.indexOf(minimum)
}

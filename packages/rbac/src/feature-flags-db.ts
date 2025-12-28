import { eq, and } from 'drizzle-orm'
import { db, superadminDb } from '@startkit/database'
import {
  featureFlagDefinitions,
  organizationFeatureFlags,
  type FeatureFlagDefinition,
  type OrganizationFeatureFlag,
} from '@startkit/database/schema'
import type { FeatureFlagKey, PlanTier } from '@startkit/config'
import { getPlanDefaultFlags } from './flags'

/**
 * Load feature flags for an organization from the database
 * Combines explicit overrides with plan-based defaults
 *
 * @param organizationId - Organization ID
 * @param plan - Organization's plan tier
 * @returns Map of feature flag keys to enabled/disabled values
 */
export async function loadOrganizationFeatureFlags(
  organizationId: string,
  plan: PlanTier
): Promise<Map<FeatureFlagKey, boolean>> {
  const flags = new Map<FeatureFlagKey, boolean>()

  // Load plan-based defaults first
  const planDefaults = getPlanDefaultFlags(plan)
  for (const flagKey of planDefaults) {
    flags.set(flagKey, true)
  }

  // Load all feature flag definitions to get defaults
  // Use superadminDb to ensure we can read definitions
  const definitions = await superadminDb.query.featureFlagDefinitions.findMany()

  // Set defaults from definitions (only if not already set by plan)
  for (const def of definitions) {
    if (!flags.has(def.key)) {
      flags.set(def.key, def.defaultEnabled)
    }
  }

  // Load organization-specific overrides
  // Use regular db to respect RLS (users can only see their org's flags)
  const overrides = await db.query.organizationFeatureFlags.findMany({
    where: eq(organizationFeatureFlags.organizationId, organizationId),
  })

  // Apply overrides (these take precedence)
  for (const override of overrides) {
    flags.set(override.flagKey, override.enabled)
  }

  return flags
}

/**
 * Get all feature flag definitions
 * Uses superadminDb to ensure access to all definitions
 */
export async function getAllFeatureFlagDefinitions(): Promise<FeatureFlagDefinition[]> {
  return superadminDb.query.featureFlagDefinitions.findMany({
    orderBy: (defs, { asc }) => [asc(defs.key)],
  })
}

/**
 * Get a specific feature flag definition
 * Uses superadminDb to ensure access
 */
export async function getFeatureFlagDefinition(key: FeatureFlagKey): Promise<FeatureFlagDefinition | null> {
  return (
    (await superadminDb.query.featureFlagDefinitions.findFirst({
      where: eq(featureFlagDefinitions.key, key),
    })) || null
  )
}

/**
 * Create or update an organization feature flag override
 * Uses superadminDb for admin operations (should be called from admin API with proper auth)
 */
export async function setOrganizationFeatureFlag(
  organizationId: string,
  flagKey: FeatureFlagKey,
  enabled: boolean,
  setBy: string,
  reason?: string
): Promise<OrganizationFeatureFlag> {
  const existing = await superadminDb.query.organizationFeatureFlags.findFirst({
    where: and(
      eq(organizationFeatureFlags.organizationId, organizationId),
      eq(organizationFeatureFlags.flagKey, flagKey)
    ),
  })

  if (existing) {
    const [updated] = await superadminDb
      .update(organizationFeatureFlags)
      .set({
        enabled,
        setBy,
        reason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(organizationFeatureFlags.id, existing.id))
      .returning()

    return updated
  } else {
    const [created] = await superadminDb
      .insert(organizationFeatureFlags)
      .values({
        organizationId,
        flagKey,
        enabled,
        setBy,
        reason: reason || null,
      })
      .returning()

    return created
  }
}

/**
 * Remove an organization feature flag override (revert to default)
 * Uses superadminDb for admin operations
 */
export async function removeOrganizationFeatureFlag(
  organizationId: string,
  flagKey: FeatureFlagKey
): Promise<void> {
  await superadminDb
    .delete(organizationFeatureFlags)
    .where(
      and(
        eq(organizationFeatureFlags.organizationId, organizationId),
        eq(organizationFeatureFlags.flagKey, flagKey)
      )
    )
}

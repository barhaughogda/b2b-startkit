import { superadminDb } from '@startkit/database'
import {
  featureFlagDefinitions,
  organizationFeatureFlags,
  organizations,
} from '@startkit/database/schema'
import { eq, desc, count, sql } from 'drizzle-orm'

/**
 * Feature flag item
 */
export interface FeatureFlagItem {
  id: string
  key: string
  organizationId: string | null
  organizationName: string | null
  isEnabled: boolean
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Feature flag summary
 */
export interface FeatureFlagSummary {
  key: string
  enabledCount: number
  totalOrgs: number
}

/**
 * Feature flag definition
 */
export interface FeatureFlagDefinitionItem {
  id: string
  key: string
  name: string
  description: string | null
  defaultEnabled: boolean
  minimumPlan: string | null
  category: string | null
}

/**
 * Get all feature flag definitions
 */
export async function getFeatureFlagDefinitions(): Promise<FeatureFlagDefinitionItem[]> {
  const defs = await superadminDb
    .select({
      id: featureFlagDefinitions.id,
      key: featureFlagDefinitions.key,
      name: featureFlagDefinitions.name,
      description: featureFlagDefinitions.description,
      defaultEnabled: featureFlagDefinitions.defaultEnabled,
      minimumPlan: featureFlagDefinitions.minimumPlan,
      category: featureFlagDefinitions.category,
    })
    .from(featureFlagDefinitions)
    .orderBy(featureFlagDefinitions.key)

  return defs
}

/**
 * Get all organization feature flags with organization names
 */
export async function getFeatureFlags(): Promise<FeatureFlagItem[]> {
  const flags = await superadminDb
    .select({
      id: organizationFeatureFlags.id,
      key: organizationFeatureFlags.flagKey,
      organizationId: organizationFeatureFlags.organizationId,
      isEnabled: organizationFeatureFlags.enabled,
      conditions: organizationFeatureFlags.conditions,
      createdAt: organizationFeatureFlags.createdAt,
      updatedAt: organizationFeatureFlags.updatedAt,
    })
    .from(organizationFeatureFlags)
    .orderBy(organizationFeatureFlags.flagKey, desc(organizationFeatureFlags.createdAt))

  // Get organization names
  const orgIds = [...new Set(flags.map((f) => f.organizationId))]

  const orgsMap = new Map<string, string>()
  if (orgIds.length > 0) {
    const orgs = await superadminDb
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(sql`${organizations.id} = ANY(${orgIds})`)
    orgs.forEach((o) => orgsMap.set(o.id, o.name))
  }

  return flags.map((flag) => ({
    id: flag.id,
    key: flag.key,
    organizationId: flag.organizationId,
    organizationName: orgsMap.get(flag.organizationId) || null,
    isEnabled: flag.isEnabled,
    metadata: flag.conditions as Record<string, unknown> | null,
    createdAt: flag.createdAt,
    updatedAt: flag.updatedAt,
  }))
}

/**
 * Get feature flag summaries (aggregated by key)
 */
export async function getFeatureFlagSummaries(): Promise<FeatureFlagSummary[]> {
  const summaries = await superadminDb
    .select({
      key: organizationFeatureFlags.flagKey,
      enabledCount: sql<number>`COUNT(*) FILTER (WHERE ${organizationFeatureFlags.enabled} = true)`,
      totalCount: count(),
    })
    .from(organizationFeatureFlags)
    .groupBy(organizationFeatureFlags.flagKey)
    .orderBy(organizationFeatureFlags.flagKey)

  // Get total organizations count
  const [orgCount] = await superadminDb.select({ count: count() }).from(organizations)
  const totalOrgs = orgCount?.count ?? 0

  return summaries.map((s) => ({
    key: s.key,
    enabledCount: s.enabledCount,
    totalOrgs,
  }))
}

/**
 * Get flags for a specific organization
 */
export async function getOrganizationFlags(organizationId: string): Promise<FeatureFlagItem[]> {
  const flags = await superadminDb
    .select({
      id: organizationFeatureFlags.id,
      key: organizationFeatureFlags.flagKey,
      organizationId: organizationFeatureFlags.organizationId,
      isEnabled: organizationFeatureFlags.enabled,
      conditions: organizationFeatureFlags.conditions,
      createdAt: organizationFeatureFlags.createdAt,
      updatedAt: organizationFeatureFlags.updatedAt,
    })
    .from(organizationFeatureFlags)
    .where(eq(organizationFeatureFlags.organizationId, organizationId))
    .orderBy(organizationFeatureFlags.flagKey)

  return flags.map((flag) => ({
    id: flag.id,
    key: flag.key,
    organizationId: flag.organizationId,
    organizationName: null,
    isEnabled: flag.isEnabled,
    metadata: flag.conditions as Record<string, unknown> | null,
    createdAt: flag.createdAt,
    updatedAt: flag.updatedAt,
  }))
}

/**
 * Toggle a feature flag for an organization
 */
export async function toggleFeatureFlag(
  organizationId: string,
  flagKey: string,
  enabled: boolean
): Promise<void> {
  // Check if flag exists
  const [existing] = await superadminDb
    .select()
    .from(organizationFeatureFlags)
    .where(
      sql`${organizationFeatureFlags.organizationId} = ${organizationId} AND ${organizationFeatureFlags.flagKey} = ${flagKey}`
    )
    .limit(1)

  if (existing) {
    // Update existing flag
    await superadminDb
      .update(organizationFeatureFlags)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(organizationFeatureFlags.id, existing.id))
  } else {
    // Create new flag
    await superadminDb.insert(organizationFeatureFlags).values({
      organizationId,
      flagKey,
      enabled,
    })
  }
}

/**
 * Get all unique flag keys from definitions + org flags
 */
export async function getAvailableFlagKeys(): Promise<string[]> {
  // Get from definitions
  const defKeys = await superadminDb
    .selectDistinct({ key: featureFlagDefinitions.key })
    .from(featureFlagDefinitions)
    .orderBy(featureFlagDefinitions.key)

  // Get from org flags (in case there are any not in definitions)
  const orgKeys = await superadminDb
    .selectDistinct({ key: organizationFeatureFlags.flagKey })
    .from(organizationFeatureFlags)
    .orderBy(organizationFeatureFlags.flagKey)

  // Also include predefined flags that may not be in DB yet
  const predefinedFlags = [
    'beta_features',
    'advanced_analytics',
    'custom_branding',
    'api_access',
    'sso_enabled',
    'audit_logs',
    'priority_support',
    'custom_domains',
  ]

  const allKeys = new Set([
    ...predefinedFlags,
    ...defKeys.map((k) => k.key),
    ...orgKeys.map((k) => k.key),
  ])
  return Array.from(allKeys).sort()
}

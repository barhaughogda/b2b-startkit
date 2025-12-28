import { pgTable, uuid, text, timestamp, jsonb, index, boolean, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organizations } from './organizations'

/**
 * Feature flag definitions
 *
 * Global definitions of all feature flags.
 * These are the "master list" of available features.
 */
export const featureFlagDefinitions = pgTable(
  'feature_flag_definitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Flag identity
    key: text('key').notNull().unique(), // e.g., 'ai_assistant', 'advanced_analytics'
    name: text('name').notNull(),
    description: text('description'),

    // Defaults
    defaultEnabled: boolean('default_enabled').notNull().default(false),

    // Plan requirements (null = available on all plans)
    minimumPlan: text('minimum_plan'), // e.g., 'pro', 'enterprise'

    // Metadata
    category: text('category'), // e.g., 'billing', 'features', 'beta'
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('feature_flag_defs_key_idx').on(table.key)]
)

/**
 * Organization feature flags
 *
 * Per-organization overrides for feature flags.
 * If no override exists, the default from definitions is used.
 */
export const organizationFeatureFlags = pgTable(
  'organization_feature_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    flagKey: text('flag_key').notNull(),

    // Override value
    enabled: boolean('enabled').notNull(),

    // Conditions for gradual rollout (optional)
    conditions: jsonb('conditions').$type<FeatureFlagConditions>().default({}),

    // Who set this override
    setBy: text('set_by'), // User ID or 'system'
    reason: text('reason'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('org_feature_flags_org_idx').on(table.organizationId),
    index('org_feature_flags_key_idx').on(table.flagKey),
    unique('org_feature_flags_unique').on(table.organizationId, table.flagKey),
  ]
)

/**
 * Feature flag conditions for gradual rollout
 */
export interface FeatureFlagConditions {
  /** Percentage of users to enable (0-100) */
  percentage?: number
  /** Specific user IDs to enable */
  userIds?: string[]
  /** Enable only for specific roles */
  roles?: string[]
  /** Date to auto-enable */
  enableAfter?: string
  /** Date to auto-disable */
  disableAfter?: string
}

/**
 * Relations
 */
export const organizationFeatureFlagsRelations = relations(organizationFeatureFlags, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationFeatureFlags.organizationId],
    references: [organizations.id],
  }),
}))

export type FeatureFlagDefinition = typeof featureFlagDefinitions.$inferSelect
export type NewFeatureFlagDefinition = typeof featureFlagDefinitions.$inferInsert
export type OrganizationFeatureFlag = typeof organizationFeatureFlags.$inferSelect
export type NewOrganizationFeatureFlag = typeof organizationFeatureFlags.$inferInsert

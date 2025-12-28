import { pgTable, uuid, text, timestamp, boolean, index, unique, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

/**
 * Kill switch scope enum
 * Defines the hierarchy level at which a kill switch operates
 */
export const killSwitchScopeEnum = pgEnum('kill_switch_scope', [
  'global',       // Affects all products (system-wide emergency)
  'product',      // Affects a specific product
  'feature',      // Affects a specific feature across all orgs
  'organization', // Affects a specific organization
])

/**
 * Kill switches table
 *
 * Provides emergency controls to instantly disable:
 * - Entire system (global)
 * - Specific products
 * - Specific features
 * - Specific organizations
 *
 * @ai-context This is a critical safety mechanism for B2B.
 * Kill switches are evaluated in order: global > product > feature > org
 * A blocked check at any level stops further evaluation.
 */
export const killSwitches = pgTable(
  'kill_switches',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * Scope determines what level this kill switch affects
     */
    scope: killSwitchScopeEnum('scope').notNull(),

    /**
     * Target identifier based on scope:
     * - global: 'system' (singleton)
     * - product: product ID (e.g., 'web-template')
     * - feature: feature key (e.g., 'ai_assistant')
     * - organization: organization ID (UUID)
     */
    targetId: text('target_id').notNull(),

    /**
     * Whether the kill switch is active
     * true = blocked, false = normal operation
     */
    enabled: boolean('enabled').notNull().default(false),

    /**
     * Human-readable reason for activation
     * Displayed to users when blocked
     */
    reason: text('reason'),

    /**
     * Who activated this kill switch
     * Should be a superadmin user ID
     */
    activatedBy: uuid('activated_by').references(() => users.id),

    /**
     * When the kill switch was activated
     */
    activatedAt: timestamp('activated_at', { withTimezone: true }),

    /**
     * Optional auto-expire timestamp
     * Kill switch automatically deactivates after this time
     * Useful for temporary maintenance windows
     */
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    /**
     * Audit timestamps
     */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Fast lookups by scope and target
    index('kill_switches_scope_target_idx').on(table.scope, table.targetId),
    // Only one kill switch per scope+target combination
    unique('kill_switches_scope_target_unique').on(table.scope, table.targetId),
    // Find active kill switches efficiently
    index('kill_switches_enabled_idx').on(table.enabled),
  ]
)

/**
 * Relations
 */
export const killSwitchesRelations = relations(killSwitches, ({ one }) => ({
  activator: one(users, {
    fields: [killSwitches.activatedBy],
    references: [users.id],
  }),
}))

/**
 * Type exports
 */
export type KillSwitch = typeof killSwitches.$inferSelect
export type NewKillSwitch = typeof killSwitches.$inferInsert

/**
 * Kill switch scope type
 */
export type KillSwitchScope = 'global' | 'product' | 'feature' | 'organization'

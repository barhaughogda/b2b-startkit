import { pgTable, uuid, text, timestamp, jsonb, index, pgEnum, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organizations } from './organizations'

/**
 * Subscription status enum (aligned with Stripe)
 */
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused',
])

/**
 * Plan tier enum
 */
export const planTierEnum = pgEnum('plan_tier', ['free', 'starter', 'pro', 'enterprise'])

/**
 * Subscriptions table
 *
 * One subscription per organization.
 * Synced from Stripe via webhooks.
 *
 * @ai-context Stripe is the source of truth for subscription state.
 * This table is a cache for quick access.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .unique()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    // Stripe identifiers
    stripeCustomerId: text('stripe_customer_id').notNull().unique(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    stripePriceId: text('stripe_price_id'),

    // Subscription state
    status: subscriptionStatusEnum('status').notNull().default('trialing'),
    plan: planTierEnum('plan').notNull().default('free'),

    // Billing details
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: timestamp('cancel_at_period_end', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),

    // Usage limits based on plan
    usageLimits: jsonb('usage_limits').$type<UsageLimits>().default({}),

    // Seat-based billing
    seatCount: integer('seat_count').notNull().default(1),
    maxSeats: integer('max_seats'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('subscriptions_org_id_idx').on(table.organizationId),
    index('subscriptions_stripe_customer_idx').on(table.stripeCustomerId),
    index('subscriptions_stripe_sub_idx').on(table.stripeSubscriptionId),
  ]
)

/**
 * Usage limits type
 */
export interface UsageLimits {
  apiCallsPerMonth?: number
  storageGb?: number
  tokensPerMonth?: number
  customLimits?: Record<string, number>
}

/**
 * Usage records table
 *
 * Tracks usage for metered billing.
 * Aggregated and reported to Stripe periodically.
 */
export const usageRecords = pgTable(
  'usage_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    // What was used
    metric: text('metric').notNull(), // e.g., 'api_calls', 'tokens', 'storage_gb'
    value: integer('value').notNull(),

    // When
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

    // Stripe sync status
    reportedToStripe: timestamp('reported_to_stripe', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('usage_records_org_id_idx').on(table.organizationId),
    index('usage_records_metric_idx').on(table.metric),
    index('usage_records_period_idx').on(table.periodStart, table.periodEnd),
  ]
)

/**
 * Relations
 */
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
}))

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  organization: one(organizations, {
    fields: [usageRecords.organizationId],
    references: [organizations.id],
  }),
}))

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type UsageRecord = typeof usageRecords.$inferSelect
export type NewUsageRecord = typeof usageRecords.$inferInsert

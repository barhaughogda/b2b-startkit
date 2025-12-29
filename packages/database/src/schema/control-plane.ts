import { pgTable, uuid, text, timestamp, jsonb, index, pgEnum, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

/**
 * Product environment enum
 */
export const productEnvEnum = pgEnum('product_env', ['development', 'staging', 'production'])

/**
 * Product status enum
 */
export const productStatusEnum = pgEnum('product_status', ['active', 'inactive', 'archived'])

/**
 * Customer status enum
 */
export const customerStatusEnum = pgEnum('customer_status', ['active', 'churned', 'suspended'])

/**
 * Link method enum - how the product org was linked to the customer
 */
export const linkMethodEnum = pgEnum('link_method', [
  'manual',           // Manually linked by platform superadmin
  'domain_verified',  // Linked via verified domain
  'sso',              // Linked via SSO verification
  'invited',          // Linked via invitation workflow
])

// ============================================================================
// PRODUCTS REGISTRY
// ============================================================================

/**
 * Products table
 *
 * Registry of all products in the platform.
 * Each product has its own database and Clerk instance.
 *
 * @ai-context Products are independent deployments that sync events to the control plane.
 */
export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Product identification
    name: text('name').notNull().unique(),        // e.g., 'taskmaster'
    displayName: text('display_name').notNull(),  // e.g., 'TaskMaster'
    description: text('description'),
    
    // Deployment info
    baseUrl: text('base_url').notNull(),          // e.g., 'https://taskmaster.example.com'
    env: productEnvEnum('env').notNull().default('development'),
    
    // Status
    status: productStatusEnum('status').notNull().default('active'),
    
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('products_name_idx').on(table.name),
    index('products_status_idx').on(table.status),
  ]
)

/**
 * Product signing keys table
 *
 * Signing keys for server-to-server authentication between products and control plane.
 * Keys are identified by `kid` (key ID) for rotation support.
 *
 * Security model:
 * - `secretHash`: bcrypt hash of the full secret (for display/verification at creation)
 * - `signingKey`: Raw 32-byte key used for HMAC-SHA256 signature verification
 *
 * @ai-no-modify Signing key storage is critical for security
 */
export const productKeys = pgTable(
  'product_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    
    // Key identification
    kid: text('kid').notNull().unique(),          // Key ID used in HMAC header
    label: text('label'),                          // Human-readable label
    
    // Secret (hashed for reference, not used for HMAC)
    secretHash: text('secret_hash').notNull(),
    
    // Signing key (raw, used for HMAC verification)
    // This is stored encrypted or as-is depending on your security requirements
    // In production, consider using KMS or encrypted storage
    signingKey: text('signing_key').notNull(),
    
    // Key lifecycle
    isActive: boolean('is_active').notNull().default(true),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: uuid('revoked_by').references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    
    // Usage tracking
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').references(() => users.id),
  },
  (table) => [
    index('product_keys_product_id_idx').on(table.productId),
    index('product_keys_kid_idx').on(table.kid),
    index('product_keys_is_active_idx').on(table.isActive),
  ]
)

// ============================================================================
// CUSTOMERS (SHARED COMPANIES)
// ============================================================================

/**
 * Customers table
 *
 * Represents a shared company/customer across all products.
 * A customer can have organizations in multiple products.
 *
 * @ai-context This is the platform-level customer entity, not product-level.
 */
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Customer identification
    name: text('name').notNull(),
    
    // Domain verification
    primaryDomain: text('primary_domain'),         // e.g., 'acme.com'
    domains: jsonb('domains').$type<string[]>().default([]),
    
    // Stripe mapping (single Stripe account for all products)
    stripeCustomerId: text('stripe_customer_id').unique(),
    
    // Status
    status: customerStatusEnum('status').notNull().default('active'),
    
    // Additional metadata
    metadata: jsonb('metadata').$type<CustomerMetadata>().default({}),
    
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('customers_name_idx').on(table.name),
    index('customers_primary_domain_idx').on(table.primaryDomain),
    index('customers_stripe_customer_id_idx').on(table.stripeCustomerId),
    index('customers_status_idx').on(table.status),
  ]
)

/**
 * Customer metadata type
 */
export interface CustomerMetadata {
  industry?: string
  size?: 'startup' | 'smb' | 'enterprise'
  notes?: string
  [key: string]: unknown
}

// ============================================================================
// PRODUCT ORGANIZATIONS (SNAPSHOTS FROM PRODUCTS)
// ============================================================================

/**
 * Product organizations table
 *
 * Snapshot of organizations from each product.
 * Synced via events from products to the control plane.
 *
 * @ai-context This is a denormalized cache; the product's own DB is source of truth.
 */
export const productOrgs = pgTable(
  'product_orgs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Product reference
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    
    // External identifiers (from the product's Clerk/DB)
    externalOrgId: text('external_org_id').notNull(),  // Clerk org ID in the product
    externalDbId: text('external_db_id'),               // Product DB organization ID
    
    // Org snapshot data
    name: text('name').notNull(),
    slug: text('slug'),
    domain: text('domain'),
    
    // Status
    status: text('status').notNull().default('active'), // 'active', 'suspended', etc.
    
    // Sync tracking
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
    
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('product_orgs_product_id_idx').on(table.productId),
    index('product_orgs_external_org_id_idx').on(table.externalOrgId),
    index('product_orgs_domain_idx').on(table.domain),
    // Composite unique: one external org ID per product
    index('product_orgs_product_external_idx').on(table.productId, table.externalOrgId),
  ]
)

// ============================================================================
// CUSTOMER ↔ PRODUCT ORG LINKS
// ============================================================================

/**
 * Customer product org links table
 *
 * Links a shared customer to their organization(s) in each product.
 * This is the core relationship for cross-product customer visibility.
 *
 * @ai-context A customer can have multiple orgs in one product (rare) or one org per product (typical).
 */
export const customerProductOrgLinks = pgTable(
  'customer_product_org_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Customer reference
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    
    // Product org reference
    productOrgId: uuid('product_org_id')
      .notNull()
      .references(() => productOrgs.id, { onDelete: 'cascade' }),
    
    // Link method
    linkMethod: linkMethodEnum('link_method').notNull().default('manual'),
    
    // Audit
    linkedBy: uuid('linked_by').references(() => users.id),
    linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
    
    // Optional notes
    notes: text('notes'),
  },
  (table) => [
    index('customer_product_org_links_customer_id_idx').on(table.customerId),
    index('customer_product_org_links_product_org_id_idx').on(table.productOrgId),
  ]
)

// ============================================================================
// BILLING & SUBSCRIPTIONS (AGGREGATED FROM PRODUCTS)
// ============================================================================

/**
 * Subscription status enum
 */
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
])

/**
 * Billing interval enum
 */
export const billingIntervalEnum = pgEnum('billing_interval', ['month', 'year'])

/**
 * Product subscriptions table
 *
 * Aggregated subscription data from all products.
 * Synced via events from products to the control plane.
 *
 * @ai-context This is a denormalized cache for billing aggregation; products own the source data.
 */
export const productSubscriptions = pgTable(
  'product_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Product reference
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    
    // Product org reference (may not be linked to a customer yet)
    productOrgId: uuid('product_org_id')
      .references(() => productOrgs.id, { onDelete: 'set null' }),
    
    // Customer reference (if linked)
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'set null' }),
    
    // Stripe identifiers
    stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    
    // Subscription details
    status: subscriptionStatusEnum('status').notNull().default('active'),
    priceId: text('price_id').notNull(),
    productName: text('product_name'),                // Human-readable plan name
    
    // Billing amounts
    amount: text('amount').notNull(),                  // Stored as string for precision (in cents)
    currency: text('currency').notNull().default('usd'),
    interval: billingIntervalEnum('interval').notNull().default('month'),
    
    // Period
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAt: timestamp('cancel_at', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    
    // Trial
    trialStart: timestamp('trial_start', { withTimezone: true }),
    trialEnd: timestamp('trial_end', { withTimezone: true }),
    
    // Attribution metadata from Stripe
    externalOrgId: text('external_org_id'),            // Product's Clerk org ID
    
    // Sync tracking
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
    
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('product_subscriptions_product_id_idx').on(table.productId),
    index('product_subscriptions_product_org_id_idx').on(table.productOrgId),
    index('product_subscriptions_customer_id_idx').on(table.customerId),
    index('product_subscriptions_stripe_subscription_id_idx').on(table.stripeSubscriptionId),
    index('product_subscriptions_stripe_customer_id_idx').on(table.stripeCustomerId),
    index('product_subscriptions_status_idx').on(table.status),
  ]
)

/**
 * Billing event type enum
 */
export const billingEventTypeEnum = pgEnum('billing_event_type', [
  'subscription.created',
  'subscription.updated',
  'subscription.deleted',
  'subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
  'charge.succeeded',
  'charge.failed',
  'charge.refunded',
])

/**
 * Billing events table
 *
 * Timeline of billing events for analytics and auditing.
 *
 * @ai-context Immutable event log for billing history and analytics.
 */
export const billingEvents = pgTable(
  'billing_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Product reference
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    
    // Subscription reference
    subscriptionId: uuid('subscription_id')
      .references(() => productSubscriptions.id, { onDelete: 'set null' }),
    
    // Customer reference
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'set null' }),
    
    // Event details
    eventType: billingEventTypeEnum('event_type').notNull(),
    stripeEventId: text('stripe_event_id').unique(),    // Stripe event ID for idempotency
    
    // Amount (for charges/payments)
    amount: text('amount'),                              // In cents
    currency: text('currency'),
    
    // Event data
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    
    // Timestamps
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('billing_events_product_id_idx').on(table.productId),
    index('billing_events_subscription_id_idx').on(table.subscriptionId),
    index('billing_events_customer_id_idx').on(table.customerId),
    index('billing_events_event_type_idx').on(table.eventType),
    index('billing_events_stripe_event_id_idx').on(table.stripeEventId),
    index('billing_events_occurred_at_idx').on(table.occurredAt),
  ]
)

// ============================================================================
// PLATFORM AUDIT LOGS
// ============================================================================

/**
 * Platform audit logs table
 *
 * Immutable audit log for control plane actions.
 * Separate from product-level audit logs.
 *
 * @ai-no-modify Audit log integrity is critical for compliance.
 */
export const platformAuditLogs = pgTable(
  'platform_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Who
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorEmail: text('actor_email'),
    
    // What
    action: text('action').notNull(),              // e.g., 'product.created', 'customer.linked'
    resourceType: text('resource_type').notNull(), // e.g., 'product', 'customer', 'product_key'
    resourceId: text('resource_id'),
    
    // Context
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    
    // Details
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    
    // Security context
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    
    // Timestamp (immutable)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('platform_audit_logs_actor_idx').on(table.actorUserId),
    index('platform_audit_logs_action_idx').on(table.action),
    index('platform_audit_logs_resource_idx').on(table.resourceType, table.resourceId),
    index('platform_audit_logs_product_id_idx').on(table.productId),
    index('platform_audit_logs_customer_id_idx').on(table.customerId),
    index('platform_audit_logs_created_at_idx').on(table.createdAt),
  ]
)

// ============================================================================
// RELATIONS
// ============================================================================

export const productsRelations = relations(products, ({ many }) => ({
  keys: many(productKeys),
  orgs: many(productOrgs),
}))

export const productKeysRelations = relations(productKeys, ({ one }) => ({
  product: one(products, {
    fields: [productKeys.productId],
    references: [products.id],
  }),
  createdByUser: one(users, {
    fields: [productKeys.createdBy],
    references: [users.id],
  }),
  revokedByUser: one(users, {
    fields: [productKeys.revokedBy],
    references: [users.id],
  }),
}))

export const customersRelations = relations(customers, ({ many }) => ({
  productOrgLinks: many(customerProductOrgLinks),
}))

export const productOrgsRelations = relations(productOrgs, ({ one, many }) => ({
  product: one(products, {
    fields: [productOrgs.productId],
    references: [products.id],
  }),
  customerLinks: many(customerProductOrgLinks),
}))

export const customerProductOrgLinksRelations = relations(customerProductOrgLinks, ({ one }) => ({
  customer: one(customers, {
    fields: [customerProductOrgLinks.customerId],
    references: [customers.id],
  }),
  productOrg: one(productOrgs, {
    fields: [customerProductOrgLinks.productOrgId],
    references: [productOrgs.id],
  }),
  linkedByUser: one(users, {
    fields: [customerProductOrgLinks.linkedBy],
    references: [users.id],
  }),
}))

export const productSubscriptionsRelations = relations(productSubscriptions, ({ one, many }) => ({
  product: one(products, {
    fields: [productSubscriptions.productId],
    references: [products.id],
  }),
  productOrg: one(productOrgs, {
    fields: [productSubscriptions.productOrgId],
    references: [productOrgs.id],
  }),
  customer: one(customers, {
    fields: [productSubscriptions.customerId],
    references: [customers.id],
  }),
  events: many(billingEvents),
}))

export const billingEventsRelations = relations(billingEvents, ({ one }) => ({
  product: one(products, {
    fields: [billingEvents.productId],
    references: [products.id],
  }),
  subscription: one(productSubscriptions, {
    fields: [billingEvents.subscriptionId],
    references: [productSubscriptions.id],
  }),
  customer: one(customers, {
    fields: [billingEvents.customerId],
    references: [customers.id],
  }),
}))

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type ProductKey = typeof productKeys.$inferSelect
export type NewProductKey = typeof productKeys.$inferInsert
export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
export type ProductOrg = typeof productOrgs.$inferSelect
export type NewProductOrg = typeof productOrgs.$inferInsert
export type CustomerProductOrgLink = typeof customerProductOrgLinks.$inferSelect
export type NewCustomerProductOrgLink = typeof customerProductOrgLinks.$inferInsert
export type ProductSubscription = typeof productSubscriptions.$inferSelect
export type NewProductSubscription = typeof productSubscriptions.$inferInsert
export type BillingEvent = typeof billingEvents.$inferSelect
export type NewBillingEvent = typeof billingEvents.$inferInsert
export type PlatformAuditLog = typeof platformAuditLogs.$inferSelect
export type NewPlatformAuditLog = typeof platformAuditLogs.$inferInsert
export type ProductEnv = 'development' | 'staging' | 'production'
export type ProductStatus = 'active' | 'inactive' | 'archived'
export type CustomerStatus = 'active' | 'churned' | 'suspended'
export type LinkMethod = 'manual' | 'domain_verified' | 'sso' | 'invited'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused'
export type BillingInterval = 'month' | 'year'
export type BillingEventType = 'subscription.created' | 'subscription.updated' | 'subscription.deleted' | 'subscription.trial_will_end' | 'invoice.paid' | 'invoice.payment_failed' | 'charge.succeeded' | 'charge.failed' | 'charge.refunded'

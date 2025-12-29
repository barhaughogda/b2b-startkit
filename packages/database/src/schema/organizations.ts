import { pgTable, uuid, text, timestamp, jsonb, index, pgEnum, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

/**
 * Organization role enum
 */
export const organizationRoleEnum = pgEnum('organization_role', ['owner', 'admin', 'member'])

/**
 * Organization status enum
 * Used for kill switch / suspension functionality
 */
export const organizationStatusEnum = pgEnum('organization_status', [
  'active',     // Normal operation
  'suspended',  // Temporarily suspended (can be reactivated)
  'locked',     // Locked by superadmin (read-only access)
])

/**
 * Organizations table
 *
 * Synced from Clerk via webhooks.
 * Each organization is a tenant - all data is isolated by organization_id.
 *
 * @ai-context This is the primary tenant identifier.
 * All tenant-scoped tables must have organization_id.
 */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkOrgId: text('clerk_org_id').notNull().unique(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),

    /**
     * Organization status for kill switch / suspension
     * - active: Normal operation
     * - suspended: Temporarily suspended, can be reactivated
     * - locked: Read-only, locked by superadmin
     */
    status: organizationStatusEnum('status').notNull().default('active'),

    /**
     * When the organization was suspended (if status != active)
     */
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),

    /**
     * Reason for suspension (displayed to users)
     */
    suspendedReason: text('suspended_reason'),

    /**
     * Who suspended the organization (superadmin user ID)
     */
    suspendedBy: uuid('suspended_by').references(() => users.id),

    // Settings stored as JSON for flexibility
    settings: jsonb('settings').$type<OrganizationSettings>().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('organizations_clerk_org_id_idx').on(table.clerkOrgId),
    index('organizations_slug_idx').on(table.slug),
    index('organizations_status_idx').on(table.status),
  ]
)

/**
 * Organization settings type
 */
export interface OrganizationSettings {
  timezone?: string
  locale?: string
  [key: string]: unknown
}

/**
 * Organization members junction table
 *
 * Links users to organizations with roles.
 * Synced from Clerk via webhooks.
 */
export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: organizationRoleEnum('role').notNull().default('member'),

    // App admin flag - grants access to /admin/* routes in the product
    // This is separate from platform superadmin (users.isSuperadmin)
    isAppAdmin: boolean('is_app_admin').notNull().default(false),

    // Custom permissions override (JSON array of permission strings)
    customPermissions: jsonb('custom_permissions').$type<string[]>().default([]),

    // Timestamps
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('org_members_org_id_idx').on(table.organizationId),
    index('org_members_user_id_idx').on(table.userId),
  ]
)

/**
 * Relations
 */
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
}))

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}))

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
export type OrganizationMember = typeof organizationMembers.$inferSelect
export type NewOrganizationMember = typeof organizationMembers.$inferInsert
export type OrganizationStatus = 'active' | 'suspended' | 'locked'
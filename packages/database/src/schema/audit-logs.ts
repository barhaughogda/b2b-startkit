import { pgTable, uuid, text, timestamp, jsonb, index, inet } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'
import { organizations } from './organizations'

/**
 * Audit logs table
 *
 * Immutable log of all significant actions.
 * Required for B2B compliance and security.
 *
 * @ai-no-modify Audit log integrity is critical for compliance.
 * Never delete or modify audit log entries.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Who
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    userEmail: text('user_email'), // Denormalized for when user is deleted

    // What
    action: text('action').notNull(), // e.g., 'user.created', 'project.deleted'
    resourceType: text('resource_type').notNull(), // e.g., 'user', 'project', 'subscription'
    resourceId: text('resource_id'), // ID of affected resource

    // Details
    metadata: jsonb('metadata').$type<AuditMetadata>().default({}),

    // Security context
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),

    // Superadmin context
    isSuperadminAction: timestamp('is_superadmin_action', { withTimezone: true }),
    impersonatedUserId: uuid('impersonated_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    // Timestamp (immutable)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_org_id_idx').on(table.organizationId),
    index('audit_logs_user_id_idx').on(table.userId),
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ]
)

/**
 * Audit metadata type
 */
export interface AuditMetadata {
  /** Previous state before change */
  before?: Record<string, unknown>
  /** New state after change */
  after?: Record<string, unknown>
  /** Reason for the action */
  reason?: string
  /** Additional context */
  [key: string]: unknown
}

/**
 * Superadmin audit logs
 *
 * Separate table for superadmin actions.
 * Extra scrutiny and longer retention.
 */
export const superadminAuditLogs = pgTable(
  'superadmin_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Who (always a superadmin)
    adminUserId: uuid('admin_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    adminEmail: text('admin_email').notNull(),

    // Target (if impersonating)
    targetOrganizationId: uuid('target_organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    targetUserId: uuid('target_user_id').references(() => users.id, { onDelete: 'set null' }),

    // What
    action: text('action').notNull(), // e.g., 'impersonation.started', 'feature_flag.toggled'
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),

    // Details
    metadata: jsonb('metadata').$type<AuditMetadata>().default({}),

    // Security context
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),

    // Timestamp
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('superadmin_audit_admin_idx').on(table.adminUserId),
    index('superadmin_audit_action_idx').on(table.action),
    index('superadmin_audit_created_at_idx').on(table.createdAt),
  ]
)

/**
 * Relations
 */
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
export type SuperadminAuditLog = typeof superadminAuditLogs.$inferSelect
export type NewSuperadminAuditLog = typeof superadminAuditLogs.$inferInsert

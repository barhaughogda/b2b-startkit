import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core'

/**
 * Users table
 *
 * Synced from Clerk via webhooks.
 * The clerkId is the source of truth for identity.
 *
 * @ai-context Users exist independently of organizations.
 * A user can belong to multiple organizations.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull(),
    name: text('name'),
    avatarUrl: text('avatar_url'),

    // Global role - separate from organization roles
    isSuperadmin: boolean('is_superadmin').notNull().default(false),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('users_clerk_id_idx').on(table.clerkId),
    index('users_email_idx').on(table.email),
  ]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

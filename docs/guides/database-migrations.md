# Database Migrations Guide

This guide explains how to work with database migrations in the StartKit database package.

## Overview

The database package uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL (Supabase). Migrations are managed through Drizzle Kit, which generates SQL migration files from schema definitions.

## Migration Workflow

### 1. Generate Migrations

After modifying schema files in `packages/database/src/schema/`, generate a migration:

```bash
cd packages/database
pnpm db:generate
```

This will:
- Analyze schema changes
- Generate SQL migration files in `src/migrations/sql/`
- Create a migration metadata file

### 2. Review Generated Migrations

Always review the generated SQL before applying:

```bash
cat packages/database/src/migrations/sql/000X_*.sql
```

### 3. Apply Migrations

**For Development (Direct Push):**
```bash
pnpm db:push
```

This pushes schema changes directly to the database without creating migration files. Use only in development.

**For Production (Migration Files):**
```bash
pnpm db:migrate
```

This applies migration files in order. Use this in production and staging environments.

### 4. Apply RLS Policies

After schema migrations, apply Row-Level Security policies:

```bash
pnpm db:apply-rls
```

This runs the RLS policies SQL migration (`0001_enable_rls.sql`).

## RLS Policies

Row-Level Security (RLS) is **critical** for multi-tenancy. All tenant-scoped tables have RLS enabled.

### How RLS Works

1. **Session Variables**: Before queries, we set Postgres session variables:
   - `app.current_org_id` - Current organization ID
   - `app.current_user_id` - Current user ID
   - `app.is_superadmin` - Whether user is superadmin

2. **Policy Evaluation**: RLS policies check these variables to determine access.

3. **Automatic Isolation**: Queries are automatically filtered by organization.

### Setting Tenant Context

Always wrap database operations with `withTenant()`:

```typescript
import { withTenant } from '@startkit/database'

await withTenant({ organizationId, userId }, async () => {
  // All queries here are automatically tenant-isolated
  const projects = await db.query.projects.findMany()
})
```

### Superadmin Bypass

For webhooks and system operations, use the superadmin client:

```typescript
import { superadminDb } from '@startkit/database'

// This bypasses RLS - use ONLY for webhooks/system operations
const allUsers = await superadminDb.query.users.findMany()
```

## Seeding Development Data

To populate the database with test data:

```bash
pnpm db:seed
```

This creates:
- Test users (alice@example.com, bob@example.com, admin@example.com)
- Test organizations (Acme Corp, Tech Startup Inc)
- Organization memberships
- Sample subscriptions

## Migration Best Practices

1. **Always Review**: Review generated SQL before applying
2. **Test Locally**: Test migrations on local database first
3. **Backup First**: Backup production database before migrations
4. **One Change Per Migration**: Keep migrations focused and atomic
5. **Never Modify Applied Migrations**: Once applied, don't change migration files
6. **Document Breaking Changes**: Add comments for schema changes that require code updates

## Troubleshooting

### Migration Fails

If a migration fails:

1. **Check Logs**: Review error messages carefully
2. **Rollback**: Manually rollback if needed (Drizzle doesn't auto-rollback)
3. **Fix Schema**: Update schema files and regenerate migration
4. **Re-apply**: Apply fixed migration

### RLS Policies Not Working

If RLS policies aren't enforcing isolation:

1. **Check Policies**: Verify policies are applied: `pnpm db:apply-rls`
2. **Check Context**: Ensure `withTenant()` is wrapping queries
3. **Check Session Variables**: Verify session variables are set correctly
4. **Check Superadmin**: Ensure you're not accidentally using `superadminDb`

### Connection Issues

If you can't connect:

1. **Check Environment**: Verify `DATABASE_URL` is set correctly
2. **Check Supabase**: Verify Supabase project is active
3. **Check Network**: Ensure network/firewall allows connections
4. **Check Credentials**: Verify connection string credentials

## Migration File Structure

```
packages/database/
├── src/
│   ├── schema/           # Schema definitions (Drizzle)
│   ├── migrations/
│   │   ├── sql/          # Generated SQL migrations
│   │   │   └── 0001_enable_rls.sql
│   │   ├── apply-rls.ts  # RLS policy application script
│   │   └── index.ts       # Migration utilities
│   └── seed.ts           # Seed script
└── drizzle.config.ts     # Drizzle Kit configuration
```

## Database Schema Overview

### Core Tables

#### `users`
Stores user accounts synced from Clerk.

**Key Fields:**
- `id` (UUID): Primary key
- `clerkId` (text): Clerk user ID (unique)
- `email` (text): User email
- `name` (text): Display name
- `isSuperadmin` (boolean): Global admin flag

**Relations:**
- One-to-many with `organization_members`
- One-to-many with `audit_logs`

#### `organizations`
Tenant container - all data is scoped to organizations.

**Key Fields:**
- `id` (UUID): Primary key
- `clerkOrgId` (text): Clerk organization ID (unique)
- `name` (text): Organization name
- `slug` (text): URL-friendly identifier (unique)
- `settings` (JSONB): Organization settings

**Relations:**
- One-to-many with `organization_members`
- One-to-one with `subscriptions`
- One-to-many with `audit_logs`

#### `organization_members`
Junction table linking users to organizations with roles.

**Key Fields:**
- `id` (UUID): Primary key
- `organizationId` (UUID): Foreign key to organizations
- `userId` (UUID): Foreign key to users
- `role` (enum): 'owner' | 'admin' | 'member' | 'viewer'

**Relations:**
- Many-to-one with `organizations`
- Many-to-one with `users`

#### `subscriptions`
Stripe subscription state (synced via webhooks).

**Key Fields:**
- `id` (UUID): Primary key
- `organizationId` (UUID): Foreign key to organizations (unique)
- `stripeCustomerId` (text): Stripe customer ID
- `stripeSubscriptionId` (text): Stripe subscription ID
- `status` (enum): Subscription status
- `plan` (enum): 'free' | 'starter' | 'pro' | 'enterprise'
- `seatCount` (integer): Number of seats (per-seat pricing)
- `currentPeriodStart` (timestamp): Billing period start
- `currentPeriodEnd` (timestamp): Billing period end

**Relations:**
- One-to-one with `organizations`

#### `audit_logs`
Immutable log of all significant actions.

**Key Fields:**
- `id` (UUID): Primary key
- `organizationId` (UUID): Foreign key to organizations
- `userId` (UUID): Foreign key to users
- `action` (text): Action type (e.g., 'user.created')
- `resourceType` (text): Resource type (e.g., 'user', 'project')
- `resourceId` (text): ID of affected resource
- `metadata` (JSONB): Additional context
- `ipAddress` (inet): Request IP address
- `createdAt` (timestamp): When action occurred

**Relations:**
- Many-to-one with `organizations`
- Many-to-one with `users`

#### `feature_flag_definitions`
Global definitions of available feature flags.

**Key Fields:**
- `id` (UUID): Primary key
- `key` (text): Flag key (unique, e.g., 'ai_assistant')
- `name` (text): Human-readable name
- `description` (text): Flag description
- `defaultEnabled` (boolean): Default state
- `minimumPlan` (text): Minimum plan required

#### `organization_feature_flags`
Per-organization feature flag overrides.

**Key Fields:**
- `id` (UUID): Primary key
- `organizationId` (UUID): Foreign key to organizations
- `flagKey` (text): Foreign key to feature_flag_definitions
- `enabled` (boolean): Override state

**Relations:**
- Many-to-one with `organizations`
- Many-to-one with `feature_flag_definitions`

### Schema Patterns

#### Multi-Tenancy Pattern

All tenant-scoped tables include `organization_id`:

```typescript
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  // ... other fields
})
```

#### Timestamps Pattern

All tables include standard timestamps:

```typescript
createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
```

#### Soft Delete Pattern

For tables that need soft deletes, add:

```typescript
deletedAt: timestamp('deleted_at', { withTimezone: true }),
```

Then filter in queries:
```typescript
where: and(
  eq(projects.organizationId, orgId),
  isNull(projects.deletedAt)
)
```

### Adding New Tables

When adding a new tenant-scoped table:

1. **Add `organization_id`** foreign key
2. **Enable RLS** in migration
3. **Create RLS policy** for tenant isolation
4. **Add indexes** on `organization_id` and common query fields
5. **Add audit logging** for mutations

Example:

```typescript
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    // ... other fields
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('projects_org_id_idx').on(table.organizationId),
  ]
)
```

## Related Documentation

- [Getting Started Guide](./getting-started.md) - Initial setup
- [RBAC Guide](./rbac.md) - Permissions and roles
- [Billing Integration Guide](./billing-integration.md) - Stripe integration

# System Boundaries for AI Assistants

This document defines the boundaries of the StartKit-Business system to help AI assistants understand what can and cannot be modified.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Mono-repo                            │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                      │
│  ├── web-template/  (Base template for new products)        │
│  ├── product-*/     (Individual SaaS products)              │
│  └── superadmin/    (Internal admin dashboard)              │
├─────────────────────────────────────────────────────────────┤
│  packages/                                                  │
│  ├── auth/          (Clerk integration - CRITICAL)          │
│  ├── billing/       (Stripe integration - CRITICAL)         │
│  ├── database/      (Drizzle + Supabase - CRITICAL)         │
│  ├── rbac/          (Permissions - CRITICAL)                │
│  ├── ui/            (shadcn components - SAFE)              │
│  ├── config/        (Shared types - SAFE)                   │
│  └── analytics/     (PostHog - SAFE)                        │
├─────────────────────────────────────────────────────────────┤
│  infra/                                                     │
│  ├── scripts/       (Automation - CRITICAL)                 │
│  └── mcp-servers/   (AI integration - SAFE)                 │
└─────────────────────────────────────────────────────────────┘
```

## Safety Levels

### CRITICAL - Requires Human Review

These areas affect security, billing, or data isolation. Changes here must be reviewed carefully:

1. **Authentication** (`packages/auth/src/`)
   - Clerk integration
   - Session handling
   - Superadmin detection

2. **Billing** (`packages/billing/src/webhooks/`)
   - Stripe webhook handlers
   - Subscription lifecycle
   - Payment processing

3. **Database Security** (`packages/database/src/`)
   - RLS policies
   - Tenant isolation
   - Schema migrations

4. **Permissions** (`packages/rbac/src/`)
   - Permission definitions
   - Role hierarchies
   - Feature flag logic

5. **Infrastructure Scripts** (`infra/scripts/`)
   - Product scaffolding
   - Deployment automation

### SAFE - Can Be Modified Freely

These areas can be modified without special review:

1. **UI Components** (`packages/ui/src/components/`)
   - Visual components
   - Layouts
   - Styling

2. **Product-Specific Code** (`apps/*/src/components/`)
   - Product features
   - Custom pages
   - Business logic

3. **Documentation** (`docs/`)
   - Guides
   - ADRs
   - AI context

## Multi-Tenancy Rules

### Every Query Must Be Tenant-Scoped

```typescript
// WRONG - Queries all data
const projects = await db.query.projects.findMany()

// CORRECT - Scoped to organization
const projects = await db.query.projects.findMany({
  where: eq(projects.organizationId, ctx.organizationId)
})
```

### Use withTenant() Wrapper

```typescript
// CORRECT - Tenant context is automatic
await withTenant({ organizationId, userId }, async () => {
  const projects = await db.query.projects.findMany()
  // Automatically filtered by tenant context
})
```

### Never Bypass RLS

Row-Level Security policies are the final safeguard. Never:
- Disable RLS policies
- Use service role key for user requests
- Write queries that could leak data across tenants

## Permission Checking

### Always Check Before Mutations

```typescript
// CORRECT
if (!can(ctx, 'delete:project')) {
  throw new ForbiddenError('Cannot delete project')
}
await deleteProject(id)

// WRONG - No permission check
await deleteProject(id)
```

### Log Permission Denials

```typescript
if (!can(ctx, permission)) {
  await logAuditEvent({
    action: 'permission.denied',
    resourceType: 'project',
    metadata: { permission, userId: ctx.userId }
  })
  throw new ForbiddenError()
}
```

## External Service Integration

### Clerk (Authentication)
- Source of truth for user identity
- Webhooks sync users to local database
- Never store passwords locally

### Stripe (Billing)
- Source of truth for subscription state
- Webhooks sync billing to local database
- Always verify webhook signatures

### Supabase (Database)
- RLS enforces tenant isolation
- Service role key only for system operations
- Anon key for client-side queries (with RLS)

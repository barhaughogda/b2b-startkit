# System Boundaries for AI Assistants

This document defines the boundaries of the B2B StartKit system to help AI assistants understand what can and cannot be modified.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Mono-repo                            │
│                    (Turborepo + pnpm)                      │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                      │
│  ├── web-template/  (Base template for new products)        │
│  ├── superadmin/    (Internal admin dashboard)              │
│  └── [product-*]/   (Individual SaaS products)              │
├─────────────────────────────────────────────────────────────┤
│  packages/                                                  │
│  ├── config/        (Env validation, types - FOUNDATION)    │
│  ├── database/      (Drizzle + Supabase + RLS - CRITICAL)  │
│  ├── auth/          (Clerk integration - CRITICAL)          │
│  ├── rbac/          (Permissions, roles - CRITICAL)         │
│  ├── billing/       (Stripe integration - CRITICAL)          │
│  ├── ui/            (shadcn components - SAFE)             │
│  └── analytics/     (PostHog integration - SAFE)            │
├─────────────────────────────────────────────────────────────┤
│  infra/                                                     │
│  ├── scripts/       (create-product, setup-stripe)          │
│  └── mcp-servers/   (AI integration - SAFE)                 │
├─────────────────────────────────────────────────────────────┤
│  docs/                                                       │
│  ├── guides/        (User documentation)                    │
│  ├── adr/           (Architecture Decision Records)          │
│  └── ai-context/    (AI assistant context)                 │
└─────────────────────────────────────────────────────────────┘
```

### Package Dependencies

```
@startkit/config (foundation)
  ├─ @startkit/database
  │   ├─ @startkit/auth
  │   ├─ @startkit/rbac
  │   └─ @startkit/billing
  └─ @startkit/ui
      └─ @startkit/analytics
```

## Safety Levels

### CRITICAL - Requires Human Review

These areas affect security, billing, or data isolation. Changes here must be reviewed carefully:

1. **Configuration** (`packages/config/src/env.ts`)
   - Environment variable validation
   - Type definitions
   - Foundation for all packages

2. **Database Security** (`packages/database/src/`)
   - RLS policies (`src/migrations/sql/0001_enable_rls.sql`)
   - Tenant isolation (`src/tenant.ts`)
   - Schema migrations (`src/schema/`)
   - Never bypass RLS without explicit reason

3. **Authentication** (`packages/auth/src/`)
   - Clerk integration (`src/server.ts`)
   - Webhook handlers (`src/webhooks.ts`)
   - Superadmin detection
   - Session handling

4. **Permissions** (`packages/rbac/src/`)
   - Permission definitions (`src/permissions.ts`)
   - Role hierarchies (`src/roles.ts`)
   - Feature flag logic (`src/flags.ts`)

5. **Billing** (`packages/billing/src/`)
   - Stripe webhook handlers (`src/webhooks.ts`)
   - Subscription lifecycle (`src/subscriptions.ts`)
   - Payment processing
   - Usage tracking (`src/usage.ts`)

6. **Infrastructure Scripts** (`infra/scripts/`)
   - Product scaffolding (`create-product.ts`)
   - Stripe setup (`setup-stripe.ts`)
   - Marked with `@ai-no-modify` comment

### SAFE - Can Be Modified Freely

These areas can be modified without special review:

1. **UI Components** (`packages/ui/src/components/`)
   - Visual components (shadcn-based)
   - Layouts (`src/layouts/`)
   - Styling and themes

2. **Analytics** (`packages/analytics/src/`)
   - PostHog integration
   - Event tracking
   - Analytics hooks

3. **Product-Specific Code** (`apps/*/src/`)
   - Product features (`src/app/`)
   - Custom components (`src/components/`)
   - Business logic
   - API routes (except webhooks)

4. **Documentation** (`docs/`)
   - Guides (`docs/guides/`)
   - ADRs (`docs/adr/`)
   - AI context (`docs/ai-context/`)

5. **MCP Servers** (`infra/mcp-servers/src/`)
   - AI integration tools
   - Schema introspection
   - Repo knowledge server

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

---
description: "B2B StartKit monorepo conventions (multi-tenancy, auth/billing/RBAC boundaries, component patterns)."
alwaysApply: true
---

# StartKit-Business Development Conventions

## Project Overview
This is a B2B SaaS/AaaS mono-repo starter kit. Every product built from this kit shares common packages for auth, billing, RBAC, UI, and database access.

## Architecture

### Mono-repo Structure
- `apps/` - Individual SaaS products (each is a Next.js app)
- `packages/` - Shared infrastructure (@startkit/* packages)
- `infra/` - Scripts, MCP servers, automation
- `docs/` - Documentation and ADRs

### Key Packages
- `@startkit/ui` - shadcn-based components and layouts
- `@startkit/auth` - Clerk integration, session handling
- `@startkit/database` - Drizzle ORM, Supabase, migrations
- `@startkit/billing` - Stripe subscriptions and usage tracking
- `@startkit/rbac` - Permission engine, roles, feature flags
- `@startkit/analytics` - PostHog integration
- `@startkit/config` - Shared types and environment validation

## Database Access Rules

### CRITICAL: Multi-Tenancy
- Every tenant-scoped table MUST have an `organization_id` column
- ALWAYS use `withTenant()` wrapper for queries
- RLS policies are the PRIMARY security boundary
- NEVER write raw SQL that bypasses RLS

### Query Patterns
```typescript
// CORRECT - Uses tenant context
const projects = await db.query.projects.findMany({
  where: eq(projects.organizationId, ctx.organizationId)
})

// WRONG - No tenant isolation
const projects = await db.query.projects.findMany()
```

## Permission Checks

### Always Check Permissions Before Actions
```typescript
// CORRECT
if (!can(ctx.user, 'create', 'project')) {
  throw new ForbiddenError('Cannot create project')
}

// WRONG - No permission check
await createProject(data)
```

## Component Patterns

### Use @startkit/ui Components First
- Check if a component exists in @startkit/ui before creating new ones
- Product-specific components go in `apps/[product]/src/components/`
- Follow shadcn patterns for any new primitive components

### File Organization
- Keep files under 400 lines
- One main concern per file
- Extract helpers to utils/hooks/services

## API Routes

### All Routes Must:
1. Verify authentication (Clerk middleware)
2. Validate request body (Zod schemas)
3. Check permissions before mutations
4. Return consistent error format
5. Log destructive actions to audit log

## Environment Variables

### Naming Convention
- `NEXT_PUBLIC_*` - Client-exposed variables
- `*_SECRET_KEY` - Never expose to client
- `DATABASE_URL` - Database connection string

### Required Per Product
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

## DO NOT TOUCH Zones

These areas require human review before changes:
- `packages/config/src/env.ts` - Environment validation (foundation)
- `packages/database/src/migrations/sql/0001_enable_rls.sql` - RLS policies
- `packages/database/src/tenant.ts` - Tenant isolation
- `packages/auth/src/server.ts` - Auth utilities
- `packages/auth/src/webhooks.ts` - Clerk webhooks
- `packages/rbac/src/permissions.ts` - Permission logic
- `packages/rbac/src/roles.ts` - Role definitions
- `packages/billing/src/webhooks.ts` - Stripe webhooks
- `packages/billing/src/subscriptions.ts` - Subscription management
- `infra/scripts/` - Automation scripts (marked with `@ai-no-modify`)
- Any file with `@ai-no-modify` comment

See `docs/ai-context/do-not-touch.md` for detailed list.

## Testing Requirements

- Unit tests for business logic (Vitest)
- Integration tests for API routes
- RLS isolation tests for database queries
- E2E tests for critical user flows (Playwright)
- Write tests alongside code (TDD approach)

## Documentation

- Guides: `docs/guides/` - User-facing documentation
- ADRs: `docs/adr/` - Architecture Decision Records
- AI Context: `docs/ai-context/` - AI assistant context
  - `system-boundaries.md` - What can be modified
  - `do-not-touch.md` - Protected areas
  - `conventions.md` - Coding standards

## Git Conventions

### Branch Naming
- `feature/[ticket]-short-description`
- `fix/[ticket]-short-description`
- `refactor/[description]`

### Commit Messages
Follow Conventional Commits:
- `feat: add user invitation flow`
- `fix: handle expired subscription gracefully`
- `refactor: extract billing utils to separate module`

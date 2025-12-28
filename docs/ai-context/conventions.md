# Coding Conventions

This document defines coding standards and conventions for the B2B StartKit codebase.

## File Organization

### File Size Limits

- **Maximum file size**: 400 lines
- **Preferred file size**: Under 300 lines
- **If exceeding**: Split into multiple files or extract utilities

### File Structure

```
packages/[package-name]/src/
├── index.ts              # Public API exports
├── [feature].ts         # Feature implementation
├── [feature].test.ts    # Tests (co-located or in __tests__/)
├── types.ts             # Type definitions (if needed)
└── utils/               # Helper functions
```

### Naming Conventions

- **Files**: kebab-case (`user-service.ts`, `auth-middleware.ts`)
- **Directories**: kebab-case (`feature-flags/`, `webhook-handlers/`)
- **Components**: PascalCase (`UserProfile.tsx`, `BillingCard.tsx`)
- **Functions**: camelCase (`getUser`, `createSubscription`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Types/Interfaces**: PascalCase (`User`, `SubscriptionConfig`)

## TypeScript

### Type Safety

- **Always use TypeScript**: No `any` types without justification
- **Use type inference**: Let TypeScript infer when possible
- **Explicit return types**: For public APIs and complex functions

```typescript
// ✅ Good
export function getUser(id: string): Promise<User | null> {
  return db.query.users.findFirst({ where: eq(users.id, id) })
}

// ❌ Bad
export function getUser(id: any) {
  return db.query.users.findFirst({ where: eq(users.id, id) })
}
```

### Import Organization

1. External packages
2. Internal packages (`@startkit/*`)
3. Relative imports
4. Type-only imports last

```typescript
// ✅ Good
import { eq } from 'drizzle-orm'
import { getServerAuth } from '@startkit/auth'
import { can } from '@startkit/rbac'
import { getUser } from './user-service'
import type { User } from './types'
```

## Database

### Query Patterns

Always use tenant context for tenant-scoped queries:

```typescript
// ✅ CORRECT
await withTenant({ organizationId, userId }, async () => {
  const projects = await db.query.projects.findMany()
})

// ❌ WRONG - No tenant isolation
const projects = await db.query.projects.findMany()
```

### Schema Changes

- **Always create migrations**: Never modify schema directly
- **Review generated SQL**: Check migrations before applying
- **Test migrations**: Test on local database first

```bash
# 1. Modify schema
# Edit packages/database/src/schema/users.ts

# 2. Generate migration
pnpm db:generate

# 3. Review SQL
cat packages/database/src/migrations/sql/000X_*.sql

# 4. Apply migration
pnpm db:push  # Development
```

### Schema Ownership Rules

The factory maintains strict separation between core and product-specific tables.

#### Core Tables (packages/database/src/schema/)

These tables are shared by ALL products and managed by the platform team:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (synced from Clerk) |
| `organizations` | Tenant entities |
| `organization_members` | User-org membership and roles |
| `subscriptions` | Billing state |
| `feature_flag_definitions` | Global flag registry |
| `organization_feature_flags` | Per-org flag overrides |
| `audit_logs` | Compliance and audit trail |
| `kill_switches` | Emergency controls |

#### Product-Specific Tables (apps/[product]/src/db/schema/)

Products MAY create their own tables, but they MUST:

1. **Live in the app directory**, not in `packages/database/`
2. **Include `organization_id`** column with proper RLS policies
3. **Use naming convention**: `[product_prefix]_[table_name]`
4. **Be documented** in the product's `product.config.ts`

```typescript
// ✅ CORRECT - Product table in app directory
// apps/project-manager/src/db/schema/projects.ts
export const pmProjects = pgTable('pm_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  name: text('name').notNull(),
  // ...
})

// ❌ WRONG - Product table in core package
// packages/database/src/schema/projects.ts  <-- DO NOT DO THIS
```

#### Cross-Product Tables: FORBIDDEN

**Hard rule**: Products MUST NOT share tables beyond core.

If two products need shared data, you have three options:

1. **Promote to core**: After platform team review, move the table to `packages/database/`
2. **Use API calls**: Products communicate via API (microservice pattern)
3. **Use events**: Loose coupling via audit log events or webhooks

```typescript
// ❌ WRONG - Products sharing a custom table
// This creates coupling and prevents independent evolution

// ✅ RIGHT - Product A calls Product B's API
const data = await fetch('/api/product-b/resource')
```

## Authentication & Authorization

### Permission Checks

Always check permissions before mutations:

```typescript
// ✅ CORRECT
if (!can(ctx, 'delete:project')) {
  throw new ForbiddenError('Cannot delete project')
}
await deleteProject(id)

// ❌ WRONG - No permission check
await deleteProject(id)
```

### Auth Context

Build permission context consistently:

```typescript
const ctx = {
  role: organization.role,
  customPermissions: user.customPermissions || [],
  plan: organization.subscription?.plan || 'free',
  isSuperadmin: user.isSuperadmin || false,
  featureFlags: await loadOrganizationFeatureFlags(organizationId, plan),
}
```

## API Routes

### Structure

All API routes must:

1. Verify authentication
2. Validate request body (Zod schemas)
3. Check permissions before mutations
4. Return consistent error format
5. Log destructive actions

```typescript
import { z } from 'zod'
import { getServerAuth } from '@startkit/auth'
import { can } from '@startkit/rbac'

const schema = z.object({
  name: z.string().min(1),
})

export async function POST(req: Request) {
  // 1. Verify auth
  const { user, organization } = await getServerAuth()

  // 2. Validate body
  const body = await req.json()
  const data = schema.parse(body)

  // 3. Check permissions
  const ctx = buildPermissionContext(user, organization)
  if (!can(ctx, 'create:project')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 4. Perform action
  const project = await createProject(data)

  // 5. Log action
  await logAuditEvent({
    action: 'project.created',
    resourceType: 'project',
    resourceId: project.id,
  })

  return NextResponse.json({ project })
}
```

### Error Handling

Use consistent error format:

```typescript
// Success
return NextResponse.json({ data: result })

// Error
return NextResponse.json(
  { error: 'Error message', code: 'ERROR_CODE' },
  { status: 400 }
)
```

## React Components

### Component Structure

```typescript
'use client' // Only if needed

import { useState } from 'react'
import { Button } from '@startkit/ui'

interface Props {
  userId: string
  onUpdate?: () => void
}

export function UserProfile({ userId, onUpdate }: Props) {
  const [loading, setLoading] = useState(false)

  // Component logic

  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### Hooks

- Use custom hooks for reusable logic
- Keep hooks focused (single responsibility)
- Name hooks with `use` prefix

```typescript
// ✅ Good
export function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null)
  // ...
  return { user, loading, error }
}

// ❌ Bad - Too much logic in component
function UserProfile({ userId }: Props) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  // 50+ lines of logic...
}
```

## Testing

### Test Structure

- **Unit tests**: Test individual functions
- **Integration tests**: Test API routes and workflows
- **E2E tests**: Test user flows (Playwright)

```typescript
// Unit test example
import { describe, it, expect } from 'vitest'
import { can } from '@startkit/rbac'

describe('can()', () => {
  it('should return true for valid permission', () => {
    const ctx = createMockContext({ role: 'admin' })
    expect(can(ctx, 'create:project')).toBe(true)
  })
})
```

### Test Naming

- Use descriptive test names
- Follow pattern: `should [expected behavior] when [condition]`

```typescript
// ✅ Good
it('should return user when user exists', async () => {
  // ...
})

// ❌ Bad
it('test getUser', async () => {
  // ...
})
```

## Error Handling

### Error Types

Use specific error types:

```typescript
// Custom errors
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

### Error Logging

Always log errors with context:

```typescript
try {
  await processPayment()
} catch (error) {
  console.error('Payment processing failed', {
    error,
    organizationId,
    amount,
    userId,
  })
  throw error
}
```

## Comments & Documentation

### When to Comment

- **Complex logic**: Explain why, not what
- **Business rules**: Document business decisions
- **TODOs**: Mark incomplete work
- **Public APIs**: Document function signatures

```typescript
// ✅ Good - Explains why
// Use superadminDb here because webhook needs to bypass RLS
// to create user record before organization membership exists
const user = await superadminDb.insert(users).values(data)

// ❌ Bad - States the obvious
// Insert user into database
const user = await db.insert(users).values(data)
```

### JSDoc for Public APIs

```typescript
/**
 * Create a checkout session for subscription
 *
 * @param config - Checkout configuration
 * @returns Checkout session URL
 * @throws {Error} If organization not found
 *
 * @example
 * const session = await createCheckoutSession({
 *   organizationId: org.id,
 *   priceId: 'price_xxx',
 *   successUrl: '/billing/success',
 *   cancelUrl: '/billing',
 * })
 */
export async function createCheckoutSession(
  config: CheckoutConfig
): Promise<{ url: string }> {
  // Implementation
}
```

## Git Conventions

### Commit Messages

Follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:

```
feat(auth): add organization switching
fix(billing): handle canceled subscription webhook
docs(guides): add getting started guide
refactor(database): extract tenant context helper
```

### Branch Naming

- `feature/[ticket]-short-description`
- `fix/[ticket]-short-description`
- `refactor/[description]`

Examples:
- `feature/123-add-user-invitations`
- `fix/456-handle-expired-subscription`
- `refactor/extract-billing-utils`

## Environment Variables

### Naming

- `NEXT_PUBLIC_*`: Client-exposed variables
- `*_SECRET_KEY`: Never expose to client
- `DATABASE_URL`: Database connection string

### Validation

Always validate environment variables:

```typescript
// ✅ Good - Validated
import { env } from '@startkit/config'
const stripeKey = env.STRIPE_SECRET_KEY

// ❌ Bad - No validation
const stripeKey = process.env.STRIPE_SECRET_KEY
```

## Performance

### Database Queries

- Use indexes for frequently queried fields
- Avoid N+1 queries (use `with` for relations)
- Limit result sets when possible

```typescript
// ✅ Good - Uses index, limits results
const projects = await db.query.projects.findMany({
  where: eq(projects.organizationId, orgId),
  limit: 100,
})

// ❌ Bad - No limit, could return thousands
const projects = await db.query.projects.findMany({
  where: eq(projects.organizationId, orgId),
})
```

### React Performance

- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers passed to children
- Avoid unnecessary re-renders

```typescript
// ✅ Good
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data)
}, [data])

// ❌ Bad - Recomputes on every render
const expensiveValue = computeExpensiveValue(data)
```

## Security

### Never Do These

1. **Expose secrets**: Never commit API keys or secrets
2. **Skip validation**: Always validate user input
3. **Bypass RLS**: Never use `superadminDb` for user requests
4. **Skip permission checks**: Always check permissions
5. **Trust client data**: Always validate server-side

### Always Do These

1. **Validate input**: Use Zod schemas
2. **Check permissions**: Before all mutations
3. **Use tenant context**: For all tenant-scoped queries
4. **Verify webhooks**: Always verify signatures
5. **Log actions**: Log all destructive actions

## Code Review Checklist

Before submitting code:

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Permission checks added for mutations
- [ ] Tenant context used for queries
- [ ] Error handling implemented
- [ ] Documentation updated (if needed)
- [ ] No secrets committed
- [ ] File size under 400 lines
- [ ] Follows naming conventions

## Related Documentation

- [System Boundaries](./system-boundaries.md) - What can be modified
- [Do Not Touch](./do-not-touch.md) - Protected areas
- [Database Guide](../guides/database-migrations.md) - Database patterns
- [RBAC Guide](../guides/rbac.md) - Permission patterns

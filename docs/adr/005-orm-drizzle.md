# ADR-005: Use Drizzle ORM

## Status
Accepted

## Date
2024-12-28

## Context

We are building a B2B SaaS starter kit that needs:
1. Type-safe database queries
2. Schema migrations
3. Multi-tenancy support (RLS)
4. Complex queries (joins, aggregations)
5. SQL-like query building
6. Good TypeScript support
7. Lightweight and performant

The original consideration included Prisma, TypeORM, and raw SQL.

## Decision

Use **Drizzle ORM** for database access.

## Rationale

### 1. Type Safety

Drizzle provides excellent TypeScript support:
- Inferred types from schema
- Type-safe queries
- Compile-time error checking

```typescript
// Schema defines types
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
})

// Types are inferred
const user = await db.query.users.findFirst()
// user.email is typed as string
```

### 2. SQL-Like API

Drizzle's API is close to SQL, making it intuitive:

```typescript
// Readable and SQL-like
const projects = await db
  .select()
  .from(projects)
  .where(eq(projects.organizationId, orgId))
  .innerJoin(organizations, eq(projects.organizationId, organizations.id))
```

### 3. Lightweight

Drizzle is lightweight:
- Small bundle size
- No runtime overhead
- Fast queries (no heavy abstractions)

This is important for serverless environments where cold starts matter.

### 4. Migration System

Drizzle Kit provides excellent migration tooling:
- Generate migrations from schema changes
- SQL migration files
- Migration tracking
- Rollback support

```bash
pnpm db:generate  # Generate migration from schema
pnpm db:migrate   # Apply migrations
```

### 5. RLS Support

Drizzle works well with Postgres Row-Level Security:
- Can use raw SQL for RLS policies
- Supports session variables
- Works with `withTenant()` wrapper pattern

```typescript
await withTenant({ organizationId, userId }, async () => {
  // RLS policies automatically filter queries
  const projects = await db.query.projects.findMany()
})
```

### 6. Query Builder Flexibility

Drizzle provides both query builder and relational query APIs:

```typescript
// Query builder (SQL-like)
const users = await db
  .select()
  .from(users)
  .where(eq(users.email, email))

// Relational queries (convenient)
const org = await db.query.organizations.findFirst({
  with: {
    members: true,
    subscription: true,
  },
})
```

### 7. No Code Generation

Drizzle doesn't require code generation:
- Schema is TypeScript
- Types are inferred
- No build step needed

This simplifies the development workflow.

### 8. Good Documentation

Drizzle has comprehensive documentation:
- Clear examples
- TypeScript-first
- Active community

## Consequences

### Positive

- **Type Safety**: Compile-time type checking
- **Performance**: Lightweight and fast
- **Flexibility**: SQL-like API with TypeScript
- **Developer Experience**: Intuitive API, good tooling
- **Migration System**: Excellent migration support
- **RLS Compatible**: Works well with Postgres RLS

### Negative

- **Learning Curve**: Team needs to learn Drizzle API
- **Less Mature**: Newer than Prisma/TypeORM
- **Smaller Ecosystem**: Fewer third-party tools
- **Manual Relations**: Need to define relations explicitly

## Alternatives Considered

### Prisma

**Pros:**
- Mature and popular
- Excellent migration system
- Great developer experience
- Strong TypeScript support
- Prisma Studio (database GUI)

**Cons:**
- Heavy runtime
- Code generation required
- Less flexible query API
- RLS support is limited
- Bundle size is larger

**Rejected:** RLS limitations and heavier runtime are concerns for multi-tenant B2B SaaS.

### TypeORM

**Pros:**
- Mature
- Decorator-based (familiar to some)
- Good migration support

**Cons:**
- Runtime overhead
- Less type-safe
- More complex API
- Decorator-based (not everyone's preference)
- Less active development

**Rejected:** Less type-safe and more complex API than Drizzle.

### Raw SQL (with pg)

**Pros:**
- Full control
- No abstraction
- Maximum performance
- No learning curve

**Cons:**
- No type safety
- SQL injection risks (need careful handling)
- Manual migration management
- More boilerplate

**Rejected:** Type safety and developer experience are priorities.

### Kysely

**Pros:**
- Type-safe SQL builder
- Lightweight
- Good TypeScript support

**Cons:**
- Less mature than Drizzle
- Smaller ecosystem
- More manual work for migrations

**Rejected:** Drizzle provides better migration tooling and ecosystem.

## Implementation Details

### Schema Definition

```typescript
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### Query Patterns

```typescript
// Find one
const user = await db.query.users.findFirst({
  where: eq(users.email, email),
})

// Find many with relations
const org = await db.query.organizations.findFirst({
  where: eq(organizations.id, orgId),
  with: {
    members: true,
    subscription: true,
  },
})

// Complex query
const projects = await db
  .select({
    id: projects.id,
    name: projects.name,
    orgName: organizations.name,
  })
  .from(projects)
  .innerJoin(organizations, eq(projects.organizationId, organizations.id))
  .where(eq(projects.organizationId, orgId))
```

### Migration Workflow

```bash
# 1. Modify schema
# Edit packages/database/src/schema/users.ts

# 2. Generate migration
pnpm db:generate

# 3. Review generated SQL
cat packages/database/src/migrations/sql/000X_*.sql

# 4. Apply migration
pnpm db:push  # Development
pnpm db:migrate  # Production
```

### RLS Integration

```typescript
// Set tenant context
await withTenant({ organizationId, userId }, async () => {
  // RLS policies automatically filter
  const projects = await db.query.projects.findMany()
  // Only returns projects for this organization
})
```

## Best Practices

### 1. Use Relational Queries for Simple Cases

```typescript
// ✅ Good for simple queries
const org = await db.query.organizations.findFirst({
  with: { members: true },
})
```

### 2. Use Query Builder for Complex Queries

```typescript
// ✅ Good for complex joins/aggregations
const stats = await db
  .select({
    orgId: projects.organizationId,
    count: sql<number>`count(*)`,
  })
  .from(projects)
  .groupBy(projects.organizationId)
```

### 3. Always Use withTenant() for Tenant-Scoped Queries

```typescript
// ✅ CORRECT
await withTenant({ organizationId, userId }, async () => {
  const projects = await db.query.projects.findMany()
})

// ❌ WRONG - No tenant context
const projects = await db.query.projects.findMany()
```

### 4. Define Relations Explicitly

```typescript
export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  members: many(organizationMembers),
  subscription: one(subscriptions),
}))
```

### 5. Use Indexes for Performance

```typescript
export const projects = pgTable(
  'projects',
  {
    // ... fields
  },
  (table) => [
    index('projects_org_id_idx').on(table.organizationId),
  ]
)
```

## Migration Path

If we ever need to migrate away from Drizzle:

1. Export schema definitions
2. Migrate to new ORM
3. Update query code
4. Update migration scripts

This is feasible but would require significant refactoring.

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [Drizzle with Postgres](https://orm.drizzle.team/docs/get-started-postgresql)

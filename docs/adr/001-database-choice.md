# ADR-001: Use Supabase (Postgres) over Convex for Database

## Status
Accepted

## Date
2024-12-28

## Context

We are building a B2B SaaS starter kit that will be used to create 15+ products. The starter kit needs:

1. Strong multi-tenancy with data isolation
2. Complex RBAC (role-based access control)
3. Audit logging for enterprise compliance
4. Usage-based billing tracking
5. Support for both real-time features and complex queries

The original stack consideration included Convex as the primary database.

## Decision

Use **Supabase (Postgres)** as the primary database with **Drizzle ORM**.

## Rationale

### Row-Level Security (RLS)
Postgres/Supabase provides native RLS policies that enforce tenant isolation at the database level. This is a critical security feature for B2B SaaS.

```sql
-- Example RLS policy
CREATE POLICY tenant_isolation ON projects
  FOR ALL
  USING (organization_id = auth.jwt() ->> 'org_id');
```

With Convex, we would need to manually add `organizationId` checks to every query function, which is error-prone.

### Complex Queries
Postgres supports complex joins, aggregations, and analytical queries that are essential for:
- Usage reporting
- Billing calculations
- Audit log queries
- Admin dashboards

Convex's document model would require denormalization and multiple round-trips.

### Audit Logging
Postgres has mature auditing solutions (pg_audit extension). Supabase provides this out of the box.

### AI Understanding
SQL is universally understood by AI assistants. Convex's proprietary query language adds friction for AI-assisted development.

### Portability
Postgres is highly portable. If we ever need to migrate away from Supabase, the data and schema can move to any Postgres host.

## Consequences

### Positive
- Native RLS for multi-tenancy
- Complex queries without workarounds
- Audit logging built-in
- AI assistants work better with SQL
- Lower vendor lock-in

### Negative
- Real-time features require additional setup (Supabase Realtime)
- More boilerplate for type-safe queries (mitigated by Drizzle)
- Need to manage database migrations

## Alternatives Considered

### Convex
- **Pros:** Excellent real-time, great DX, serverless
- **Cons:** Manual tenant checks, limited RBAC, no native audit, vendor lock-in
- **Rejected:** RBAC complexity outweighs real-time benefits

### PlanetScale
- **Pros:** MySQL, serverless, good DX
- **Cons:** No RLS, no real-time, MySQL dialect
- **Rejected:** No RLS is a deal-breaker for multi-tenancy

### Neon + Drizzle (without Supabase)
- **Pros:** Serverless Postgres, good Drizzle integration
- **Cons:** No built-in auth, no real-time, less ecosystem
- **Rejected:** Supabase provides more out of the box

## References
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)

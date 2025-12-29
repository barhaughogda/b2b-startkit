# DO NOT TOUCH Zones

This document lists code areas that require human review before modification. AI assistants should flag these areas and request explicit approval.

## Files Marked with @ai-no-modify

Any file containing the comment `@ai-no-modify` should not be changed without human review. These files typically handle:
- Authentication logic
- Payment processing
- Security policies
- Database migrations

## Specific Directories and Files

### packages/config/src/env.ts
**Why:** Environment variable validation. All packages depend on this. Changes could break the entire system.

### packages/database/src/migrations/sql/0001_enable_rls.sql
**Why:** RLS policy definitions. Changes could break tenant isolation or cause security vulnerabilities.

### packages/database/src/tenant.ts
**Why:** Tenant context management. Changes could break multi-tenancy isolation.

### packages/database/src/schema/
**Why:** Database schema definitions. Changes require migrations and could cause data loss. Always use migrations, never modify schema directly in production.

### packages/auth/src/server.ts
**Why:** Server-side authentication utilities. Changes could break session handling or security.

### packages/auth/src/webhooks.ts
**Why:** Clerk webhook handlers. Changes could break user/org sync or cause data inconsistencies.

### packages/auth/src/middleware.ts
**Why:** Route protection middleware. Incorrect changes could expose protected routes.

### packages/rbac/src/permissions.ts
**Why:** Permission checking logic. Changes could allow unauthorized access or break access control.

### packages/rbac/src/roles.ts
**Why:** Role definitions and hierarchies. Changes could break permission inheritance or access control.

### packages/billing/src/webhooks.ts
**Why:** Stripe webhook handlers. Changes could cause billing issues, subscription sync problems, or revenue loss.

### packages/billing/src/subscriptions.ts
**Why:** Subscription management logic. Changes could affect payment processing or subscription lifecycle.

### packages/billing/src/stripe.ts
**Why:** Stripe client configuration. Changes could affect payment processing or API calls.

### infra/scripts/create-product.ts
**Why:** Product scaffolding script. Changes could break product creation or introduce inconsistencies. Marked with `@ai-no-modify`.

### infra/scripts/setup-stripe.ts
**Why:** Stripe setup automation. Changes could break Stripe product/price creation. Marked with `@ai-no-modify`.

### apps/superadmin/src/lib/event-signature.ts
**Why:** Control plane HMAC signature verification. Changes could allow unauthorized event injection or break product integration.

### apps/superadmin/src/app/api/control-plane/events/route.ts
**Why:** Control plane event ingestion endpoint. Changes could break event processing, customer sync, or billing aggregation.

### packages/database/src/schema/control-plane.ts
**Why:** Control plane database schema. Changes require migrations and could break platform-wide customer and billing tracking.

## Never Do These Things

### 1. Disable RLS Policies
```sql
-- NEVER DO THIS
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
```

### 2. Skip Permission Checks
```typescript
// NEVER DO THIS
// @ai-bypass-permissions
await deleteProject(id)
```

### 3. Hardcode Organization IDs
```typescript
// NEVER DO THIS
const orgId = 'org_12345' // Hardcoded!
```

### 4. Expose Secrets in Code
```typescript
// NEVER DO THIS
const apiKey = 'EXAMPLE_API_KEY' // Exposed secret!
```

### 5. Create Cross-Tenant Queries
```typescript
// NEVER DO THIS
const allProjects = await db.query.projects.findMany()
// This could return projects from ALL organizations!
```

### 6. Bypass Webhook Signature Verification
```typescript
// NEVER DO THIS
// Skip signature check for testing
const event = JSON.parse(body)
```

### 7. Use Service Role Key for User Requests
```typescript
// NEVER DO THIS
const supabase = createClient(url, SERVICE_ROLE_KEY)
// This bypasses RLS!
// Exception: Only use superadminDb for webhooks and system operations
```

### 8. Modify Applied Migrations
```sql
-- NEVER DO THIS
-- Modifying an already-applied migration can cause inconsistencies
ALTER TABLE users ADD COLUMN new_field TEXT;
-- Instead, create a new migration
```

### 9. Skip Webhook Signature Verification
```typescript
// NEVER DO THIS
// Always verify webhook signatures from Clerk and Stripe
const event = JSON.parse(body) // No signature check!
```

### 10. Hardcode Price IDs or Customer IDs
```typescript
// NEVER DO THIS
const priceId = 'price_12345' // Hardcoded!
// Always use environment variables
const priceId = process.env.STRIPE_PRICE_ID_PRO!
```

## When Changes Are Needed

If you need to modify a protected area:

1. **Explain the reason** clearly in your message
2. **Show the current code** and proposed changes
3. **Highlight security implications**
4. **Wait for explicit approval** before making changes

Example:
```
I need to modify packages/auth/src/middleware.ts to add a new public route.

Current code:
```typescript
const defaultPublicRoutes = ['/sign-in', '/sign-up', ...]
```

Proposed change:
```typescript
const defaultPublicRoutes = ['/sign-in', '/sign-up', '/new-route', ...]
```

Security implication: This route will be accessible without authentication.

Please confirm this change is acceptable.
```

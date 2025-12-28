# DO NOT TOUCH Zones

This document lists code areas that require human review before modification. AI assistants should flag these areas and request explicit approval.

## Files Marked with @ai-no-modify

Any file containing the comment `@ai-no-modify` should not be changed without human review. These files typically handle:
- Authentication logic
- Payment processing
- Security policies
- Database migrations

## Specific Directories

### packages/auth/src/clerk/
**Why:** Core authentication logic. Changes could break user sessions or security.

### packages/auth/src/middleware.ts
**Why:** Route protection. Incorrect changes could expose protected routes.

### packages/database/src/rls/
**Why:** Row-Level Security policies. Changes could leak data across tenants.

### packages/database/src/schema/
**Why:** Database schema. Changes require migrations and could cause data loss.

### packages/billing/src/webhooks/
**Why:** Payment webhooks. Incorrect handling could cause billing issues.

### packages/billing/src/stripe.ts
**Why:** Stripe client configuration. Changes could affect payment processing.

### packages/rbac/src/permissions.ts
**Why:** Permission checking logic. Changes could allow unauthorized access.

### infra/scripts/
**Why:** Automation scripts. Changes could affect product scaffolding.

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
const apiKey = 'sk_live_xxxxx' // Exposed secret!
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

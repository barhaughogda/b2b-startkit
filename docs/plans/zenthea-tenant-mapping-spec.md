# Zenthea Tenant Mapping Specification (T09)

This document defines the mapping between Zenthea's legacy `tenantId` system and StartKit's Clerk-based multi-tenancy architecture.

## 1. ID Mapping Strategy

We are moving from string-based IDs in Convex to UUID-based IDs in Postgres, using Clerk as the source of truth for identity.

| Layer | Identifier | Format | Source |
|-------|------------|--------|--------|
| **Clerk** | `org_id` | String (`org_...`) | Clerk Dashboard/Auth |
| **Zenthea (Legacy)** | `tenantId` | String (`clinic-...`) | Convex `tenants.id` |
| **StartKit DB (Table)** | `id` | UUID | Postgres `organizations.id` |
| **StartKit DB (Ref)** | `organization_id` | UUID | Foreign Key in patient/provider tables |

### Mapping Table: `organizations`

The `organizations` table in Postgres acts as the bridge:

```sql
-- packages/database/src/schema/organizations.ts
clerkOrgId: text('clerk_org_id').notNull().unique(), -- Bridges to Clerk
slug: text('slug').notNull().unique(),               -- Bridges to Zenthea URL slug
id: uuid('id').primaryKey().defaultRandom(),         -- Bridge to all other Postgres tables
```

## 2. Transition Plan (Convex → Postgres)

During the migration (Phase C), we must ensure every record is correctly associated with its new UUID parent.

### Step 1: Organization Creation
When a clinic is migrated:
1.  A corresponding Clerk Organization is created (manually or via script).
2.  The Clerk Webhook handler syncs this to the Postgres `organizations` table.
3.  The Postgres `organizations` record now has a UUID `id` and the `clerkOrgId`.

### Step 2: Data Import Mapping
When importing tables (e.g., `patients`), the migration script must:
1.  Look up the `organizations.id` (UUID) using the legacy `tenants.slug` or `clerkOrgId`.
2.  Populate the `organization_id` column with that UUID.

## 3. Runtime Resolution

StartKit's `@startkit/auth` and `@startkit/database` handle the runtime mapping automatically.

### Identity Flow
1.  **Clerk Auth**: User signs in and selects an organization.
2.  **Middleware**: `clerkMiddleware` extracts `orgId` (Clerk's string ID).
3.  **Auth Utility**: `getServerAuth()` fetches the full organization record from the database using `clerkOrgId`.
4.  **Database Context**: The internal UUID `organizations.id` is passed to `withTenant({ organizationId: ... })`.
5.  **RLS**: Postgres RLS policies see the UUID in `app.current_org_id` and filter all queries.

## 4. Multi-Tenant Guardrails

### Cross-Tenant Safety
*   **Rule**: Never use the Clerk `org_id` (string) directly in business logic tables. Always use the internal UUID `organization_id`.
*   **Reasoning**: Decouples the database schema from the auth provider's ID format and ensures consistency with StartKit's RLS implementation.

### Implementation Checklist for T09
- [ ] **Database Schema**: Ensure all Zenthea tables (Patients, Appointments, etc.) are defined in the app-local schema with an `organization_id` column of type `uuid`.
- [ ] **RLS Setup**: Apply RLS policies to these new tables using the standard StartKit pattern:
    ```sql
    CREATE POLICY tenant_isolation_policy ON patients
    USING (organization_id = (select current_setting('app.current_org_id')::uuid));
    ```
- [ ] **Sync Verification**: Verify the `handleOrgCreated` webhook handler correctly populates the `organizations` table.

## 5. Metadata Enrichment

To preserve Zenthea's legacy `tenantId` (the string like `clinic-123`) if needed for external system compatibility, we will store it in the `organizations.settings` JSONB field:

```json
{
  "settings": {
    "legacyTenantId": "clinic-123",
    "timezone": "America/New_York"
  }
}
```

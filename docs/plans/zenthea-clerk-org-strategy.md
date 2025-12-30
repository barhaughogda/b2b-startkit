# Zenthea Clerk Organization & Role Strategy

This document outlines the strategy for using Clerk Organizations and Roles to manage multi-tenancy and access control in Zenthea, as part of the migration from Convex/NextAuth to AWS/Clerk/StartKit.

## Core Concepts

1. **Tenant = Clerk Organization**: Each clinic or business entity in Zenthea is mapped to exactly one Clerk Organization.
2. **User = Clerk User**: Users are global across Clerk but belong to one or more Clerk Organizations.
3. **Roles = Clerk Org Roles**: Each user has a specific role within an organization that determines their base level of access.

## Role Mapping

We will map Zenthea's existing roles to Clerk's default roles to minimize customization of Clerk's dashboard while preserving Zenthea's logic.

| Zenthea Role | Clerk Role | Description |
|--------------|------------|-------------|
| `owner`      | `org:admin` | Full access to the organization, billing, and member management. |
| `admin`      | `org:admin` | Administrative access to clinic settings and member management. |
| `provider`   | `org:member`| Standard clinical access (can see patients, appointments, etc.). |
| `clinic_user`| `org:member`| Non-clinical staff with access to scheduling and admin tasks. |
| `super_admin`| (Special)   | Platform-wide administrators. Handled via Clerk `publicMetadata` on the User object (e.g., `{ isSuperadmin: true }`). |

### Why `org:admin` for both `owner` and `admin`?
Clerk's `org:admin` role provides the necessary permissions for member management in the Clerk dashboard. We will distinguish between `owner` and `admin` within Zenthea using a `isOwner` flag in the organization membership metadata if necessary, or by checking specific permissions.

## Permissions Strategy

Zenthea uses a hierarchical `PermissionTree`. Instead of trying to replicate this complex tree using Clerk's flat "Permissions" feature, we will use a hybrid approach:

1. **Base Access**: Determined by the Clerk Role (`org:admin` vs `org:member`).
2. **Fine-grained Permissions**: The `PermissionTree` for a user's membership will be stored in Clerk's **Organization Membership Metadata**.
3. **Data Isolation**: Enforced by the `organization_id` (Clerk's `org_id`) in all database queries and Postgres RLS.

### Organization Membership Metadata Structure

When a user is added to an organization, we will store their Zenthea-specific permissions in Clerk's `publicMetadata` or `privateMetadata` for that membership.

```json
{
  "role": "clinic_user", // The Zenthea-specific sub-role
  "permissions": {
    "patients": {
      "enabled": true,
      "features": {
        "create": true,
        "list": {
          "enabled": true,
          "viewScope": "department"
        }
      }
    }
    // ... rest of the PermissionTree
  },
  "departments": ["dept_123", "dept_456"],
  "isOwner": false
}
```

## Multi-Clinic Users

A user (e.g., a provider) can belong to multiple Clerk Organizations. Clerk's `auth()` helper will provide the `orgId` and `orgRole` for the *currently active* organization context. Zenthea's UI will use Clerk's `<OrganizationSwitcher />` to allow users to switch between clinics.

## Implementation Steps (Clerk Dashboard)

For **T07**, the Human owner should perform the following in the Clerk Dashboard for each environment (Dev, Staging, Prod):

### 1. Enable Organizations
- Go to **Organization Settings** -> **General**.
- Toggle **Organizations** to **Enabled**.
- Enable **Allow users to create organizations** (optional, depending on Zenthea's self-serve model).

### 2. Configure Organization Roles (Optional Hardening)
- While we use default roles, you can create custom roles in Clerk if you want to enforce strict role-based access at the Clerk layer (e.g., a specific `provider` role).
- **Recommendation**: Stick to `admin` and `member` initially and use metadata for sub-roles.

### 3. Setup Webhooks
- Go to **Webhooks**.
- Add an endpoint for `https://[your-domain]/api/webhooks/clerk`.
- Subscribe to:
  - `user.created`
  - `user.updated`
  - `user.deleted`
  - `organization.created`
  - `organization.updated`
  - `organization.deleted`
  - `organizationMembership.created`
  - `organizationMembership.updated`
  - `organizationMembership.deleted`

### 4. Collect API Keys
- Go to **API Keys**.
- Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
- Store them in AWS Secrets Manager or `.env.local` (for Dev).

## Environment Strategy

| Environment | Clerk Instance | Domain / Redirects |
|-------------|----------------|-------------------|
| **Dev**     | Development    | `localhost:3000` |
| **Staging** | Production (Test Mode) | `staging.zenthea.ai` |
| **Prod**    | Production     | `app.zenthea.ai` |

## RBAC Integration (StartKit)

Zenthea will use `@startkit/auth`'s `getServerAuth()` and `@startkit/rbac`'s `can()` utilities.

```typescript
// Example: Checking permission in a Zenthea Server Component
const { userId, orgId, orgRole, membership } = await auth();
const permissions = membership.publicMetadata.permissions as PermissionTree;

if (!hasPermission(permissions, 'patients.features.create')) {
  redirect('/unauthorized');
}
```

## Security & HIPAA

- **Encryption**: Clerk handles encryption of user identity and PII in their systems (BAA required).
- **Audit Logs**: Clerk provides audit logs for auth events (sign-in, org changes). Zenthea will also capture application-level audit logs in the database, keyed by `organization_id`.
- **Session Security**: Use Clerk's recommended session settings (short-lived JWTs, CSRF protection).

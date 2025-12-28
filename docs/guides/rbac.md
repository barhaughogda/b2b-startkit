# RBAC Guide

This guide explains how to use the role-based access control (RBAC) system in StartKit.

## Overview

StartKit provides a flexible RBAC system with:
- **Roles**: Predefined roles (viewer, member, admin, owner) with bundled permissions
- **Permissions**: Fine-grained permissions for resources and actions
- **Feature Flags**: Plan-based and custom feature flags
- **Custom Permissions**: Override permissions per user

## Roles

### Role Hierarchy

Roles are hierarchical, with higher roles inheriting permissions from lower roles:

```
owner (level 100)
  └─ admin (level 50)
      └─ member (level 10)
          └─ viewer (level 1)
```

### Default Roles

#### Viewer (Level 1)

Read-only access to organization resources.

**Permissions:**
- `read:project`
- `read:team`
- `read:settings`

**Use Case**: Stakeholders who need visibility but don't need to make changes.

#### Member (Level 10)

Standard team member with read and limited write access.

**Permissions:**
- All viewer permissions
- `create:project`
- `update:project`
- `update:profile`

**Use Case**: Regular team members who create and edit content.

#### Admin (Level 50)

Administrator with team management and most settings access.

**Permissions:**
- All member permissions
- `create:member`
- `update:member`
- `delete:member`
- `invite:member`
- `update:settings`
- `delete:project`
- `create:api_key`
- `delete:api_key`

**Use Case**: Team leads who manage members and settings.

#### Owner (Level 100)

Full access including billing and danger zone operations.

**Permissions:**
- All admin permissions
- `read:billing`
- `update:billing`
- `manage:subscription`
- `delete:organization`
- `transfer:ownership`
- `create:admin`
- `delete:admin`

**Use Case**: Organization founders or primary administrators.

## Using Permissions

### Check Permissions

```typescript
import { can } from '@startkit/rbac'
import { getServerAuth } from '@startkit/auth'

// In API route or server action
const { user, organization } = await getServerAuth()

const ctx = {
  role: organization.role, // 'owner' | 'admin' | 'member' | 'viewer'
  customPermissions: user.customPermissions || [],
  plan: organization.subscription?.plan || 'free',
  isSuperadmin: user.isSuperadmin || false,
  featureFlags: new Map(), // Load from database if needed
}

if (!can(ctx, 'create:project')) {
  throw new Error('Insufficient permissions')
}

// Proceed with creating project
```

### Require Permission (Throws Error)

```typescript
import { requirePermission } from '@startkit/rbac'

// Throws PermissionDeniedError if not allowed
requirePermission(ctx, 'delete:organization')

// Safe to proceed
await deleteOrganization(orgId)
```

### Check Multiple Permissions

```typescript
import { canAll, canAny } from '@startkit/rbac'

// All permissions required
if (canAll(ctx, ['read:project', 'update:project'])) {
  // User can both read and update
}

// Any permission sufficient
if (canAny(ctx, ['read:project', 'read:team'])) {
  // User can read projects OR teams
}
```

## Permission Context

The permission context includes:

```typescript
interface PermissionContext {
  role: OrganizationRole           // User's role in organization
  customPermissions: Permission[] // Custom permissions granted
  plan: PlanTier                  // Organization's subscription plan
  isSuperadmin: boolean          // Global superadmin status
  featureFlags: Map<FeatureFlagKey, boolean> // Active feature flags
}
```

### Building Context

```typescript
import { getServerAuth } from '@startkit/auth'
import { loadOrganizationFeatureFlags } from '@startkit/rbac'

const { user, organization } = await getServerAuth()

const featureFlags = await loadOrganizationFeatureFlags(
  organization.id,
  organization.subscription?.plan || 'free'
)

const ctx = {
  role: organization.role,
  customPermissions: user.customPermissions || [],
  plan: organization.subscription?.plan || 'free',
  isSuperadmin: user.isSuperadmin || false,
  featureFlags,
}
```

## Feature Flags

### Plan-Based Flags

Feature flags are automatically enabled based on subscription plan:

```typescript
// Free plan: No flags
// Starter plan: basic_analytics, email_support
// Pro plan: All starter + advanced_analytics, priority_support, api_access
// Enterprise: All pro + sso, audit_logs, custom_integrations, dedicated_support
```

### Check Feature Flags

```typescript
import { hasFeature } from '@startkit/rbac'

if (!hasFeature(ctx, 'api_access')) {
  return <UpgradePrompt feature="API Access" />
}

// Show API features
```

### Custom Feature Flags

Set custom feature flags per organization:

```typescript
import { setFeatureFlag } from '@startkit/rbac'

// Enable beta feature for specific org
await setFeatureFlag(organizationId, 'beta_feature', true)
```

## Adding Custom Permissions

### Define New Permission

Add to `packages/config/src/types.ts`:

```typescript
export type Permission =
  | 'read:project'
  | 'create:project'
  | 'update:project'
  | 'delete:project'
  | 'custom:permission' // Add your custom permission
```

### Assign to Role

Update role definition in `packages/rbac/src/roles.ts`:

```typescript
export const ROLES: Record<OrganizationRole, RoleDefinition> = {
  member: {
    // ...
    permissions: [
      'create:project',
      'custom:permission', // Add to member role
    ],
  },
}
```

### Use in Code

```typescript
if (!can(ctx, 'custom:permission')) {
  throw new Error('Permission denied')
}
```

## Custom Permissions Per User

Grant custom permissions to specific users:

```typescript
// In database
await db.update(users).set({
  customPermissions: ['custom:permission'],
}).where(eq(users.id, userId))

// In permission check
const ctx = {
  // ...
  customPermissions: user.customPermissions || [], // Includes custom permission
}
```

## Role Management

### Check Role Level

```typescript
import { isRoleAtLeast } from '@startkit/rbac'

// Check if user is at least admin
if (isRoleAtLeast(ctx.role, 'admin')) {
  // User is admin or owner
}
```

### Get Role Permissions

```typescript
import { getRolePermissions } from '@startkit/rbac'

const permissions = getRolePermissions('admin')
// Returns all permissions for admin role (including inherited)
```

## React Components

### Permission Guard Component

```typescript
'use client'

import { can } from '@startkit/rbac'
import { useAuth } from '@startkit/auth'

export function PermissionGuard({
  permission,
  children,
  fallback,
}: {
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { user, organization } = useAuth()

  const ctx = {
    role: organization.role,
    customPermissions: user.customPermissions || [],
    plan: organization.subscription?.plan || 'free',
    isSuperadmin: user.isSuperadmin || false,
    featureFlags: new Map(), // Load from context if available
  }

  if (!can(ctx, permission)) {
    return fallback || null
  }

  return <>{children}</>
}
```

### Usage

```typescript
<PermissionGuard
  permission="delete:project"
  fallback={<div>You don't have permission to delete projects</div>}
>
  <DeleteButton />
</PermissionGuard>
```

## Feature Flag Component

```typescript
'use client'

import { hasFeature } from '@startkit/rbac'

export function FeatureFlag({
  flag,
  children,
  fallback,
}: {
  flag: FeatureFlagKey
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { organization } = useAuth()

  const ctx = {
    role: organization.role,
    customPermissions: [],
    plan: organization.subscription?.plan || 'free',
    isSuperadmin: false,
    featureFlags: organization.featureFlags || new Map(),
  }

  if (!hasFeature(ctx, flag)) {
    return fallback || null
  }

  return <>{children}</>
}
```

### Usage

```typescript
<FeatureFlag flag="api_access" fallback={<UpgradePrompt />}>
  <ApiDashboard />
</FeatureFlag>
```

## Best Practices

### 1. Always Check Permissions Before Mutations

```typescript
// ✅ CORRECT
if (!can(ctx, 'delete:project')) {
  throw new ForbiddenError('Cannot delete project')
}
await deleteProject(id)

// ❌ WRONG - No permission check
await deleteProject(id)
```

### 2. Use Permission Context Consistently

Build the context once and reuse:

```typescript
// Build context
const ctx = await buildPermissionContext(user, organization)

// Use throughout function
if (!can(ctx, 'read:project')) return
if (!can(ctx, 'update:project')) return
```

### 3. Check Permissions Server-Side

Client-side checks are for UX only. Always verify server-side:

```typescript
// Client (UX only)
{can(ctx, 'delete:project') && <DeleteButton />}

// Server (Security)
if (!can(ctx, 'delete:project')) {
  throw new ForbiddenError()
}
```

### 4. Log Permission Denials

```typescript
if (!can(ctx, permission)) {
  await logAuditEvent({
    action: 'permission.denied',
    resourceType: 'project',
    permission,
    userId: ctx.userId,
  })
  throw new ForbiddenError()
}
```

### 5. Use Feature Flags for Plan Gating

```typescript
// ✅ CORRECT - Use feature flags
if (!hasFeature(ctx, 'api_access')) {
  return <UpgradePrompt />
}

// ❌ WRONG - Don't check plan directly
if (ctx.plan !== 'pro') {
  return <UpgradePrompt />
}
```

## Common Patterns

### Admin-Only Actions

```typescript
if (!isRoleAtLeast(ctx.role, 'admin')) {
  throw new ForbiddenError('Admin access required')
}
```

### Owner-Only Actions

```typescript
if (ctx.role !== 'owner') {
  throw new ForbiddenError('Owner access required')
}
```

### Plan-Based Features

```typescript
if (!hasFeature(ctx, 'advanced_analytics')) {
  return <UpgradePrompt feature="Advanced Analytics" />
}
```

## Troubleshooting

### "Permission denied" but user has role

- Check role is correctly assigned in database
- Verify permission context includes role
- Check custom permissions aren't overriding

### Feature flag not working

- Verify flag is enabled for organization's plan
- Check feature flags are loaded in context
- Ensure flag key matches exactly (case-sensitive)

### Role hierarchy not working

- Verify `getRolePermissions` includes inherited permissions
- Check role level is correct in role definition
- Ensure permission check uses `can()` not direct role check

## Related Documentation

- [Getting Started Guide](./getting-started.md) - Initial setup
- [Database Guide](./database-migrations.md) - Database schema
- [Auth Guide](./auth.md) - Authentication (if exists)

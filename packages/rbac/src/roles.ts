import type { Permission, OrganizationRole } from '@startkit/config'
import type { RoleDefinition } from './types'

/**
 * Role definitions with their bundled permissions
 *
 * @ai-context Roles are hierarchical:
 * owner > admin > member > viewer
 *
 * Higher roles inherit all permissions from lower roles.
 */
export const ROLES: Record<OrganizationRole, RoleDefinition> = {
  viewer: {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to organization resources',
    level: 1,
    permissions: [
      // Read access only
      'read:project',
      'read:team',
      'read:settings',
    ],
  },

  member: {
    name: 'member',
    displayName: 'Member',
    description: 'Standard team member with read and limited write access',
    level: 10,
    permissions: [
      // Inherits viewer permissions (handled in getRolePermissions)
      // Limited write
      'create:project',
      'update:project',
      'update:profile',
    ],
  },

  admin: {
    name: 'admin',
    displayName: 'Admin',
    description: 'Administrator with team management and most settings access',
    level: 50,
    permissions: [
      // Inherits member permissions (handled in getRolePermissions)
      // Team management
      'create:member',
      'update:member',
      'delete:member',
      'invite:member',
      // Settings
      'update:settings',
      // Project management
      'delete:project',
      // API keys
      'create:api_key',
      'delete:api_key',
    ],
  },

  owner: {
    name: 'owner',
    displayName: 'Owner',
    description: 'Full access including billing and danger zone',
    level: 100,
    permissions: [
      // Inherits admin permissions (handled in getRolePermissions)
      // Billing
      'read:billing',
      'update:billing',
      'manage:subscription',
      // Danger zone
      'delete:organization',
      'transfer:ownership',
      // Admin management
      'create:admin',
      'delete:admin',
    ],
  },
}

/**
 * Permission cache to avoid recalculating role permissions
 * Key: role, Value: Permission[]
 */
const rolePermissionsCache = new Map<OrganizationRole, Permission[]>()

/**
 * Clear the role permissions cache (useful for testing or when roles change)
 */
export function clearRolePermissionsCache(): void {
  rolePermissionsCache.clear()
}

/**
 * Get all permissions for a role (including inherited permissions)
 * Results are cached for performance.
 */
export function getRolePermissions(role: OrganizationRole): Permission[] {
  // Check cache first
  const cached = rolePermissionsCache.get(role)
  if (cached) {
    return cached
  }

  const permissions = new Set<Permission>()

  // Add permissions from all roles at or below this level
  const roleLevel = ROLES[role].level
  for (const [, definition] of Object.entries(ROLES)) {
    if (definition.level <= roleLevel) {
      for (const permission of definition.permissions) {
        permissions.add(permission as Permission)
      }
    }
  }

  const result = Array.from(permissions)
  // Cache the result
  rolePermissionsCache.set(role, result)
  return result
}

/**
 * Check if roleA is at least as privileged as roleB
 */
export function isRoleAtLeast(roleA: OrganizationRole, roleB: OrganizationRole): boolean {
  return ROLES[roleA].level >= ROLES[roleB].level
}

/**
 * Get the next higher role (for upgrades)
 */
export function getNextRole(role: OrganizationRole): OrganizationRole | null {
  const currentLevel = ROLES[role].level
  let nextRole: OrganizationRole | null = null
  let nextLevel = Infinity

  for (const [name, definition] of Object.entries(ROLES)) {
    if (definition.level > currentLevel && definition.level < nextLevel) {
      nextRole = name as OrganizationRole
      nextLevel = definition.level
    }
  }

  return nextRole
}

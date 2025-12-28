import type { Permission } from '@startkit/config'
import type { PermissionContext } from './types'
import { getRolePermissions } from './roles'

/**
 * Permission cache to avoid recalculating role permissions
 * Key: role, Value: Permission[]
 */
const rolePermissionsCache = new Map<string, Permission[]>()

/**
 * Clear the permission cache (useful for testing or when roles change)
 */
export function clearPermissionCache(): void {
  rolePermissionsCache.clear()
}

/**
 * Check if user has a specific permission
 *
 * @example
 * if (!can(ctx, 'delete:project')) {
 *   throw new ForbiddenError('Cannot delete project')
 * }
 *
 * @ai-context Always use this before mutations.
 * Superadmins bypass all checks (with audit logging).
 */
export function can(ctx: PermissionContext, permission: Permission): boolean {
  // Superadmins can do anything
  if (ctx.isSuperadmin) {
    return true
  }

  // Check custom permissions first (can grant or deny)
  if (ctx.customPermissions.includes(permission)) {
    return true
  }

  // Check role permissions (with caching)
  const rolePermissions = getRolePermissions(ctx.role)
  return rolePermissions.includes(permission)
}

/**
 * Check if user has ALL of the specified permissions
 */
export function canAll(ctx: PermissionContext, permissions: Permission[]): boolean {
  return permissions.every((p) => can(ctx, p))
}

/**
 * Check if user has ANY of the specified permissions
 */
export function canAny(ctx: PermissionContext, permissions: Permission[]): boolean {
  return permissions.some((p) => can(ctx, p))
}

/**
 * Require a permission or throw
 *
 * @throws {PermissionDeniedError}
 */
export function requirePermission(ctx: PermissionContext, permission: Permission): void {
  if (!can(ctx, permission)) {
    throw new PermissionDeniedError(permission)
  }
}

/**
 * Require all permissions or throw
 *
 * @throws {PermissionDeniedError}
 */
export function requireAllPermissions(ctx: PermissionContext, permissions: Permission[]): void {
  for (const permission of permissions) {
    if (!can(ctx, permission)) {
      throw new PermissionDeniedError(permission)
    }
  }
}

/**
 * Error thrown when permission is denied
 */
export class PermissionDeniedError extends Error {
  public readonly permission: Permission
  public readonly code = 'PERMISSION_DENIED'

  constructor(permission: Permission) {
    super(`Permission denied: ${permission}`)
    this.name = 'PermissionDeniedError'
    this.permission = permission
  }
}

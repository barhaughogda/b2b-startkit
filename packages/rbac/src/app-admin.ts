import type { Permission } from '@startkit/config'
import type { PermissionContext } from './types'

/**
 * App admin permissions
 * 
 * These permissions are granted to users with isAppAdmin = true
 * in the organization_members table. App admins have elevated
 * permissions within a single product, but not platform-wide.
 * 
 * @ai-context App admins are product-level administrators,
 * separate from platform superadmins.
 */
export const APP_ADMIN_PERMISSIONS: Permission[] = [
  // User management
  'read:users',
  'impersonate:user',
  'update:user',
  'deactivate:user',
  
  // Organization management
  'read:organizations',
  'suspend:organization',
  'unsuspend:organization',
  
  // Subscription management
  'read:subscriptions',
  'update:subscription',
  'cancel:subscription',
  
  // Feature flags
  'read:feature_flags',
  'update:feature_flags',
  
  // Activity logs
  'read:activity_logs',
  
  // Kill switches (app-level only)
  'read:kill_switches',
  'update:kill_switches',
  
  // Settings
  'read:app_settings',
  'update:app_settings',
]

/**
 * Check if user is an app admin
 * 
 * App admins have elevated permissions within the product.
 * Platform superadmins are also considered app admins.
 */
export function isAppAdmin(ctx: PermissionContext): boolean {
  return ctx.isSuperadmin || ctx.isAppAdmin === true
}

/**
 * Check if user has app admin permission
 * 
 * This checks if the user is an app admin and if the permission
 * is included in the app admin permission set.
 */
export function canAsAppAdmin(ctx: PermissionContext, permission: Permission): boolean {
  if (!isAppAdmin(ctx)) {
    return false
  }
  
  return APP_ADMIN_PERMISSIONS.includes(permission)
}

/**
 * Require app admin access or throw
 * 
 * @throws {AppAdminRequiredError}
 */
export function requireAppAdmin(ctx: PermissionContext): void {
  if (!isAppAdmin(ctx)) {
    throw new AppAdminRequiredError()
  }
}

/**
 * Error thrown when app admin access is required
 */
export class AppAdminRequiredError extends Error {
  public readonly code = 'APP_ADMIN_REQUIRED'

  constructor() {
    super('App admin access required')
    this.name = 'AppAdminRequiredError'
  }
}

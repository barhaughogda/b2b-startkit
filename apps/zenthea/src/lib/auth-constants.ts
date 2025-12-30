/**
 * Authentication and authorization constants
 * Shared constants for role-based access control across the application
 */

/**
 * Maps user roles to their allowed path prefixes
 * Used for validating callbackUrl redirects and role-based routing
 */
export const ROLE_PATH_MAP: Record<string, string[]> = {
  admin: ['/company'],
  provider: ['/company'],
  patient: ['/patient', '/clinic'], // Allow /clinic for public booking flow redirect
  demo: ['/demo'],
  super_admin: ['/superadmin'],
  clinic_user: ['/company'],
} as const

/**
 * Maps user roles to their default dashboard routes
 * Used for role-based redirects after login
 */
export const ROLE_DASHBOARD_MAP: Record<string, string> = {
  admin: '/company/dashboard',
  provider: '/company/today',
  patient: '/patient/calendar?tab=today',
  demo: '/demo/dashboard',
  super_admin: '/superadmin',
  clinic_user: '/company/calendar',
} as const

/**
 * Check if a path is allowed for a given role.
 * Validates that the path matches one of the allowed path prefixes for the role.
 */
export function isPathAllowedForRole(path: string, role: string): boolean {
  const allowedPaths = ROLE_PATH_MAP[role] || []
  return allowedPaths.some(allowedPath => path.startsWith(allowedPath))
}

/**
 * Get the default dashboard route for a role
 */
export function getDashboardForRole(role: string): string {
  return ROLE_DASHBOARD_MAP[role] || '/dashboard'
}

/**
 * Delay to wait for cookie propagation to middleware (in milliseconds)
 */
export const COOKIE_PROPAGATION_DELAY = 1000 // ms

/**
 * Maximum age for the just-logged-in cookie flag (in seconds)
 */
export const JUST_LOGGED_IN_COOKIE_MAX_AGE = 10 * 60 // 10 minutes (600 seconds)

/**
 * Authentication and authorization constants
 * Shared constants for role-based access control across the application
 */

/**
 * NextAuth session token cookie name
 * Must match the cookie name defined in authOptions.cookies.sessionToken.name
 */
export const NEXTAUTH_SESSION_COOKIE_NAME = 'next-auth.session-token';

/**
 * NextAuth callback URL cookie name
 * Must match the cookie name defined in authOptions.cookies.callbackUrl.name
 */
export const NEXTAUTH_CALLBACK_URL_COOKIE_NAME = 'next-auth.callback-url';

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
 * 
 * @param path - The path to validate (e.g., '/admin/dashboard')
 * @param role - The user role to check against (e.g., 'admin', 'provider', 'patient')
 * @returns true if the path is allowed for the role, false otherwise
 * 
 * @example
 * ```typescript
 * isPathAllowedForRole('/admin/dashboard', 'admin') // Returns true
 * isPathAllowedForRole('/provider/today', 'admin') // Returns false
 * isPathAllowedForRole('/patient/profile', 'patient') // Returns true
 * ```
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
 * Session verification delays for exponential backoff (in milliseconds)
 * Used when checking if session is available after login
 */
export const SESSION_VERIFICATION_DELAYS = [100, 200, 300, 500] as const

/**
 * Delay to wait for cookie propagation to middleware (in milliseconds)
 * This ensures session cookies are available to Edge Runtime before redirect
 */
export const COOKIE_PROPAGATION_DELAY = 1000 // ms

/**
 * Maximum age for the just-logged-in cookie flag (in seconds)
 * This flag helps middleware handle post-login redirect race conditions where
 * the NextAuth session cookie hasn't propagated to Vercel Edge Runtime yet.
 * 
 * Set to 10 minutes (600 seconds) to account for Vercel Edge Runtime delays.
 * This is a temporary grace period - once the session token is available in Edge Runtime,
 * the middleware will use that instead. The actual session lasts 24 hours.
 * 
 * Security: This cookie is only set after successful authentication and is only
 * honored when the session token is null (not yet available in Edge Runtime).
 */
export const JUST_LOGGED_IN_COOKIE_MAX_AGE = 10 * 60 // 10 minutes (600 seconds)

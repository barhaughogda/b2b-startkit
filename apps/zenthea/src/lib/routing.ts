/**
 * Routing utilities for pathname checking
 */

/**
 * Checks if a pathname is a public authentication route
 * where unauthenticated users should not see certain UI elements
 * (e.g., ElevenLabs widget)
 */
export function isPublicAuthRoute(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  const publicRoutes = [
    '/',
    '/landing',
    '/patient/login',
    '/patient/register',
  ] as const;

  return publicRoutes.includes(pathname as typeof publicRoutes[number]) || 
         pathname.startsWith('/auth/');
}


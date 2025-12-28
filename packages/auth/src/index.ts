/**
 * @startkit/auth
 *
 * Clerk authentication integration for StartKit products.
 * Provides user authentication, organization management, and session handling.
 *
 * @ai-context This package provides:
 * - Auth middleware for protecting routes
 * - Hooks for accessing user and organization data
 * - Server-side auth utilities (import from @startkit/auth/server)
 * - Superadmin detection and impersonation
 *
 * @ai-no-modify Core auth logic - changes require security review
 */

// Re-export Clerk components for convenience (client-safe)
export {
  ClerkProvider,
  SignIn,
  SignUp,
  SignedIn,
  SignedOut,
  UserButton,
  OrganizationSwitcher,
  CreateOrganization,
} from '@clerk/nextjs'

// Custom hooks and utilities (client-safe)
export { useAuth } from './hooks/use-auth'
export { useOrganization } from './hooks/use-organization'

// Components (client-safe)
export { ImpersonationBanner } from './components/impersonation-banner'

// Types (client-safe)
export type { AuthContext, OrganizationContext } from './types'

// NOTE: Server utilities are in @startkit/auth/server
// Import like: import { getServerAuth } from '@startkit/auth/server'

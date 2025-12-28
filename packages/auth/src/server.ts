import { auth, currentUser } from '@clerk/nextjs/server'
import type { AuthContext, OrganizationContext, RequestAuthContext } from './types'

/**
 * Get authentication context on the server
 * Returns null if user is not authenticated
 *
 * @example
 * const authContext = await getServerAuth()
 * if (!authContext) redirect('/sign-in')
 */
export async function getServerAuth(): Promise<RequestAuthContext | null> {
  const { userId, orgId, orgRole } = await auth()

  if (!userId) {
    return null
  }

  const user = await currentUser()
  if (!user) {
    return null
  }

  // Check for superadmin in public metadata
  const isSuperadmin = (user.publicMetadata?.role as string) === 'superadmin'

  // Check for impersonation
  const isImpersonating = !!(user.publicMetadata?.impersonatedBy as string)
  const impersonatorId = (user.publicMetadata?.impersonatedBy as string) || null

  const authContext: AuthContext = {
    userId: user.id, // TODO: Map to internal ID from database
    clerkUserId: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? '',
    name: user.fullName,
    avatarUrl: user.imageUrl,
    isSuperadmin,
    isImpersonating,
    impersonatorId,
  }

  let organizationContext: OrganizationContext | null = null

  if (orgId) {
    // TODO: Fetch organization details from database
    organizationContext = {
      organizationId: orgId, // TODO: Map to internal ID
      clerkOrgId: orgId,
      name: '', // TODO: Fetch from org
      slug: '', // TODO: Fetch from org
      role: (orgRole as 'owner' | 'admin' | 'member') ?? 'member',
      plan: 'free', // TODO: Fetch from subscription
    }
  }

  return {
    user: authContext,
    organization: organizationContext,
  }
}

/**
 * Require authentication - throws if not authenticated
 * Use in server components and API routes
 *
 * @throws {Error} If user is not authenticated
 */
export async function requireAuth(): Promise<RequestAuthContext> {
  const context = await getServerAuth()

  if (!context) {
    throw new Error('Authentication required')
  }

  return context
}

/**
 * Require organization context - throws if not in an organization
 *
 * @throws {Error} If user is not in an organization
 */
export async function requireOrganization(): Promise<
  RequestAuthContext & { organization: OrganizationContext }
> {
  const context = await requireAuth()

  if (!context.organization) {
    throw new Error('Organization context required')
  }

  return context as RequestAuthContext & { organization: OrganizationContext }
}

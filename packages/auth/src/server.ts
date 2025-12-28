import { auth, currentUser } from '@clerk/nextjs/server'
import { eq, and } from 'drizzle-orm'
import { superadminDb } from '@startkit/database'
import { users, organizations, organizationMembers } from '@startkit/database/schema'
import type { AuthContext, OrganizationContext, RequestAuthContext } from './types'
import type { OrganizationRole } from '@startkit/config'

/**
 * Get authentication context on the server
 * Returns null if user is not authenticated
 *
 * Fetches user and organization data from database and maps Clerk IDs to internal IDs.
 *
 * @example
 * const authContext = await getServerAuth()
 * if (!authContext) redirect('/sign-in')
 */
export async function getServerAuth(): Promise<RequestAuthContext | null> {
  const { userId: clerkUserId, orgId: clerkOrgId, orgRole } = await auth()

  if (!clerkUserId) {
    return null
  }

  const clerkUser = await currentUser()
  if (!clerkUser) {
    return null
  }

  // Fetch user from database
  const [dbUser] = await superadminDb
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1)

  if (!dbUser) {
    // User not synced yet - webhook may not have fired
    // Return null to trigger sign-in flow
    return null
  }

  // Check for superadmin in database (source of truth)
  const isSuperadmin = dbUser.isSuperadmin

  // Check for impersonation in Clerk metadata
  const isImpersonating = !!(clerkUser.publicMetadata?.impersonatedBy as string)
  const impersonatorClerkId = (clerkUser.publicMetadata?.impersonatedBy as string) || null
  let impersonatorId: string | null = null

  if (impersonatorClerkId) {
    const [impersonator] = await superadminDb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, impersonatorClerkId))
      .limit(1)
    impersonatorId = impersonator?.id ?? null
  }

  const authContext: AuthContext = {
    userId: dbUser.id,
    clerkUserId: clerkUser.id,
    email: dbUser.email,
    name: dbUser.name,
    avatarUrl: dbUser.avatarUrl,
    isSuperadmin,
    isImpersonating,
    impersonatorId,
  }

  let organizationContext: OrganizationContext | null = null

  if (clerkOrgId) {
    // Fetch organization from database
    const [org] = await superadminDb
      .select()
      .from(organizations)
      .where(eq(organizations.clerkOrgId, clerkOrgId))
      .limit(1)

    if (org) {
      // Fetch user's role in this organization
      const [membership] = await superadminDb
        .select({ role: organizationMembers.role })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, org.id),
            eq(organizationMembers.userId, dbUser.id)
          )
        )
        .limit(1)

      // Fallback to Clerk role if DB doesn't have it yet
      const role = (membership?.role ?? (orgRole as OrganizationRole)) ?? 'member'

      // TODO: Fetch plan from subscription table (Section 6)
      organizationContext = {
        organizationId: org.id,
        clerkOrgId: org.clerkOrgId,
        name: org.name,
        slug: org.slug,
        role,
        plan: 'free', // Will be updated when billing is implemented
      }
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

/**
 * Require a specific role in the organization
 * Throws if user doesn't have the required role or higher
 *
 * Role hierarchy: owner > admin > member
 *
 * @param requiredRole - Minimum role required
 * @throws {Error} If user doesn't have required role
 *
 * @example
 * const ctx = await requireRole('admin')
 * // User must be admin or owner
 */
export async function requireRole(
  requiredRole: OrganizationRole
): Promise<RequestAuthContext & { organization: OrganizationContext }> {
  const context = await requireOrganization()

  const roleHierarchy: Record<OrganizationRole, number> = {
    member: 1,
    admin: 2,
    owner: 3,
  }

  const userRoleLevel = roleHierarchy[context.organization.role]
  const requiredRoleLevel = roleHierarchy[requiredRole]

  if (userRoleLevel < requiredRoleLevel) {
    throw new Error(
      `Insufficient permissions. Required role: ${requiredRole}, current role: ${context.organization.role}`
    )
  }

  return context
}

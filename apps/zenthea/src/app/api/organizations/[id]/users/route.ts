import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { superadminDb } from '@startkit/database'
import { users, organizationMembers, organizations } from '@startkit/database/schema'
import { eq, and } from 'drizzle-orm'

/**
 * GET /api/organizations/[id]/users
 * List all users in an organization
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireOrganization()
    
    // Validate UUID format for internal ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isUuid = uuidRegex.test(id)

    // Security check: must be in the same organization
    // Check against both internal ID and Clerk Org ID since frontend might use either
    if (auth.organization.organizationId !== id && auth.organization.clerkOrgId !== id && !auth.user.isSuperadmin) {
      console.warn('Forbidden access attempt to organization users:', {
        requestedId: id,
        userOrgId: auth.organization.organizationId,
        userClerkOrgId: auth.organization.clerkOrgId,
        isSuperadmin: auth.user.isSuperadmin
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use the internal UUID for the query
    let targetOrgId = auth.organization.clerkOrgId === id ? auth.organization.organizationId : id

    // If targetOrgId is not a UUID (e.g. it's a Clerk Org ID from a superadmin request),
    // we need to resolve it to the internal UUID first.
    if (!uuidRegex.test(targetOrgId)) {
      const [org] = await superadminDb
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.clerkOrgId, targetOrgId))
        .limit(1)
      
      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
      targetOrgId = org.id
    }

    const members = await superadminDb
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, targetOrgId))

    return NextResponse.json(members)
  } catch (error: any) {
    console.error('Error fetching organization users:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

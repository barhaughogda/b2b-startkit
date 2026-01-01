import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { superadminDb } from '@startkit/database'
import { users, organizationMembers } from '@startkit/database/schema'
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
    
    // Security check: must be in the same organization
    if (auth.organization.organizationId !== id && !auth.user.isSuperadmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      .where(eq(organizationMembers.organizationId, id))

    return NextResponse.json(members)
  } catch (error: any) {
    console.error('Error fetching organization users:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { CareTeamService } from '@/lib/db/services/care-team.service'

/**
 * GET /api/patients/[id]/care-team
 * Get care team for a patient
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId, isSuperadmin: user.isSuperadmin },
      async () => {
        const careTeam = await CareTeamService.getCareTeamForPatient(id, organization.organizationId)
        return NextResponse.json(careTeam)
      }
    )
  } catch (error: any) {
    console.error('Error fetching care team:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/patients/[id]/care-team
 * Add a member or change primary provider
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, ...data } = body
    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId, isSuperadmin: user.isSuperadmin },
      async () => {
        if (action === 'set_primary') {
          const result = await CareTeamService.setPrimaryProvider({
            patientId: id,
            newProviderId: data.providerId,
            reason: data.reason,
            notes: data.notes,
            changedBy: user.userId,
            organizationId: organization.organizationId,
          })
          return NextResponse.json(result)
        } else if (action === 'add_member') {
          const result = await CareTeamService.addCareTeamMember({
            patientId: id,
            userId: data.userId,
            role: data.role,
            addedBy: user.userId,
            organizationId: organization.organizationId,
          })
          return NextResponse.json(result)
        }
        
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }
    )
  } catch (error: any) {
    console.error('Error updating care team:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/patients/[id]/care-team
 * Remove a member
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const userIdToRemove = searchParams.get('userId')
    
    if (!userIdToRemove) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId, isSuperadmin: user.isSuperadmin },
      async () => {
        const result = await CareTeamService.removeCareTeamMember({
          patientId: id,
          userId: userIdToRemove,
          removedBy: user.userId,
          organizationId: organization.organizationId,
        })
        return NextResponse.json(result)
      }
    )
  } catch (error: any) {
    console.error('Error removing care team member:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

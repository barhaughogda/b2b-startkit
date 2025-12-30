import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { ClinicService } from '@/lib/db/services/clinic.service'

/**
 * GET /api/clinics/[id]
 * Get a specific clinic by ID
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const clinic = await ClinicService.getClinicById(id, organization.organizationId)
        if (!clinic) {
          return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }
        return NextResponse.json(clinic)
      }
    )
  } catch (error: any) {
    console.error('Error fetching clinic:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/clinics/[id]
 * Update a clinic record
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organization, user } = await requireOrganization()
    const body = await req.json()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const clinic = await ClinicService.updateClinic(id, body, organization.organizationId)
        if (!clinic) {
          return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }
        return NextResponse.json(clinic)
      }
    )
  } catch (error: any) {
    console.error('Error updating clinic:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/clinics/[id]
 * Delete a clinic record
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const deleted = await ClinicService.deleteClinic(id, organization.organizationId)
        if (!deleted) {
          return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true })
      }
    )
  } catch (error: any) {
    console.error('Error deleting clinic:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { PatientService } from '@/lib/db/services/patient.service'

/**
 * GET /api/patients/[id]
 * Get a specific patient by ID
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
        const patient = await PatientService.getPatientById(id, organization.organizationId)
        if (!patient) {
          return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
        }
        return NextResponse.json(patient)
      }
    )
  } catch (error: any) {
    console.error('Error fetching patient:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/patients/[id]
 * Update a patient record
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
        const patient = await PatientService.updatePatient(id, body, organization.organizationId)
        if (!patient) {
          return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
        }
        return NextResponse.json(patient)
      }
    )
  } catch (error: any) {
    console.error('Error updating patient:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/patients/[id]
 * Delete a patient record
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
        const patient = await PatientService.deletePatient(id, organization.organizationId)
        if (!patient) {
          return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true })
      }
    )
  } catch (error: any) {
    console.error('Error deleting patient:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

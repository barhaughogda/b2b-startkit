import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { PatientService } from '@/lib/db/services/patient.service'

/**
 * GET /api/patients
 * List all patients for the current organization
 */
export async function GET() {
  try {
    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const patients = await PatientService.getPatients(organization.organizationId)
        return NextResponse.json(patients)
      }
    )
  } catch (error: any) {
    console.error('Error fetching patients:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

/**
 * POST /api/patients
 * Create a new patient record
 */
export async function POST(req: Request) {
  try {
    const { organization, user } = await requireOrganization()
    const body = await req.json()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const patient = await PatientService.createPatient(body, organization.organizationId)
        return NextResponse.json(patient, { status: 201 })
      }
    )
  } catch (error: any) {
    console.error('Error creating patient:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

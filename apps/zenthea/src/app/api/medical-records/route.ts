import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { MedicalRecordService } from '@/lib/db/services/medical-record.service'

/**
 * GET /api/medical-records
 * List all medical records for a patient (query param required)
 */
export async function GET(req: Request) {
  try {
    const { organization, user } = await requireOrganization()
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ error: 'patientId query parameter is required' }, { status: 400 })
    }
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const records = await MedicalRecordService.getPatientRecords(patientId, organization.organizationId)
        return NextResponse.json(records)
      }
    )
  } catch (error: any) {
    console.error('Error fetching medical records:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/medical-records
 * Create a new medical record
 */
export async function POST(req: Request) {
  try {
    const { organization, user } = await requireOrganization()
    const body = await req.json()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const record = await MedicalRecordService.createRecord(
          body, 
          organization.organizationId, 
          user.userId
        )
        return NextResponse.json(record, { status: 201 })
      }
    )
  } catch (error: any) {
    console.error('Error creating medical record:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { MedicalRecordService } from '@/lib/db/services/medical-record.service'

/**
 * GET /api/medical-records/[id]
 * Get a specific medical record by ID
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
        const record = await MedicalRecordService.getRecordById(id, organization.organizationId)
        if (!record) {
          return NextResponse.json({ error: 'Medical record not found' }, { status: 404 })
        }
        return NextResponse.json(record)
      }
    )
  } catch (error: any) {
    console.error('Error fetching medical record:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/medical-records/[id]
 * Update a medical record
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
        const record = await MedicalRecordService.updateRecord(id, body, organization.organizationId)
        if (!record) {
          return NextResponse.json({ error: 'Medical record not found' }, { status: 404 })
        }
        return NextResponse.json(record)
      }
    )
  } catch (error: any) {
    console.error('Error updating medical record:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/medical-records/[id]
 * Delete a medical record
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
        const deleted = await MedicalRecordService.deleteRecord(id, organization.organizationId)
        if (!deleted) {
          return NextResponse.json({ error: 'Medical record not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true })
      }
    )
  } catch (error: any) {
    console.error('Error deleting medical record:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

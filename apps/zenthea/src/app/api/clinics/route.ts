import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { ClinicService } from '@/lib/db/services/clinic.service'

/**
 * GET /api/clinics
 * List all clinics for the current organization
 */
export async function GET() {
  try {
    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const list = await ClinicService.getClinics(organization.organizationId)
        return NextResponse.json(list)
      }
    )
  } catch (error: any) {
    console.error('Error fetching clinics:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clinics
 * Create a new clinic
 */
export async function POST(req: Request) {
  try {
    const { organization, user } = await requireOrganization()
    const body = await req.json()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const clinic = await ClinicService.createClinic(body, organization.organizationId)
        return NextResponse.json(clinic, { status: 201 })
      }
    )
  } catch (error: any) {
    console.error('Error creating clinic:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

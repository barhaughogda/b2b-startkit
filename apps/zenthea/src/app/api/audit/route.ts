import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { AuditService } from '@/lib/db/services/audit.service'

/**
 * GET /api/audit
 * List audit logs for a patient
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined

    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId, isSuperadmin: user.isSuperadmin },
      async () => {
        const logs = await AuditService.getLogs({
          organizationId: organization.organizationId,
          resourceId: patientId || undefined,
          limit,
          startDate,
          endDate,
        })
        return NextResponse.json({ logs })
      }
    )
  } catch (error: any) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

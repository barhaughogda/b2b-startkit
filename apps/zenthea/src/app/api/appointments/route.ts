import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { AppointmentService } from '@/lib/db/services/appointment.service'

/**
 * GET /api/appointments
 * List all appointments for the current organization
 */
export async function GET(req: Request) {
  try {
    const { organization, user } = await requireOrganization()
    const { searchParams } = new URL(req.url)
    
    const status = searchParams.get('status') || undefined
    const start = searchParams.get('startDate')
    const end = searchParams.get('endDate')

    const options = {
      status,
      startDate: start ? new Date(start) : undefined,
      endDate: end ? new Date(end) : undefined,
    }
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const list = await AppointmentService.getAppointments(organization.organizationId, options)
        return NextResponse.json(list)
      }
    )
  } catch (error: any) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/appointments
 * Create a new appointment
 */
export async function POST(req: Request) {
  try {
    const { organization, user } = await requireOrganization()
    const body = await req.json()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const appointment = await AppointmentService.createAppointment(
          body, 
          organization.organizationId, 
          user.userId
        )
        return NextResponse.json(appointment, { status: 201 })
      }
    )
  } catch (error: any) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

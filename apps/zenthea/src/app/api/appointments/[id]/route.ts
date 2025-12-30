import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { AppointmentService } from '@/lib/db/services/appointment.service'

/**
 * GET /api/appointments/[id]
 * Get a specific appointment by ID
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
        const appointment = await AppointmentService.getAppointmentById(id, organization.organizationId, user.userId)
        if (!appointment) {
          return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }
        return NextResponse.json(appointment)
      }
    )
  } catch (error: any) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/appointments/[id]
 * Update an appointment
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
        const appointment = await AppointmentService.updateAppointment(
          id, 
          body, 
          organization.organizationId, 
          user.userId
        )
        return NextResponse.json(appointment)
      }
    )
  } catch (error: any) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/appointments/[id]
 * Delete an appointment
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
        const deleted = await AppointmentService.deleteAppointment(id, organization.organizationId, user.userId)
        if (!deleted) {
          return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true })
      }
    )
  } catch (error: any) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

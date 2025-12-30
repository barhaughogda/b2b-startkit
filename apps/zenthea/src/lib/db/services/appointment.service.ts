import { eq, and, sql, between } from 'drizzle-orm'
import { db } from '@startkit/database'
import { appointments, appointmentMembers, patients, clinics } from '../schema'
import { users } from '@startkit/database/schema'

/**
 * Appointment Service
 * 
 * Handles all database operations for Appointments using Drizzle ORM.
 * All operations are tenant-isolated via organization_id.
 */
export class AppointmentService {
  /**
   * Get all appointments for the current organization
   * Optionally filtered by status and date range
   */
  static async getAppointments(
    organizationId: string, 
    options: { status?: string; startDate?: Date; endDate?: Date } = {}
  ) {
    let query = db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      clinicId: appointments.clinicId,
      scheduledAt: appointments.scheduledAt,
      duration: appointments.duration,
      type: appointments.type,
      status: appointments.status,
      notes: appointments.notes,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      clinicName: clinics.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(clinics, eq(appointments.clinicId, clinics.id))
    .where(eq(appointments.organizationId, organizationId))

    if (options.status && options.status !== 'all') {
      query = query.where(eq(appointments.status, options.status as any))
    }

    if (options.startDate && options.endDate) {
      query = query.where(between(appointments.scheduledAt, options.startDate, options.endDate))
    }

    return await query.orderBy(appointments.scheduledAt)
  }

  /**
   * Get a specific appointment by ID with members
   */
  static async getAppointmentById(id: string, organizationId: string) {
    const [appointment] = await db.select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.organizationId, organizationId)
        )
      )
      .limit(1)
    
    if (!appointment) return null

    const members = await db.select({
      userId: appointmentMembers.userId,
      role: appointmentMembers.role,
      status: appointmentMembers.status,
      name: users.name,
      email: users.email,
    })
    .from(appointmentMembers)
    .innerJoin(users, eq(appointmentMembers.userId, users.id))
    .where(eq(appointmentMembers.appointmentId, id))

    return {
      ...appointment,
      members
    }
  }

  /**
   * Create a new appointment
   */
  static async createAppointment(data: any, organizationId: string, createdBy: string) {
    const { members, ...appointmentData } = data

    return await db.transaction(async (tx) => {
      const [newAppointment] = await tx.insert(appointments)
        .values({
          ...appointmentData,
          organizationId,
          createdBy,
          scheduledAt: new Date(appointmentData.scheduledAt),
        })
        .returning()

      if (members && Array.isArray(members)) {
        for (const member of members) {
          await tx.insert(appointmentMembers).values({
            organizationId,
            appointmentId: newAppointment.id,
            userId: member.userId,
            role: member.role || 'attendee',
            status: 'pending',
          })
        }
      }

      return newAppointment
    })
  }

  /**
   * Update an existing appointment
   */
  static async updateAppointment(id: string, data: any, organizationId: string, modifiedBy: string) {
    const { members, ...appointmentData } = data
    
    const updatePayload: any = {
      ...appointmentData,
      lastModifiedBy: modifiedBy,
      updatedAt: new Date(),
    }

    if (appointmentData.scheduledAt) {
      updatePayload.scheduledAt = new Date(appointmentData.scheduledAt)
    }

    return await db.transaction(async (tx) => {
      const [updatedAppointment] = await tx.update(appointments)
        .set(updatePayload)
        .where(
          and(
            eq(appointments.id, id),
            eq(appointments.organizationId, organizationId)
          )
        )
        .returning()

      if (!updatedAppointment) throw new Error('Appointment not found')

      // If members are provided, sync them (simplistic implementation: clear and re-add)
      if (members && Array.isArray(members)) {
        await tx.delete(appointmentMembers).where(eq(appointmentMembers.appointmentId, id))
        for (const member of members) {
          await tx.insert(appointmentMembers).values({
            organizationId,
            appointmentId: id,
            userId: member.userId,
            role: member.role || 'attendee',
            status: member.status || 'pending',
          })
        }
      }

      return updatedAppointment
    })
  }

  /**
   * Update appointment status
   */
  static async updateStatus(id: string, status: string, organizationId: string, modifiedBy: string) {
    const [updated] = await db.update(appointments)
      .set({
        status: status as any,
        lastModifiedBy: modifiedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.organizationId, organizationId)
        )
      )
      .returning()
    
    return updated || null
  }

  /**
   * Delete an appointment
   */
  static async deleteAppointment(id: string, organizationId: string) {
    const [deleted] = await db.delete(appointments)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.organizationId, organizationId)
        )
      )
      .returning()
    
    return deleted || null
  }
}

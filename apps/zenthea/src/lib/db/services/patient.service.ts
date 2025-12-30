import { eq, and, sql } from 'drizzle-orm'
import { db } from '@startkit/database'
import { patients, patientStatusEnum } from '../schema'
import type { ZentheaSession } from '@/types'

/**
 * Patient Service
 * 
 * Handles all database operations for Patients using Drizzle ORM.
 * All operations are tenant-isolated via organization_id.
 */
export class PatientService {
  /**
   * Get all patients for the current organization
   */
  static async getPatients(organizationId: string) {
    return await db.select()
      .from(patients)
      .where(eq(patients.organizationId, organizationId))
      .orderBy(sql`${patients.lastName} ASC, ${patients.firstName} ASC`)
  }

  /**
   * Get a specific patient by ID
   */
  static async getPatientById(id: string, organizationId: string) {
    const [patient] = await db.select()
      .from(patients)
      .where(
        and(
          eq(patients.id, id),
          eq(patients.organizationId, organizationId)
        )
      )
      .limit(1)
    
    return patient || null
  }

  /**
   * Create a new patient record
   */
  static async createPatient(data: any, organizationId: string) {
    const [newPatient] = await db.insert(patients)
      .values({
        ...data,
        organizationId,
        dateOfBirth: new Date(data.dateOfBirth), // Ensure Date object
      })
      .returning()
    
    return newPatient
  }

  /**
   * Update an existing patient record
   */
  static async updatePatient(id: string, data: any, organizationId: string) {
    const updateData = { ...data };
    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }

    const [updatedPatient] = await db.update(patients)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(patients.id, id),
          eq(patients.organizationId, organizationId)
        )
      )
      .returning()
    
    return updatedPatient || null
  }

  /**
   * Soft delete (discharge) a patient or hard delete
   * Note: HIPAA usually prefers archiving/discharging over hard deletion.
   */
  static async dischargePatient(id: string, organizationId: string) {
    return await this.updatePatient(id, { status: 'discharged' }, organizationId)
  }

  /**
   * Hard delete a patient (use with caution)
   */
  static async deletePatient(id: string, organizationId: string) {
    const [deletedPatient] = await db.delete(patients)
      .where(
        and(
          eq(patients.id, id),
          eq(patients.organizationId, organizationId)
        )
      )
      .returning()
    
    return deletedPatient || null
  }
}

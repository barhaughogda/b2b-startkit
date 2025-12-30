import { eq, and } from 'drizzle-orm'
import { db } from '@startkit/database'
import { clinics } from '../schema'

/**
 * Clinic Service
 * 
 * Handles all database operations for Clinics using Drizzle ORM.
 */
export class ClinicService {
  /**
   * Get all clinics for the current organization
   */
  static async getClinics(organizationId: string) {
    return await db.select()
      .from(clinics)
      .where(eq(clinics.organizationId, organizationId))
      .orderBy(clinics.name)
  }

  /**
   * Get a specific clinic by ID
   */
  static async getClinicById(id: string, organizationId: string) {
    const [clinic] = await db.select()
      .from(clinics)
      .where(
        and(
          eq(clinics.id, id),
          eq(clinics.organizationId, organizationId)
        )
      )
      .limit(1)
    
    return clinic || null
  }

  /**
   * Create a new clinic
   */
  static async createClinic(data: any, organizationId: string) {
    const [newClinic] = await db.insert(clinics)
      .values({
        ...data,
        organizationId,
      })
      .returning()
    
    return newClinic
  }

  /**
   * Update an existing clinic
   */
  static async updateClinic(id: string, data: any, organizationId: string) {
    const [updatedClinic] = await db.update(clinics)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clinics.id, id),
          eq(clinics.organizationId, organizationId)
        )
      )
      .returning()
    
    return updatedClinic || null
  }

  /**
   * Delete a clinic
   */
  static async deleteClinic(id: string, organizationId: string) {
    const [deletedClinic] = await db.delete(clinics)
      .where(
        and(
          eq(clinics.id, id),
          eq(clinics.organizationId, organizationId)
        )
      )
      .returning()
    
    return deletedClinic || null
  }
}

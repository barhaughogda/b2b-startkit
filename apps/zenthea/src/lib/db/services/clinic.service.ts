import { eq, and } from 'drizzle-orm'
import { db, superadminDb } from '@startkit/database'
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
    // Using superadminDb to bypass RLS since organizationId is manually filtered
    // Explicitly select columns to avoid issues with missing columns if migrations are out of sync
    return await superadminDb.select({
      id: clinics.id,
      organizationId: clinics.organizationId,
      name: clinics.name,
      description: clinics.description,
      address: clinics.address,
      phone: clinics.phone,
      type: clinics.type,
      timezone: clinics.timezone,
      isActive: clinics.isActive,
      createdAt: clinics.createdAt,
      updatedAt: clinics.updatedAt,
    })
      .from(clinics)
      .where(eq(clinics.organizationId, organizationId))
      .orderBy(clinics.name)
  }

  /**
   * Get a specific clinic by ID
   */
  static async getClinicById(id: string, organizationId: string) {
    // Validate UUID format to prevent database errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!id || !uuidRegex.test(id)) return null

    // Using superadminDb to bypass RLS since organizationId is manually filtered
    const [clinic] = await superadminDb.select({
      id: clinics.id,
      organizationId: clinics.organizationId,
      name: clinics.name,
      description: clinics.description,
      address: clinics.address,
      phone: clinics.phone,
      type: clinics.type,
      timezone: clinics.timezone,
      isActive: clinics.isActive,
      createdAt: clinics.createdAt,
      updatedAt: clinics.updatedAt,
    })
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
    const [newClinic] = await superadminDb.insert(clinics)
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
    const [updatedClinic] = await superadminDb.update(clinics)
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
    const [deletedClinic] = await superadminDb.delete(clinics)
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

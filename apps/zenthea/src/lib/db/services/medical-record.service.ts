import { eq, and, sql, desc } from 'drizzle-orm'
import { db } from '@startkit/database'
import { medicalRecords, medicalRecordMembers } from '../schema'
import { users } from '@startkit/database/schema'

/**
 * Medical Record Service
 * 
 * Handles all database operations for Medical Records using Drizzle ORM.
 * All operations are tenant-isolated via organization_id.
 */
export class MedicalRecordService {
  /**
   * Get all medical records for a patient
   */
  static async getPatientRecords(patientId: string, organizationId: string) {
    return await db.select()
      .from(medicalRecords)
      .where(
        and(
          eq(medicalRecords.patientId, patientId),
          eq(medicalRecords.organizationId, organizationId)
        )
      )
      .orderBy(desc(medicalRecords.dateRecorded))
  }

  /**
   * Get a specific medical record by ID with shared members
   */
  static async getRecordById(id: string, organizationId: string) {
    // Validate UUID format to prevent database errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) return null

    const [record] = await db.select()
      .from(medicalRecords)
      .where(
        and(
          eq(medicalRecords.id, id),
          eq(medicalRecords.organizationId, organizationId)
        )
      )
      .limit(1)
    
    if (!record) return null

    const members = await db.select({
      userId: medicalRecordMembers.userId,
      permission: medicalRecordMembers.permission,
      name: users.name,
      email: users.email,
    })
    .from(medicalRecordMembers)
    .innerJoin(users, eq(medicalRecordMembers.userId, users.id))
    .where(eq(medicalRecordMembers.medicalRecordId, id))

    return {
      ...record,
      members
    }
  }

  /**
   * Create a new medical record
   */
  static async createRecord(data: any, organizationId: string, providerId: string) {
    const { members, ...recordData } = data

    return await db.transaction(async (tx) => {
      const [newRecord] = await tx.insert(medicalRecords)
        .values({
          ...recordData,
          organizationId,
          providerId,
          dateRecorded: recordData.dateRecorded ? new Date(recordData.dateRecorded) : new Date(),
        })
        .returning()

      if (members && Array.isArray(members)) {
        for (const member of members) {
          await tx.insert(medicalRecordMembers).values({
            organizationId,
            medicalRecordId: newRecord.id,
            userId: member.userId,
            permission: member.permission || 'view',
            addedBy: providerId,
          })
        }
      }

      return newRecord
    })
  }

  /**
   * Update a medical record
   */
  static async updateRecord(id: string, data: any, organizationId: string) {
    const { members, ...recordData } = data
    
    const updatePayload: any = {
      ...recordData,
      updatedAt: new Date(),
    }

    if (recordData.dateRecorded) {
      updatePayload.dateRecorded = new Date(recordData.dateRecorded)
    }

    return await db.transaction(async (tx) => {
      const [updatedRecord] = await tx.update(medicalRecords)
        .set(updatePayload)
        .where(
          and(
            eq(medicalRecords.id, id),
            eq(medicalRecords.organizationId, organizationId)
          )
        )
        .returning()

      if (!updatedRecord) throw new Error('Medical record not found')

      if (members && Array.isArray(members)) {
        await tx.delete(medicalRecordMembers).where(eq(medicalRecordMembers.medicalRecordId, id))
        for (const member of members) {
          await tx.insert(medicalRecordMembers).values({
            organizationId,
            medicalRecordId: id,
            userId: member.userId,
            permission: member.permission || 'view',
            addedBy: updatedRecord.providerId,
          })
        }
      }

      return updatedRecord
    })
  }

  /**
   * Delete a medical record
   */
  static async deleteRecord(id: string, organizationId: string) {
    const [deleted] = await db.delete(medicalRecords)
      .where(
        and(
          eq(medicalRecords.id, id),
          eq(medicalRecords.organizationId, organizationId)
        )
      )
      .returning()
    
    return deleted || null
  }
}

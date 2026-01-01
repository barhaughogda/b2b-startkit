import { db } from '@startkit/database'
import { eq, and, sql } from 'drizzle-orm'
import { patientAccounts, patientOrgAccess, patients } from '../schema'
import { AuditService } from './audit.service'

/**
 * Patient Access Service
 * 
 * Handles management of global patient identity and organization access grants.
 */
export class PatientAccessService {
  /**
   * Get or create a global patient account linked to a Clerk User ID
   */
  static async getOrCreatePatientAccount(clerkUserId: string, email?: string) {
    const [existing] = await db.select()
      .from(patientAccounts)
      .where(eq(patientAccounts.clerkUserId, clerkUserId))
      .limit(1)

    if (existing) {
      return existing
    }

    const [newAccount] = await db.insert(patientAccounts)
      .values({
        clerkUserId,
        email,
      })
      .returning()

    return newAccount
  }

  /**
   * Request access to a patient's data for an organization
   */
  static async requestAccess(patientAccountId: string, organizationId: string, requestedByUserId: string) {
    const [existing] = await db.select()
      .from(patientOrgAccess)
      .where(
        and(
          eq(patientOrgAccess.patientAccountId, patientAccountId),
          eq(patientOrgAccess.organizationId, organizationId)
        )
      )
      .limit(1)

    if (existing && existing.status !== 'revoked') {
      return existing
    }

    const [access] = await db.insert(patientOrgAccess)
      .values({
        patientAccountId,
        organizationId,
        requestedByUserId,
        status: 'pending',
      })
      .onConflictDoUpdate({
        target: [patientOrgAccess.patientAccountId, patientOrgAccess.organizationId],
        set: { status: 'pending', requestedByUserId, updatedAt: new Date() }
      })
      .returning()

    await AuditService.log({
      organizationId,
      userId: requestedByUserId,
      action: 'access_requested',
      resource: 'patient_account',
      resourceId: patientAccountId,
    })

    return access
  }

  /**
   * Approve an access request (patient action)
   */
  static async approveAccess(patientAccountId: string, organizationId: string) {
    const [updated] = await db.update(patientOrgAccess)
      .set({
        status: 'active',
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(patientOrgAccess.patientAccountId, patientAccountId),
          eq(patientOrgAccess.organizationId, organizationId)
        )
      )
      .returning()

    if (updated) {
      await AuditService.log({
        organizationId,
        userId: null, // Patient action
        action: 'access_granted',
        resource: 'patient_account',
        resourceId: patientAccountId,
      })
    }

    return updated
  }

  /**
   * Revoke an access grant (patient action)
   */
  static async revokeAccess(patientAccountId: string, organizationId: string) {
    const [updated] = await db.update(patientOrgAccess)
      .set({
        status: 'revoked',
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(patientOrgAccess.patientAccountId, patientAccountId),
          eq(patientOrgAccess.organizationId, organizationId)
        )
      )
      .returning()

    if (updated) {
      await AuditService.log({
        organizationId,
        userId: null, // Patient action
        action: 'access_revoked',
        resource: 'patient_account',
        resourceId: patientAccountId,
      })
    }

    return updated
  }

  /**
   * Get all active organization grants for a patient account
   */
  static async getActiveGrants(patientAccountId: string) {
    return await db.select()
      .from(patientOrgAccess)
      .where(
        and(
          eq(patientOrgAccess.patientAccountId, patientAccountId),
          eq(patientOrgAccess.status, 'active')
        )
      )
  }

  /**
   * Get all pending access requests for a patient account
   */
  static async getPendingRequests(patientAccountId: string) {
    return await db.select()
      .from(patientOrgAccess)
      .where(
        and(
          eq(patientOrgAccess.patientAccountId, patientAccountId),
          eq(patientOrgAccess.status, 'pending')
        )
      )
  }
}

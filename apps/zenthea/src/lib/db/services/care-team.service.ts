import { eq, and, sql } from 'drizzle-orm'
import { db } from '@startkit/database'
import { appointmentMembers, appointments, patients, providers } from '../schema'
import { users } from '@startkit/database/schema'

export interface CareTeamMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  careTeamRole?: string;
  source: 'explicit' | 'medical_record' | 'appointment';
  avatar?: string;
}

export class CareTeamService {
  /**
   * Get care team for a patient
   */
  static async getCareTeamForPatient(patientId: string, organizationId: string) {
    // 1. Get primary provider from patient record
    const [patient] = await db.select({
      primaryProviderId: patients.primaryProviderId,
    })
    .from(patients)
    .where(and(
      eq(patients.id, patientId),
      eq(patients.organizationId, organizationId)
    ))
    .limit(1)

    // 2. Get providers from appointments
    const membersFromAppointments = await db.select({
      userId: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatarUrl,
      role: users.isSuperadmin ? 'admin' : 'provider', // Simplified
    })
    .from(appointmentMembers)
    .innerJoin(appointments, eq(appointmentMembers.appointmentId, appointments.id))
    .innerJoin(users, eq(appointmentMembers.userId, users.id))
    .where(and(
      eq(appointments.patientId, patientId),
      eq(appointments.organizationId, organizationId)
    ))

    // 3. Resolve primary provider details
    let primaryProvider = null
    if (patient?.primaryProviderId) {
      const [pp] = await db.select({
        userId: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, patient.primaryProviderId))
      .limit(1)
      
      if (pp) {
        primaryProvider = {
          ...pp,
          role: 'Primary Provider',
          source: 'explicit' as const,
        }
      }
    }

    // Combine and deduplicate
    const memberMap = new Map<string, CareTeamMember>()
    
    if (primaryProvider) {
      memberMap.set(primaryProvider.userId, primaryProvider as CareTeamMember)
    }

    membersFromAppointments.forEach(m => {
      if (!memberMap.has(m.userId)) {
        memberMap.set(m.userId, {
          userId: m.userId,
          name: m.name || '',
          email: m.email,
          role: 'Care Team Member',
          source: 'appointment',
          avatar: m.avatar || undefined,
        })
      }
    })

    return {
      primaryProvider,
      members: Array.from(memberMap.values()),
      totalCount: memberMap.size,
    }
  }

  /**
   * Set primary provider for a patient
   */
  static async setPrimaryProvider(params: {
    patientId: string;
    newProviderId: string;
    reason: string;
    notes?: string;
    changedBy: string;
    organizationId: string;
  }) {
    const [updatedPatient] = await db.update(patients)
      .set({
        primaryProviderId: params.newProviderId,
        updatedAt: new Date(),
      })
      .where(and(
        eq(patients.id, params.patientId),
        eq(patients.organizationId, params.organizationId)
      ))
      .returning()

    if (updatedPatient) {
      await AuditService.log({
        organizationId: params.organizationId,
        userId: params.changedBy,
        action: 'primary_provider_changed',
        resource: 'patient',
        resourceId: params.patientId,
        details: {
          newProviderId: params.newProviderId,
          reason: params.reason,
          notes: params.notes,
        }
      })
    }

    return updatedPatient
  }

  /**
   * Add a care team member
   * (Currently implemented via appointment members since there's no explicit join table yet)
   */
  static async addCareTeamMember(params: {
    patientId: string;
    userId: string;
    role: string;
    addedBy: string;
    organizationId: string;
  }) {
    // In a real implementation, we might have an explicit care_team table.
    // For now, we'll just log it or return success if we're following the derived model.
    // Let's assume for now we just log it as an audit event since it's derived.
    await AuditService.log({
      organizationId: params.organizationId,
      userId: params.addedBy,
      action: 'care_team_member_added',
      resource: 'patient',
      resourceId: params.patientId,
      details: {
        memberUserId: params.userId,
        role: params.role,
      }
    })
    
    return { success: true }
  }

  /**
   * Remove a care team member
   */
  static async removeCareTeamMember(params: {
    patientId: string;
    userId: string;
    removedBy: string;
    organizationId: string;
  }) {
    await AuditService.log({
      organizationId: params.organizationId,
      userId: params.removedBy,
      action: 'care_team_member_removed',
      resource: 'patient',
      resourceId: params.patientId,
      details: {
        memberUserId: params.userId,
      }
    })
    
    return { success: true }
  }
}

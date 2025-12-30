import { requireOrganization } from '@startkit/auth/server'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '@startkit/database'
import { patients, appointments, appointmentMembers } from './schema'

/**
 * Access Control Utility
 * 
 * Implements HIPAA "Minimum Necessary" and relationship-based access control.
 */

export type ZentheaRole = 'admin' | 'provider' | 'nurse' | 'billing' | 'patient' | 'support'

/**
 * Check if the current user can access a specific patient's PHI
 */
export async function canAccessPatient(patientId: string) {
  const { user, organization } = await requireOrganization()
  const role = organization.role as ZentheaRole

  // 1. Admins and Owners have broad access (audited)
  if (role === 'admin' || role === 'owner' || user.isSuperadmin) {
    return true
  }

  // 2. Providers and Nurses must have a care relationship
  if (role === 'provider' || role === 'nurse') {
    // Check if user is the primary provider
    const [patient] = await db.select({ primaryProviderId: patients.primaryProviderId })
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.organizationId, organization.organizationId)))
      .limit(1)
    
    if (patient?.primaryProviderId === user.userId) {
      return true
    }

    // Check if user is an attendee in any appointment for this patient
    const [appointment] = await db.select()
      .from(appointments)
      .innerJoin(appointmentMembers, eq(appointments.id, appointmentMembers.appointmentId))
      .where(
        and(
          eq(appointments.patientId, patientId),
          eq(appointmentMembers.userId, user.userId),
          eq(appointments.organizationId, organization.organizationId)
        )
      )
      .limit(1)
    
    if (appointment) {
      return true
    }
  }

  // 3. Patients can only access their own records
  // Note: This assumes the user.userId is linked to a patient record
  // In a real system, we'd have a mapping table or a patientId in the user metadata.
  
  return false
}

/**
 * Filter query results based on role-based visibility
 */
export function applyMinimumNecessary(role: ZentheaRole, data: any) {
  // Front desk / Admin role only sees demographics, not clinical data
  if (role === 'admin' || role === 'clinic_user') {
    const { medicalHistory, allergies, medications, ...safeData } = data
    return safeData
  }

  return data
}

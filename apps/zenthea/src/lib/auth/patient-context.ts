import { getZentheaServerSession } from '../auth'
import { PatientAccessService } from '../db/services/patient-access.service'
import { redirect } from 'next/navigation'

export interface PatientContext {
  patientAccountId: string;
  clerkUserId: string;
  email: string;
  activeGrants: Array<{ organizationId: string }>;
}

/**
 * Require a patient context - ensures the user is logged in as a patient
 * and loads their global account and active organization grants.
 * 
 * @throws Redirects to sign-in if not authenticated
 * @throws Error if not a patient
 */
export async function requirePatientContext(): Promise<PatientContext> {
  const session = await getZentheaServerSession()

  if (!session) {
    redirect('/sign-in')
  }

  if (session.user.role !== 'patient') {
    throw new Error('Access denied: Patient role required')
  }

  const account = await PatientAccessService.getOrCreatePatientAccount(
    session.user.id,
    session.user.email
  )

  const activeGrants = await PatientAccessService.getActiveGrants(account.id)

  return {
    patientAccountId: account.id,
    clerkUserId: session.user.id,
    email: session.user.email,
    activeGrants: activeGrants.map(g => ({ organizationId: g.organizationId })),
  }
}

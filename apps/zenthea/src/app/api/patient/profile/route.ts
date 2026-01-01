import { NextRequest, NextResponse } from 'next/server';
import { requirePatientContext } from '@/lib/auth/patient-context';
import { PatientService } from '@/lib/db/services/patient.service';
import { withTenant } from '@startkit/database/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { clerkUserId, activeGrants } = await requirePatientContext();
    
    const tenantId = request.headers.get('X-Tenant-ID');
    
    if (!tenantId || !activeGrants.some(g => g.organizationId === tenantId)) {
      return NextResponse.json(
        { error: 'Unauthorized: No access grant for this organization' },
        { status: 403 }
      );
    }

    // Since patients are stored in tenant-scoped tables, we need to find the patient record
    // linked to this Clerk user in this organization.
    // For now, we'll assume we can find them by email.
    // TODO: Add a more direct link between patientAccount and patient record.
    return await withTenant(
      { organizationId: tenantId, userId: clerkUserId },
      async () => {
        // This is a bit of a hack until we have the direct link
        const patients = await PatientService.getPatients(tenantId, clerkUserId);
        const session = await import('@/lib/auth').then(m => m.getZentheaServerSession());
        const patient = patients.find(p => p.email === session?.user?.email);

        if (!patient) {
          return NextResponse.json({ error: 'Patient record not found in this organization' }, { status: 404 });
        }

        return NextResponse.json(patient);
      }
    );
  } catch (error: any) {
    console.error('Error fetching patient profile:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

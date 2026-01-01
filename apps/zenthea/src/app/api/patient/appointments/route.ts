import { NextRequest, NextResponse } from 'next/server';
import { requirePatientContext } from '@/lib/auth/patient-context';
import { AppointmentService } from '@/lib/db/services/appointment.service';
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

    return await withTenant(
      { organizationId: tenantId, userId: clerkUserId },
      async () => {
        // Need to find the patient record ID first
        const { PatientService } = await import('@/lib/db/services/patient.service');
        const patients = await PatientService.getPatients(tenantId, clerkUserId);
        const session = await import('@/lib/auth').then(m => m.getZentheaServerSession());
        const patient = patients.find(p => p.email === session?.user?.email);

        if (!patient) {
          return NextResponse.json([], { status: 200 }); // No patient, no appointments
        }

        const list = await AppointmentService.getAppointments({ 
          organizationId: tenantId,
          patientId: patient.id 
        });
        return NextResponse.json(list);
      }
    );
  } catch (error: any) {
    console.error('Error fetching patient appointments:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

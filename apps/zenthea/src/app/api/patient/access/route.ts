import { NextRequest, NextResponse } from 'next/server';
import { requirePatientContext } from '@/lib/auth/patient-context';
import { PatientAccessService } from '@/lib/db/services/patient-access.service';
import { withTenant } from '@startkit/database/tenant';

export const dynamic = 'force-dynamic';

/**
 * GET /api/patient/access
 * List all organization access grants and pending requests for the patient
 */
export async function GET() {
  try {
    const { patientAccountId } = await requirePatientContext();
    
    const [active, pending] = await Promise.all([
      PatientAccessService.getActiveGrants(patientAccountId),
      PatientAccessService.getPendingRequests(patientAccountId)
    ]);

    // Fetch organization names for display
    const { superadminDb } = await import('@startkit/database');
    const { organizations } = await import('@startkit/database/schema');
    const { inArray } = await import('drizzle-orm');

    const orgIds = [...new Set([...active.map(a => a.organizationId), ...pending.map(p => p.organizationId)])];
    
    let orgNames: Record<string, string> = {};
    if (orgIds.length > 0) {
      const orgs = await superadminDb.select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(inArray(organizations.id, orgIds));
      
      orgs.forEach(o => { orgNames[o.id] = o.name; });
    }

    return NextResponse.json({
      active: active.map(a => ({ ...a, organizationName: orgNames[a.organizationId] || 'Unknown' })),
      pending: pending.map(p => ({ ...p, organizationName: orgNames[p.organizationId] || 'Unknown' }))
    });
  } catch (error: any) {
    console.error('Error fetching patient access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/patient/access
 * Approve or revoke access
 */
export async function POST(request: NextRequest) {
  try {
    const { patientAccountId } = await requirePatientContext();
    const { organizationId, action } = await request.json();

    if (!organizationId || !['approve', 'revoke'].includes(action)) {
      return NextResponse.json({ error: 'Invalid organizationId or action' }, { status: 400 });
    }

    if (action === 'approve') {
      await PatientAccessService.approveAccess(patientAccountId, organizationId);
    } else {
      await PatientAccessService.revokeAccess(patientAccountId, organizationId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating patient access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

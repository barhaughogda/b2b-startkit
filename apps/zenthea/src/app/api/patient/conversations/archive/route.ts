import { NextRequest, NextResponse } from 'next/server';
import { requirePatientContext } from '@/lib/auth/patient-context';
import { MessageService } from '@/lib/db/services/message.service';
import { withTenant } from '@startkit/database/tenant';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { clerkUserId, activeGrants } = await requirePatientContext();
    
    const { threadId } = await request.json();
    const tenantId = request.headers.get('X-Tenant-ID');

    if (!tenantId || !activeGrants.some(g => g.organizationId === tenantId)) {
      return NextResponse.json(
        { error: 'Unauthorized: No access grant for this organization' },
        { status: 403 }
      );
    }

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { status: 400 }
      );
    }

    return await withTenant(
      { organizationId: tenantId, userId: clerkUserId },
      async () => {
        const archived = await MessageService.archiveThread(threadId, clerkUserId, tenantId);
        return NextResponse.json({ 
          success: true, 
          archivedCount: archived.length 
        });
      }
    );
  } catch (error: any) {
    console.error('Error archiving thread:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

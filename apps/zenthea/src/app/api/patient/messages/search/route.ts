import { NextRequest, NextResponse } from 'next/server';
import { requirePatientContext } from '@/lib/auth/patient-context';
import { MessageService } from '@/lib/db/services/message.service';
import { withTenant } from '@startkit/database/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { clerkUserId, activeGrants } = await requirePatientContext();
    
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('searchTerm');
    const limit = parseInt(searchParams.get('limit') || '50');
    const tenantId = request.headers.get('X-Tenant-ID');

    if (!tenantId || !activeGrants.some(g => g.organizationId === tenantId)) {
      return NextResponse.json(
        { error: 'Unauthorized: No access grant for this organization' },
        { status: 403 }
      );
    }

    if (!searchTerm) {
      return NextResponse.json(
        { error: 'Search term is required' },
        { status: 400 }
      );
    }

    return await withTenant(
      { organizationId: tenantId, userId: clerkUserId },
      async () => {
        const messages = await MessageService.searchMessages(clerkUserId, tenantId, searchTerm, limit);
        return NextResponse.json({ messages });
      }
    );
  } catch (error: any) {
    console.error('Error searching messages:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

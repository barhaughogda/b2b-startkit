import { NextRequest, NextResponse } from 'next/server';
import { requirePatientContext } from '@/lib/auth/patient-context';
import { MessageService } from '@/lib/db/services/message.service';
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
        // Implement getMessageStats in MessageService or here.
        // For now, let's return a simple version since MessageService doesn't have it yet.
        const conversations = await MessageService.getConversations(clerkUserId, tenantId);
        const unreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        
        return NextResponse.json({
          unreadCount,
          totalConversations: conversations.length
        });
      }
    );
  } catch (error: any) {
    console.error('Error fetching message stats:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

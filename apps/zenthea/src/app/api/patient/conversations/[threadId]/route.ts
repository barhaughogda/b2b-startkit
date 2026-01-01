import { NextRequest, NextResponse } from 'next/server';
import { requirePatientContext } from '@/lib/auth/patient-context';
import { MessageService } from '@/lib/db/services/message.service';
import { withTenant } from '@startkit/database/tenant';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { clerkUserId, activeGrants } = await requirePatientContext();
    const { threadId } = await params;
    
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
        const messages = await MessageService.getThread(threadId, tenantId);
        return NextResponse.json(messages);
      }
    );
  } catch (error: any) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { clerkUserId, activeGrants } = await requirePatientContext();
    const { threadId } = await params;
    
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
        // Find messages in the thread addressed to the current user and mark them as read
        // For simplicity, we'll implement a markThreadAsRead in MessageService
        // Wait, I should add that to MessageService first or implement it here.
        // I'll add a simple version here for now.
        const threadMessages = await MessageService.getThread(threadId, tenantId);
        const toMarkRead = threadMessages.filter(m => m.toUserId === clerkUserId && !m.isRead);
        
        for (const msg of toMarkRead) {
          await MessageService.markAsRead(msg.id, tenantId);
        }

        return NextResponse.json({
          success: true,
          readCount: toMarkRead.length,
          message: 'Thread marked as read'
        });
      }
    );
  } catch (error: any) {
    console.error('Error marking thread as read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark thread as read' },
      { status: 500 }
    );
  }
}

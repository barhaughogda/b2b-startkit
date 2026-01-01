import { NextRequest, NextResponse } from 'next/server';
import { requirePatientContext } from '@/lib/auth/patient-context';
import { MessageService } from '@/lib/db/services/message.service';
import { withTenant } from '@startkit/database/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { clerkUserId, activeGrants } = await requirePatientContext();
    
    const { searchParams } = new URL(request.url);
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
        const messages = await MessageService.getUserMessages(clerkUserId, tenantId);
        return NextResponse.json(messages);
      }
    );
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Access denied') ? 403 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clerkUserId, activeGrants } = await requirePatientContext();
    
    const body = await request.json();
    const { toUserId, subject, content, messageType, priority, threadId, attachments } = body;
    const tenantId = request.headers.get('X-Tenant-ID');

    if (!tenantId || !activeGrants.some(g => g.organizationId === tenantId)) {
      return NextResponse.json(
        { error: 'Unauthorized: No access grant for this organization' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!toUserId || !content) {
      return NextResponse.json(
        { error: 'Recipient and content are required' },
        { status: 400 }
      );
    }

    return await withTenant(
      { organizationId: tenantId, userId: clerkUserId },
      async () => {
        const message = await MessageService.sendMessage({
          toUserId,
          subject,
          content,
          messageType,
          priority,
          threadId,
          attachments
        }, tenantId, clerkUserId);

        return NextResponse.json({
          success: true,
          messageId: message.id,
          message: 'Message sent successfully'
        });
      }
    );
  } catch (error: any) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

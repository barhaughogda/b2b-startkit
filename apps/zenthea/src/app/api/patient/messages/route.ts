import { NextRequest, NextResponse } from 'next/server';
import { getZentheaServerSession } from '@/lib/auth';

import { api } from '../../../../../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const session = await getZentheaServerSession();
    
    if (!session || session.user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = request.headers.get('X-Tenant-ID') || 'demo-tenant';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || 'all';
    const messageType = searchParams.get('messageType') || 'all';

    const result = await convex.query(api.messages.getMessages, {
      tenantId,
      userId: session.user.id as any,
      limit,
      offset,
      status: status as any,
      messageType: messageType as any
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getZentheaServerSession();
    
    if (!session || session.user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { toUserId, subject, content, messageType, priority, threadId, parentMessageId, attachments } = body;
    const tenantId = request.headers.get('X-Tenant-ID') || 'demo-tenant';

    // Validate required fields
    if (!toUserId || !content) {
      return NextResponse.json(
        { error: 'Recipient and content are required' },
        { status: 400 }
      );
    }

    const messageId = await convex.mutation(api.messages.createMessage, {
      tenantId,
      fromUserId: session.user.id as any,
      toUserId: toUserId as any,
      subject,
      content,
      messageType: messageType || 'general',
      priority: priority || 'normal',
      threadId,
      parentMessageId: parentMessageId as any,
      attachments
    });

    return NextResponse.json({
      success: true,
      messageId,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { api } from '../../../../../../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = request.headers.get('X-Tenant-ID') || 'demo-tenant';
    const { threadId } = params;

    const messages = await convex.query(api.messages.getConversation, {
      tenantId,
      threadId,
      userId: session.user.id as any
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: any
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = request.headers.get('X-Tenant-ID') || 'demo-tenant';
    const { threadId } = params;

    // Mark thread as read
    const readCount = await convex.mutation(api.messages.markThreadAsRead, {
      threadId,
      userId: session.user.id as any,
      tenantId
    });

    return NextResponse.json({
      success: true,
      readCount,
      message: 'Thread marked as read'
    });
  } catch (error) {
    console.error('Error marking thread as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark thread as read' },
      { status: 500 }
    );
  }
}

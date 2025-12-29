import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { threadId, userId } = await request.json();
    const tenantId = request.headers.get('X-Tenant-ID') || 'demo-tenant';

    if (!threadId || !userId) {
      return NextResponse.json(
        { error: 'Thread ID and User ID are required' },
        { status: 400 }
      );
    }

    const result = await convex.mutation(api.messages.archiveThread, {
      threadId,
      userId,
      tenantId
    });

    return NextResponse.json({ 
      success: true, 
      archivedCount: result 
    });
  } catch (error) {
    console.error('Error archiving thread:', error);
    return NextResponse.json(
      { error: 'Failed to archive thread' },
      { status: 500 }
    );
  }
}

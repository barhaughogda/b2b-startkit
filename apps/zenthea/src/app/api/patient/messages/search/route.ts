import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Force dynamic rendering - this route uses request.url and request.headers
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');
    const userId = searchParams.get('userId');
    const searchTerm = searchParams.get('searchTerm');
    const limit = parseInt(searchParams.get('limit') || '50');
    const tenantId = request.headers.get('X-Tenant-ID') || 'demo-tenant';

    if (!threadId || !userId || !searchTerm) {
      return NextResponse.json(
        { error: 'Thread ID, User ID, and search term are required' },
        { status: 400 }
      );
    }

    const messages = await convex.query(api.messages.searchThreadMessages, {
      tenantId,
      threadId,
      userId: userId as Id<"users">,
      searchTerm,
      limit
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error searching messages:', error);
    return NextResponse.json(
      { error: 'Failed to search messages' },
      { status: 500 }
    );
  }
}

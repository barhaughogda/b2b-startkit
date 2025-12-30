import { NextRequest, NextResponse } from 'next/server';
import { getZentheaServerSession } from '@/lib/auth';

import { api } from '../../../../../../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Force dynamic rendering - this route uses getZentheaServerSession and request.headers
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getZentheaServerSession();
    
    if (!session || session.user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = request.headers.get('X-Tenant-ID') || 'demo-tenant';

    const stats = await convex.query(api.messages.getMessageStats, {
      tenantId,
      userId: session.user.id as any
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching message stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

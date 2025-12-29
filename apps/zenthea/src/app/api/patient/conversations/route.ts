import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { api } from '../../../../../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Force dynamic rendering - this route uses getServerSession and request.headers
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // In Next.js 13+ App Router, getServerSession automatically uses headers() from next/headers
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - No session found. Please log in.' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'patient') {
      return NextResponse.json(
        { error: `Unauthorized - Expected role 'patient', got '${session.user.role}'` },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = request.headers.get('X-Tenant-ID') || 'demo-tenant';
    const limit = parseInt(searchParams.get('limit') || '20');
    let userId = session.user.id as any;

    // If userId looks like a demo ID (not a Convex ID), try to look up the real Convex user ID
    if (userId && (userId.startsWith('demo-') || userId.startsWith('demo-user-'))) {
      try {
        const user = await convex.query(api.users.getUserByEmail, {
          email: session.user.email || '',
          tenantId: tenantId
        });
        if (user) {
          userId = user._id;
        } else {
          return NextResponse.json(
            { error: 'User not found in Convex. Please ensure demo users are seeded.' },
            { status: 404 }
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error('Error looking up user:', errorMessage);
        return NextResponse.json(
          { error: 'Failed to look up user in Convex' },
          { status: 500 }
        );
      }
    }

    const conversations = await convex.query(api.messages.getConversations, {
      tenantId,
      userId,
      limit
    });
    return NextResponse.json(conversations);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error('Error fetching conversations:', errorMessage);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          details: {
            stack: error instanceof Error ? error.stack : undefined,
          },
        }),
      },
      { status: 500 }
    );
  }
}

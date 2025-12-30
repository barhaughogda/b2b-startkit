import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/auth/jwt';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { ActivityFeedResponse, ActivityType } from '@/types/superadmin';

export async function GET(request: NextRequest) {
  try {
    // Verify superadmin role (middleware protects, but double-check for safety)
    const token = await getToken({ req: request });
    
    if (!token || token.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Superadmin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Validate activity type input
    const validActivityTypes: ActivityType[] = ['all', 'tenant', 'user', 'security', 'system'];
    const requestedType = searchParams.get('type') || 'all';
    const activityType: ActivityType = validActivityTypes.includes(requestedType as ActivityType)
      ? (requestedType as ActivityType)
      : 'all';

    // Validate parameters
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be non-negative' },
        { status: 400 }
      );
    }

    // Initialize Convex client
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      if (process.env.NODE_ENV === 'development') {
        console.error('NEXT_PUBLIC_CONVEX_URL is not configured');
      }
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const convex = new ConvexHttpClient(convexUrl);
    
    // Call Convex query
    // Note: Using type assertion as superadmin module types may need regeneration
    // Run 'npx convex dev' or 'npx convex deploy' to regenerate types if needed
    const result = await convex.query(
      (api as any).superadmin?.getRecentActivity || 
      // Fallback: use internal API if available
      (api as any).internal?.superadmin?.getRecentActivity,
      {
        activityType,
        limit,
        offset,
      }
    );

    return NextResponse.json(result as ActivityFeedResponse);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching activity feed:', error);
    }
    return NextResponse.json(
      { 
        error: 'Failed to fetch activity feed',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { unstable_cache, revalidateTag } from 'next/cache';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { PlatformStats } from '@/types/superadmin';

// Serverless-compatible cache using Next.js unstable_cache
// This works across serverless invocations unlike in-memory Map
const getCachedPlatformStats = unstable_cache(
  async (): Promise<PlatformStats> => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured');
    }

    const convex = new ConvexHttpClient(convexUrl);
    // Note: Using type assertion as superadmin module types may need regeneration
    // Run 'npx convex dev' or 'npx convex deploy' to regenerate types if needed
    return await convex.query(
      (api as any).superadmin?.getPlatformStats || 
      // Fallback: use internal API if available
      (api as any).internal?.superadmin?.getPlatformStats,
      {}
    );
  },
  ['platform-stats'],
  {
    revalidate: 300, // 5 minutes
    tags: ['platform-stats'],
  }
);

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

    // Check if cache should be revalidated (via query parameter)
    const { searchParams } = new URL(request.url);
    const shouldRevalidate = searchParams.get('revalidate') === 'true';
    
    if (shouldRevalidate) {
      revalidateTag('platform-stats');
    }

    // Fetch stats with serverless-compatible caching
    const stats = await getCachedPlatformStats();

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5 min cache, 10 min stale
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching platform statistics:', error);
    }
    return NextResponse.json(
      { 
        error: 'Failed to fetch platform statistics',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}


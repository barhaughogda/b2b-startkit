/**
 * Logout API Endpoint
 * 
 * Handles user logout and session cleanup.
 * This endpoint is called when a user logs out to delete their session record.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initializeConvex } from '@/lib/convex-client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/logout
 * Delete the current user's session
 */
export async function POST() {
  try {
    // Get current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get session ID from token (stored in JWT)
    const sessionId = (session.user as any).sessionId;
    
    if (!sessionId) {
      // If no session ID, still return success (session might not have been tracked)
      return NextResponse.json({
        success: true,
        message: 'Logged out successfully',
      });
    }
    
    // Initialize Convex
    const { convex: convexClient, api: convexApi } = await initializeConvex();
    
    if (!convexClient || !convexApi) {
      // If Convex not available, still return success (session cleanup is best effort)
      logger.warn('Convex not available for session cleanup');
      return NextResponse.json({
        success: true,
        message: 'Logged out successfully',
      });
    }
    
    // Delete session from Convex
    try {
      await convexClient.mutation(convexApi.sessions.deleteSession, {
        sessionId: sessionId,
      });
    } catch (error) {
      // If session deletion fails, log but don't fail the logout
      // This allows logout to proceed even if session tracking has issues
      logger.warn('Failed to delete session', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
    
  } catch (error) {
    logger.error('Logout error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to logout',
      },
      { status: 500 }
    );
  }
}


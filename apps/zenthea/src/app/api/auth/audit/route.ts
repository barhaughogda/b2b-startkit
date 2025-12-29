/**
 * HIPAA-Compliant Authentication Audit Logging API
 * 
 * Logs authentication events (login success/failure) for HIPAA compliance.
 * This endpoint is called from client-side login pages to ensure all
 * authentication attempts are properly audited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initializeConvex } from '@/lib/convex-client';
import { Id } from '@/convex/_generated/dataModel';
import { extractClientIP, extractUserAgent } from '@/lib/utils/request-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action, // 'login_success' | 'login_failed'
      email,
      userId,
      tenantId,
      errorMessage,
      ipAddress,
      userAgent,
      details
    } = body;

    // Validate required fields
    if (!action || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: action and email are required' },
        { status: 400 }
      );
    }

    // Validate action type
    if (!['login_success', 'login_failed'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "login_success" or "login_failed"' },
        { status: 400 }
      );
    }

    // Extract IP address and user agent from request if not provided
    // Uses shared utility that checks Cloudflare headers first for better reliability
    const finalIpAddress = extractClientIP(request, ipAddress);
    const finalUserAgent = extractUserAgent(request, userAgent);

    // Initialize Convex
    const { convex, api } = await initializeConvex();
    if (!convex || !api) {
      console.error('Convex not available for audit logging');
      // Don't fail the request if audit logging fails - log error but continue
      return NextResponse.json(
        { success: false, error: 'Audit logging service unavailable' },
        { status: 503 }
      );
    }

    // Get session if available (for successful logins)
    let sessionUserId: string | undefined = userId;
    let sessionTenantId: string | undefined = tenantId;
    
    if (action === 'login_success' && !userId) {
      try {
        const session = await getServerSession(authOptions);
        if (session?.user) {
          sessionUserId = session.user.id;
          sessionTenantId = session.user.tenantId;
        }
      } catch (sessionError) {
        // Session might not be available yet - use provided values
        console.warn('Could not get session for audit logging:', sessionError);
      }
    }

    // Use tenantId from request or default to 'default' if not available
    const auditTenantId = sessionTenantId || tenantId || 'default';

    // Validate Convex ID format if userId is provided
    // Convex IDs are base64url-encoded strings (typically 15-30 characters)
    // They contain alphanumeric characters, hyphens, and underscores
    // This validation ensures we don't pass invalid IDs to Convex mutations
    const isValidConvexId = (id: string): boolean => {
      // Convex IDs use base64url encoding and can vary in length
      // Minimum length is typically around 15 characters, but we use a more lenient check
      // to accommodate different ID formats and future changes
      // Note: This is a basic validation - Convex will perform stricter validation server-side
      return /^[a-zA-Z0-9_-]{15,}$/.test(id);
    };

    // Create audit log entry
    try {
      // Type-safe userId handling with proper validation
      const validatedUserId: Id<'users'> | undefined = 
        sessionUserId && isValidConvexId(sessionUserId)
          ? (sessionUserId as Id<'users'>)
          : undefined;

      await convex.mutation(api.auditLogs.create, {
        tenantId: auditTenantId,
        userId: validatedUserId,
        action: action === 'login_success' ? 'login_success' : 'login_failed',
        resource: 'authentication',
        resourceId: sessionUserId || email, // Use userId if available, otherwise email
        details: {
          email,
          ...(errorMessage && { errorMessage }),
          ...(details || {}),
          timestamp: Date.now(),
          source: 'clinic_login_page',
        },
        ipAddress: finalIpAddress,
        userAgent: finalUserAgent,
        timestamp: Date.now(),
      });

      return NextResponse.json({
        success: true,
        message: 'Audit log entry created successfully',
      });
    } catch (auditError) {
      // Log error but don't fail the request
      console.error('Failed to create audit log entry:', auditError);
      // Return 202 Accepted for audit logging failures since audit is non-critical
      // The authentication flow should not be blocked by audit logging failures
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create audit log entry',
          ...(process.env.NODE_ENV === 'development' && {
            details: auditError instanceof Error ? auditError.message : String(auditError)
          })
        },
        { status: 202 } // 202 Accepted - audit logging is non-blocking
      );
    }
  } catch (error) {
    console.error('Authentication audit logging error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error)
        })
      },
      { status: 500 }
    );
  }
}


/**
 * Security Events API endpoint for superadmin
 * Task 6.1: Create Security Events API
 * 
 * Returns security events across all tenants with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminAuth } from '@/lib/superadmin-auth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    // Verify superadmin authentication
    const authResult = await verifySuperAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Parse query parameters
    const searchParams = request.nextUrl?.searchParams || new URL(request.url).searchParams;
    const eventType = searchParams.get('eventType') || undefined;
    const severity = searchParams.get('severity') || undefined;
    
    // Parse date range
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const startDate = startDateParam ? parseInt(startDateParam, 10) : undefined;
    const endDate = endDateParam ? parseInt(endDateParam, 10) : undefined;

    // Validate date parameters
    if (startDateParam && (isNaN(startDate!) || startDate! < 0)) {
      return NextResponse.json(
        { error: 'Invalid startDate parameter' },
        { status: 400 }
      );
    }

    if (endDateParam && (isNaN(endDate!) || endDate! < 0)) {
      return NextResponse.json(
        { error: 'Invalid endDate parameter' },
        { status: 400 }
      );
    }

    // Parse pagination parameters
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

    // Validate pagination parameters
    if (limitParam && (isNaN(limit!) || limit! < 1 || limit! > 1000)) {
      return NextResponse.json(
        { error: 'Invalid limit parameter. Must be between 1 and 1000' },
        { status: 400 }
      );
    }

    if (offsetParam && (isNaN(offset!) || offset! < 0)) {
      return NextResponse.json(
        { error: 'Invalid offset parameter. Must be >= 0' },
        { status: 400 }
      );
    }

    // Query security events from Convex
    let result;
    try {
      // Get the query path - ConvexHttpClient.query accepts the function reference directly
      const queryPath = (api as any).admin?.securityEvents?.getSecurityEventsForSuperadmin;
      
      if (!queryPath) {
        throw new Error('Security events API path not found. Make sure Convex functions are deployed.');
      }
      
      result = await convex.query(
        queryPath,
        {
          eventType,
          severity,
          startDate,
          endDate,
          limit,
          offset,
        }
      );
    } catch (convexError) {
      const errorMessage = convexError instanceof Error ? convexError.message : String(convexError);
      const errorStack = convexError instanceof Error ? convexError.stack : undefined;
      
      // Log full error details in test environment
      if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
        console.error("❌ Convex query error:", {
          message: errorMessage,
          stack: errorStack,
          queryPath: (api as any).admin?.securityEvents?.getSecurityEventsForSuperadmin,
        });
      }
      
      // Check if this is a "function not found" error
      if (errorMessage.includes("Could not find public function") || 
          errorMessage.includes("Did you forget to run") ||
          errorMessage.includes("API path not found")) {
        return NextResponse.json(
          {
            error: 'Security events service temporarily unavailable',
            details: (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') ? errorMessage : undefined,
          },
          { status: 503 }
        );
      }
      throw convexError;
    }

    // Transform events to match expected API format
    const events = result.events.map((event: {
      _id: string;
      action: string;
      resource: string;
      resourceId: string;
      timestamp: number;
      userId?: string;
      tenantId: string;
      ipAddress?: string;
      userAgent?: string;
      details?: any;
    }) => ({
      id: event._id,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      timestamp: event.timestamp,
      userId: event.userId,
      tenantId: event.tenantId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details,
    }));

    return NextResponse.json({
      events,
      pagination: result.pagination,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Enhanced error logging for debugging
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      console.error('❌ Error fetching security events:', {
        message: errorMessage,
        stack: errorStack,
        errorType: error?.constructor?.name,
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch security events',
        ...(process.env.NODE_ENV === 'test' && { details: errorMessage }),
      },
      { status: 500 }
    );
  }
}


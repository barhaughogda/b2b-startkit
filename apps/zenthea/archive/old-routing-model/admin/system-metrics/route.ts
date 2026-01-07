import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Force dynamic rendering - this route uses verifyAdminAuth which requires headers
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/system-metrics
 * Returns system-wide metrics for admin dashboard
 * Requires admin role
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // TypeScript now knows authResult is the authorized branch
    const tenantId = authResult.tenantId;

    // Query Convex for system metrics
    const metrics = await convex.query((api as any).admin.systemMetrics.getSystemMetrics, {
      tenantId,
    });

    // Add response caching headers (5 minute TTL)
    const response = NextResponse.json(
      {
        success: true,
        data: metrics,
      },
      { status: 200 }
    );

    response.headers.set("Cache-Control", "private, max-age=300"); // 5 minutes
    response.headers.set("X-Content-Type-Options", "nosniff");

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Error fetching system metrics:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch system metrics",
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


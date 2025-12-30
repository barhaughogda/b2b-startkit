import { NextRequest, NextResponse } from "next/server";
import { getZentheaServerSession } from "@/lib/auth";

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Force dynamic rendering - this route uses session which requires headers
export const dynamic = 'force-dynamic';

/**
 * GET /api/clinic/analytics
 * Returns comprehensive analytics data for clinic dashboard
 * Includes patient growth, appointment trends, revenue metrics, user activity, and performance data
 * Owner-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getZentheaServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is clinic user (with backward compatibility)
    const isClinicUser =
      session.user.role === "clinic_user" ||
      session.user.role === "admin" ||
      session.user.role === "provider";

    if (!isClinicUser && session.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden - Clinic access required" },
        { status: 403 }
      );
    }

    // Verify owner access - analytics is owner-only
    if (!session.user.isOwner && session.user.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "Only clinic owners can access analytics",
          code: "OWNER_ONLY",
        },
        { status: 403 }
      );
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: "Tenant ID not found in session",
          message: "Tenant ID is required to fetch analytics",
          code: "MISSING_TENANT_ID",
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Parse date range filters
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    let startDate: number | undefined;
    let endDate: number | undefined;
    
    if (startDateParam) {
      const parsedStartDate = new Date(startDateParam).getTime();
      if (!isNaN(parsedStartDate)) {
        startDate = parsedStartDate;
      }
    }
    
    if (endDateParam) {
      const parsedEndDate = new Date(endDateParam).getTime();
      if (!isNaN(parsedEndDate)) {
        endDate = parsedEndDate;
      }
    }

    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid date range",
          message: "Start date must be before end date",
          code: "INVALID_DATE_RANGE",
        },
        { status: 400 }
      );
    }

    // Query Convex for analytics data
    // Reuse the admin analytics function since it's tenant-scoped
    let result;
    try {
      result = await convex.query((api as any)["admin/analytics"].getAnalytics, {
        tenantId,
        startDate,
        endDate,
      });
    } catch (convexError) {
      const errorMessage = convexError instanceof Error ? convexError.message : String(convexError);
      
      // Check if this is a "function not found" error
      if (errorMessage.includes("Could not find public function") || 
          errorMessage.includes("Did you forget to run")) {
        if (process.env.NODE_ENV === 'development') {
          console.error("❌ Convex function not deployed:", errorMessage);
        }
        return NextResponse.json(
          {
            success: false,
            error: "Convex function not deployed",
            message: "The Convex function 'admin/analytics:getAnalytics' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
            ...(process.env.NODE_ENV === 'development' && {
              details: {
                error: errorMessage,
                solution: "Run 'npx convex dev' in a separate terminal to sync Convex functions",
              },
            }),
          },
          { status: 503 }
        );
      }
      
      // For other Convex errors, log and re-throw
      if (process.env.NODE_ENV === 'development') {
        console.error("❌ Convex query failed:", {
          error: errorMessage,
          tenantId,
          apiPath: "api.admin.analytics.getAnalytics",
        });
      }
      throw convexError;
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (process.env.NODE_ENV === 'development') {
      console.error("❌ Error fetching analytics data:", errorMessage);
    }
    
    // Return user-friendly error message
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch analytics data",
        message: errorMessage,
        code: "FETCH_ANALYTICS_DATA_ERROR",
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


import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { verifyAdminAuth } from "@/lib/admin-auth";
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security
 * Returns security events, failed logins, and active sessions
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    
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

    // Query Convex for security data
    let result;
    try {
      result = await convex.query((api as any).admin.security.getSecurityData, {
        tenantId,
        page,
        limit,
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
            message: "The Convex function 'admin/security:getSecurityData' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          apiPath: "(api as any).admin.security.getSecurityData",
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
      console.error("❌ Error fetching security data:", errorMessage);
    }
    
    // Return user-friendly error message
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch security data",
        message: errorMessage,
        code: "FETCH_SECURITY_DATA_ERROR",
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


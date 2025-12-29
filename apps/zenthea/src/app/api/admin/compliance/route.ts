import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { verifyAdminAuth } from "@/lib/admin-auth";
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Force dynamic rendering - this route uses verifyAdminAuth which requires headers
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/compliance
 * Returns comprehensive compliance data including status, violations, and score
 * Requires admin role
 * 
 * Note: This endpoint is different from /api/admin/compliance-metrics:
 * - /api/admin/compliance: Returns detailed compliance data with violations list, score, and level
 * - /api/admin/compliance-metrics: Returns dashboard metrics (hipaaStatus, auditLogCount, etc.)
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

    // Query Convex for compliance data
    let result;
    try {
      result = await convex.query((api as any).admin.compliance.getComplianceData, {
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
            message: "The Convex function 'admin/compliance:getComplianceData' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          apiPath: "(api as any).admin.compliance.getComplianceData",
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
      console.error("❌ Error fetching compliance data:", errorMessage);
    }
    
    // Return user-friendly error message
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch compliance data",
        message: errorMessage,
        code: "FETCH_COMPLIANCE_DATA_ERROR",
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

/**
 * POST /api/admin/compliance
 * Generates compliance reports (PDF or CSV)
 * Requires admin role
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // TypeScript now knows authResult is the authorized branch
    const tenantId = authResult.tenantId;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          message: "Request body must be valid JSON",
          code: "INVALID_REQUEST_BODY",
        },
        { status: 400 }
      );
    }

    // Validate report type
    const { type, dateRange } = body;
    if (!type || (type !== "pdf" && type !== "csv")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid report type",
          message: "Report type must be 'pdf' or 'csv'",
          code: "INVALID_REPORT_TYPE",
        },
        { status: 400 }
      );
    }

    // Validate date range if provided
    if (dateRange) {
      if (dateRange.startDate && dateRange.endDate) {
        const startDate = new Date(dateRange.startDate).getTime();
        const endDate = new Date(dateRange.endDate).getTime();
        if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
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
      }
    }

    // Prepare date range for Convex query
    const reportDateRange = dateRange
      ? {
          startDate: dateRange.startDate ? new Date(dateRange.startDate).getTime() : undefined,
          endDate: dateRange.endDate ? new Date(dateRange.endDate).getTime() : undefined,
        }
      : undefined;

    // Query Convex for report generation
    let result;
    try {
      result = await convex.query((api as any).admin.compliance.generateComplianceReport, {
        tenantId,
        type,
        dateRange: reportDateRange,
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
            message: "The Convex function 'admin/compliance:generateComplianceReport' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          apiPath: "(api as any).admin.compliance.generateComplianceReport",
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
      console.error("❌ Error generating compliance report:", errorMessage);
    }
    
    // Return user-friendly error message
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate compliance report",
        message: errorMessage,
        code: "GENERATE_COMPLIANCE_REPORT_ERROR",
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


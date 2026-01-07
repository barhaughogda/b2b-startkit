import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { verifyAdminAuth } from "@/lib/admin-auth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Force dynamic rendering - this route uses verifyAdminAuth which requires headers
export const dynamic = 'force-dynamic';

type ReportType = "user_activity" | "compliance" | "financial" | "security";
type ExportFormat = "pdf" | "csv";

/**
 * POST /api/admin/reports
 * Generates reports (PDF or CSV) for various report types
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
    const { reportType, exportFormat, dateRange } = body;
    const validReportTypes: ReportType[] = ["user_activity", "compliance", "financial", "security"];
    if (!reportType || !validReportTypes.includes(reportType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid report type",
          message: `Report type must be one of: ${validReportTypes.join(", ")}`,
          code: "INVALID_REPORT_TYPE",
        },
        { status: 400 }
      );
    }

    // Validate export format
    const validExportFormats: ExportFormat[] = ["pdf", "csv"];
    if (!exportFormat || !validExportFormats.includes(exportFormat)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid export format",
          message: `Export format must be one of: ${validExportFormats.join(", ")}`,
          code: "INVALID_EXPORT_FORMAT",
        },
        { status: 400 }
      );
    }

    // Validate date range if provided
    if (dateRange) {
      if (dateRange.startDate && dateRange.endDate) {
        const startDate = new Date(dateRange.startDate).getTime();
        const endDate = new Date(dateRange.endDate).getTime();
        const now = Date.now();
        const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
        
        if (isNaN(startDate) || isNaN(endDate)) {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid date range",
              message: "Invalid date format provided",
              code: "INVALID_DATE_RANGE",
            },
            { status: 400 }
          );
        }
        
        if (startDate > endDate) {
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
        
        if (endDate > now) {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid date range",
              message: "End date cannot be in the future",
              code: "INVALID_DATE_RANGE",
            },
            { status: 400 }
          );
        }
        
        if (endDate - startDate > maxRange) {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid date range",
              message: "Date range cannot exceed 1 year",
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
      // TODO: Type assertion needed because generated types may be stale locally
      // The function exists in convex/admin/reports.ts and will be available at runtime
      // Consider regenerating Convex types: npx convex codegen
      result = await convex.query((api.admin as any).reports.generateReport, {
        tenantId,
        reportType,
        exportFormat,
        dateRange: reportDateRange,
      });
    } catch (convexError) {
      const errorMessage = convexError instanceof Error ? convexError.message : String(convexError);
      const errorStack = convexError instanceof Error ? convexError.stack : undefined;
      
      // Log full error details in development
      if (process.env.NODE_ENV === 'development') {
        console.error("❌ Convex query error:", {
          error: errorMessage,
          stack: errorStack,
          tenantId,
          reportType,
          exportFormat,
          dateRange: reportDateRange,
          apiPath: "api.admin.reports.generateReport",
        });
      }
      
      // Check if this is a "function not found" error
      if (errorMessage.includes("Could not find public function") || 
          errorMessage.includes("Did you forget to run")) {
        return NextResponse.json(
          {
            success: false,
            error: "Convex function not deployed",
            message: "The Convex function 'admin/reports:generateReport' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
      
      // For other Convex errors, re-throw to be caught by outer catch
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
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error("❌ Error generating report:", {
        error: errorMessage,
        stack: errorStack,
        name: error instanceof Error ? error.name : undefined,
      });
    }
    
    // Return user-friendly error message
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate report",
        message: errorMessage,
        code: "GENERATE_REPORT_ERROR",
        ...(process.env.NODE_ENV === 'development' && {
          details: {
            stack: errorStack,
            name: error instanceof Error ? error.name : undefined,
          },
        }),
      },
      { status: 500 }
    );
  }
}


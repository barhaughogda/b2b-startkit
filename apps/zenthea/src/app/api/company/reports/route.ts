import { NextRequest, NextResponse } from "next/server";
import { getZentheaServerSession } from "@/lib/auth";

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Force dynamic rendering - this route requires session context
export const dynamic = 'force-dynamic';

type ReportType = "user_activity" | "compliance" | "financial" | "security";
type ExportFormat = "pdf" | "csv";

/**
 * POST /api/company/reports
 * Generates reports (PDF or CSV) for various report types
 * Requires owner role (owner-only endpoint)
 */
export async function POST(request: NextRequest) {
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

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in session" },
        { status: 400 }
      );
    }

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

    // Prepare date range for Convex action
    const reportDateRange = dateRange
      ? {
          startDate: dateRange.startDate ? new Date(dateRange.startDate).getTime() : undefined,
          endDate: dateRange.endDate ? new Date(dateRange.endDate).getTime() : undefined,
        }
      : undefined;

    // Call Convex action for report generation (owner verification happens in Convex)
    let result;
    try {
      result = await convex.action((api as any)["clinic/reports"].generateReport, {
        tenantId,
        userEmail: session.user.email!,
        reportType,
        exportFormat,
        dateRange: reportDateRange,
      });
    } catch (convexError) {
      const errorMessage = convexError instanceof Error ? convexError.message : String(convexError);
      const errorStack = convexError instanceof Error ? convexError.stack : undefined;
      
      // Log full error details in development
      if (process.env.NODE_ENV === 'development') {
        console.error("❌ Convex action error:", {
          error: errorMessage,
          stack: errorStack,
          tenantId,
          reportType,
          exportFormat,
          dateRange: reportDateRange,
          apiPath: "api.clinic.reports.generateReport",
        });
      }
      
      // Check if this is a "function not found" error
      if (errorMessage.includes("Could not find public function") || 
          errorMessage.includes("Did you forget to run")) {
        return NextResponse.json(
          {
            success: false,
            error: "Convex function not deployed",
            message: "The Convex function 'clinic/reports:generateReport' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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

      // Check for authorization errors
      if (
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("owner") ||
        errorMessage.includes("Owner access required")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden",
            message: "Only clinic owners can generate reports",
            code: "OWNER_ACCESS_REQUIRED",
          },
          { status: 403 }
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


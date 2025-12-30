import { NextRequest, NextResponse } from "next/server";
import { getZentheaServerSession } from "@/lib/auth";

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { logger } from "@/lib/logger";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const dynamic = 'force-dynamic';

/**
 * GET /api/company/settings/session-timeout
 * Get session timeout configuration for the tenant
 * 
 * Query parameters:
 * - tenantId: ID of the tenant (optional, uses session tenantId if not provided)
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

    // Get tenantId from query params or session
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || session.user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found" },
        { status: 400 }
      );
    }

    // Query Convex for session timeout config
    let result;
    try {
      // Note: Using type assertion as clinic.sessionTimeout types may need regeneration
      // Run 'npx convex dev' or 'npx convex deploy' to regenerate types if needed
      // The function exists in convex/clinic/sessionTimeout.ts
      // @ts-ignore - clinic namespace types not generated yet, function exists in Convex
      const typedApi: any = api;
      const queryFn = typedApi.clinic?.sessionTimeout?.getSessionTimeoutConfig;
      if (!queryFn) {
        throw new Error("Convex function 'clinic.sessionTimeout.getSessionTimeoutConfig' not available. Please run 'npx convex dev' to sync functions.");
      }
      result = await convex.query(queryFn, {
        tenantId,
      });
    } catch (convexError) {
      const errorMessage =
        convexError instanceof Error
          ? convexError.message
          : String(convexError);

      // Check if this is a "function not found" error
      if (
        errorMessage.includes("Could not find public function") ||
        errorMessage.includes("Did you forget to run")
      ) {
        logger.error("Convex function not deployed", {
          error: errorMessage,
          apiPath: "clinic.sessionTimeout.getSessionTimeoutConfig",
        });
        return NextResponse.json(
          {
            success: false,
            error: "Convex function not deployed",
            message:
              "The Convex function 'clinic/sessionTimeout:getSessionTimeoutConfig' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
            code: "CONVEX_FUNCTION_NOT_DEPLOYED",
            ...(process.env.NODE_ENV === "development" && {
              details: {
                error: errorMessage,
                solution:
                  "Run 'npx convex dev' in a separate terminal to sync Convex functions",
              },
            }),
          },
          { status: 503 }
        );
      }

      if (errorMessage.includes("Tenant not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Tenant not found",
            message: errorMessage,
            code: "TENANT_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // For other Convex errors, log and re-throw
      logger.error("Convex query failed", {
        error: errorMessage,
        apiPath: "clinic.sessionTimeout.getSessionTimeoutConfig",
        tenantId,
      });
      throw convexError;
    }

    return NextResponse.json({
      success: true,
      config: result,
    });
  } catch (error) {
    logger.error("Error fetching session timeout config", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch session timeout configuration",
        message: errorMessage,
        code: "FETCH_CONFIG_ERROR",
        ...(process.env.NODE_ENV === "development" && {
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
 * PUT /api/company/settings/session-timeout
 * Update session timeout configuration for the tenant
 * Owner-only endpoint
 * 
 * Request body:
 * - timeout: Session timeout in minutes (5-480, optional)
 * - warningTime: Warning time in minutes before logout (must be < timeout, optional)
 * - enabled: Whether session timeout is enabled (optional)
 * - maxConcurrentSessions: Maximum concurrent sessions per user (1-10, optional)
 */
export async function PUT(request: NextRequest) {
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
    const body = await request.json();
    const { timeout, warningTime, enabled, maxConcurrentSessions } = body;

    // Validate timeout if provided
    if (timeout !== undefined) {
      if (typeof timeout !== "number" || timeout < 5 || timeout > 480) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "Session timeout must be between 5 and 480 minutes",
            code: "INVALID_TIMEOUT",
          },
          { status: 400 }
        );
      }
    }

    // Validate warning time if provided
    if (warningTime !== undefined) {
      if (typeof warningTime !== "number" || warningTime < 1) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "Warning time must be at least 1 minute",
            code: "INVALID_WARNING_TIME",
          },
          { status: 400 }
        );
      }

      // If timeout is also provided, validate warning time < timeout
      const effectiveTimeout = timeout ?? 30; // Default timeout
      if (warningTime >= effectiveTimeout) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "Warning time must be less than session timeout",
            code: "WARNING_TIME_TOO_LARGE",
          },
          { status: 400 }
        );
      }
    }

    // Validate max concurrent sessions if provided
    if (maxConcurrentSessions !== undefined) {
      if (typeof maxConcurrentSessions !== "number" || maxConcurrentSessions < 1 || maxConcurrentSessions > 10) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "Max concurrent sessions must be between 1 and 10",
            code: "INVALID_MAX_CONCURRENT_SESSIONS",
          },
          { status: 400 }
        );
      }
    }

    // Update session timeout config via Convex action
    let result;
    try {
      // Note: Using type assertion as clinic.sessionTimeout types may need regeneration
      // Run 'npx convex dev' or 'npx convex deploy' to regenerate types if needed
      // The function exists in convex/clinic/sessionTimeout.ts
      // @ts-ignore - clinic namespace types not generated yet, function exists in Convex
      const typedApi: any = api;
      const actionFn = typedApi.clinic?.sessionTimeout?.updateSessionTimeoutConfig;
      if (!actionFn) {
        throw new Error("Convex function 'clinic.sessionTimeout.updateSessionTimeoutConfig' not available. Please run 'npx convex dev' to sync functions.");
      }
      result = await convex.action(actionFn, {
        tenantId,
        userEmail: session.user.email!,
        ...(timeout !== undefined && { timeout }),
        ...(warningTime !== undefined && { warningTime }),
        ...(enabled !== undefined && { enabled }),
        ...(maxConcurrentSessions !== undefined && { maxConcurrentSessions }),
      });
    } catch (convexError) {
      const errorMessage =
        convexError instanceof Error
          ? convexError.message
          : String(convexError);

      // Check if this is a "function not found" error
      if (
        errorMessage.includes("Could not find public function") ||
        errorMessage.includes("Did you forget to run")
      ) {
        logger.error("Convex function not deployed", {
          error: errorMessage,
          apiPath: "clinic.sessionTimeout.updateSessionTimeoutConfig",
        });
        return NextResponse.json(
          {
            success: false,
            error: "Convex function not deployed",
            message:
              "The Convex function 'clinic/sessionTimeout:updateSessionTimeoutConfig' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
            code: "CONVEX_FUNCTION_NOT_DEPLOYED",
            ...(process.env.NODE_ENV === "development" && {
              details: {
                error: errorMessage,
                solution:
                  "Run 'npx convex dev' in a separate terminal to sync Convex functions",
              },
            }),
          },
          { status: 503 }
        );
      }

      // Check for known errors
      if (
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("owner")
      ) {
        return NextResponse.json(
          { error: "Only clinic owners can update session timeout settings" },
          { status: 403 }
        );
      }

      if (errorMessage.includes("Tenant not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Tenant not found",
            message: errorMessage,
            code: "TENANT_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (
        errorMessage.includes("must be between") ||
        errorMessage.includes("must be less than") ||
        errorMessage.includes("must be at least")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: errorMessage,
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      // For other Convex errors, log and re-throw
      logger.error("Convex action failed", {
        error: errorMessage,
        apiPath: "clinic.sessionTimeout.updateSessionTimeoutConfig",
        tenantId,
      });
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
    logger.error("Error updating session timeout config", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update session timeout configuration",
        message: errorMessage,
        code: "UPDATE_CONFIG_ERROR",
        ...(process.env.NODE_ENV === "development" && {
          details: {
            stack: error instanceof Error ? error.stack : undefined,
          },
        }),
      },
      { status: 500 }
    );
  }
}


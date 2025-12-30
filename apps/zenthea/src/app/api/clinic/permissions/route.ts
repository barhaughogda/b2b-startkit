import { NextRequest, NextResponse } from "next/server";
import { getZentheaServerSession } from "@/lib/auth";

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const dynamic = 'force-dynamic';

/**
 * GET /api/clinic/permissions
 * Get user's effective permissions
 * Owner-only endpoint
 * 
 * Query parameters:
 * - userId: ID of the user whose permissions to retrieve (required)
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

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in session" },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Missing required query parameter: userId",
          code: "MISSING_USER_ID",
        },
        { status: 400 }
      );
    }

    // Validate userId format (should be a valid Convex ID)
    try {
      // Validate it's a valid Convex ID format
      if (!userId.match(/^[a-z0-9]+$/)) {
        throw new Error("Invalid user ID format");
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Invalid user ID format",
          code: "INVALID_USER_ID",
        },
        { status: 400 }
      );
    }

    // Query Convex for user permissions
    let result;
    try {
      result = await convex.query(
        (api as any).clinic?.permissions?.getUserPermissions as any,
        {
          tenantId,
          userEmail: session.user.email!,
          targetUserId: userId as Id<"users">,
        }
      );
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
        if (process.env.NODE_ENV === "development") {
          console.error("❌ Convex function not deployed:", errorMessage);
        }
        return NextResponse.json(
          {
            success: false,
            error: "Convex function not deployed",
            message:
              "The Convex function 'clinic/permissions:getUserPermissions' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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

      // Check for authorization errors
      if (
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("owner")
      ) {
        return NextResponse.json(
          { error: "Only clinic owners can view user permissions" },
          { status: 403 }
        );
      }

      if (errorMessage.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
            message: errorMessage,
            code: "USER_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (
        errorMessage.includes("does not belong") ||
        errorMessage.includes("tenant")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: errorMessage,
            code: "TENANT_MISMATCH",
          },
          { status: 400 }
        );
      }

      // For other Convex errors, log and re-throw
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Convex query failed:", {
          error: errorMessage,
          apiPath: "(api as any).clinic.permissions.getUserPermissions",
        });
      }
      throw convexError;
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user permissions",
        message: errorMessage,
        code: "FETCH_PERMISSIONS_ERROR",
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
 * PUT /api/clinic/permissions
 * Update user's permissions by assigning a custom role
 * Owner-only endpoint
 * 
 * Request body:
 * - userId: ID of the user whose permissions to update (required)
 * - customRoleId: ID of the custom role to assign, or null to remove role (required)
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
    const { userId, customRoleId } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Missing required field: userId",
          code: "MISSING_USER_ID",
        },
        { status: 400 }
      );
    }

    // Validate userId format
    try {
      if (!userId.match(/^[a-z0-9]+$/)) {
        throw new Error("Invalid user ID format");
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Invalid user ID format",
          code: "INVALID_USER_ID",
        },
        { status: 400 }
      );
    }

    // Validate customRoleId (can be null or a valid ID)
    if (customRoleId !== null && customRoleId !== undefined) {
      // Validate customRoleId format if provided
      try {
        if (!customRoleId.match(/^[a-z0-9]+$/)) {
          throw new Error("Invalid custom role ID format");
        }
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "Invalid custom role ID format",
            code: "INVALID_CUSTOM_ROLE_ID",
          },
          { status: 400 }
        );
      }
    }

    // Update user permissions via Convex action
    let result;
    try {
      result = await convex.action(
        (api as any).clinic?.permissions?.updateUserPermissions as any,
        {
          tenantId,
          userEmail: session.user.email!,
          targetUserId: userId as Id<"users">,
          customRoleId:
            customRoleId !== null && customRoleId !== undefined
              ? (customRoleId as Id<"customRoles">)
              : null,
        }
      );
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
        if (process.env.NODE_ENV === "development") {
          console.error("❌ Convex function not deployed:", errorMessage);
        }
        return NextResponse.json(
          {
            success: false,
            error: "Convex function not deployed",
            message:
              "The Convex function 'clinic/permissions:updateUserPermissions' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          { error: "Only clinic owners can update user permissions" },
          { status: 403 }
        );
      }

      if (errorMessage.includes("User not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
            message: errorMessage,
            code: "USER_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (errorMessage.includes("Custom role not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Custom role not found",
            message: errorMessage,
            code: "CUSTOM_ROLE_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (
        errorMessage.includes("does not belong") ||
        errorMessage.includes("tenant")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: errorMessage,
            code: "TENANT_MISMATCH",
          },
          { status: 400 }
        );
      }

      // For other Convex errors, log and re-throw
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Convex action failed:", {
          error: errorMessage,
          apiPath: "(api as any).clinic.permissions.updateUserPermissions",
        });
      }
      throw convexError;
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "permission_updated",
        resource: "users",
        resourceId: userId as Id<"users">,
        details: {
          updatedBy: session.user.email,
          customRoleId: customRoleId || null,
          updatedAt: Date.now(),
        },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        timestamp: Date.now(),
      });
    } catch (auditError) {
      // Log audit error but don't fail the request
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: result.userId,
          message: result.message,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user permissions:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user permissions",
        message: errorMessage,
        code: "UPDATE_PERMISSIONS_ERROR",
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



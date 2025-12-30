import { NextRequest, NextResponse } from "next/server";
import { getZentheaServerSession } from "@/lib/auth";

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/company/owners
 * Get list of clinic owners
 * Owner-only endpoint
 */
export async function GET(_request: NextRequest) {
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

    // Query Convex for owners
    let result;
    try {
      result = await convex.query(
        (api as any).clinic?.owners?.getOwners as any,
        {
          tenantId,
          userEmail: session.user.email!,
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
              "The Convex function 'clinic/owners:getOwners' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          { error: "Only clinic owners can view owners" },
          { status: 403 }
        );
      }

      // For other Convex errors, log and re-throw
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Convex query failed:", {
          error: errorMessage,
          apiPath: "(api as any).clinic.owners.getOwners",
        });
      }
      throw convexError;
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching owners:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch owners",
        message: errorMessage,
        code: "FETCH_OWNERS_ERROR",
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
 * POST /api/company/owners
 * Add owner status to a user
 * Owner-only endpoint
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
    const body = await request.json();
    const { userId } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Missing required field: userId",
          code: "MISSING_REQUIRED_FIELDS",
        },
        { status: 400 }
      );
    }

    // Validate userId format (should be a valid Convex ID)
    if (typeof userId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "userId must be a string",
          code: "INVALID_USER_ID",
        },
        { status: 400 }
      );
    }

    // Add owner via Convex action
    let result;
    try {
      result = await convex.action(
        (api as any).clinic?.owners?.addOwner as any,
        {
          tenantId,
          userEmail: session.user.email!,
          userId: userId as Id<"users">,
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
              "The Convex function 'clinic/owners:addOwner' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          { error: "Only clinic owners can add owners" },
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
        errorMessage.includes("Invalid")
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
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Convex action failed:", {
          error: errorMessage,
          apiPath: "(api as any).clinic.owners.addOwner",
        });
      }
      throw convexError;
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "owner_added",
        resource: "users",
        resourceId: result.userId,
        details: {
          addedUserId: result.userId,
          addedBy: session.user.email,
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
    console.error("Error adding owner:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to add owner",
        message: errorMessage,
        code: "ADD_OWNER_ERROR",
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
 * DELETE /api/company/owners
 * Remove owner status from a user
 * Owner-only endpoint
 * Requires userId in query parameter or request body
 */
export async function DELETE(request: NextRequest) {
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

    // Try to get userId from query parameter first, then request body
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");

    // If not in query params, try request body
    if (!userId) {
      try {
        const body = await request.json();
        userId = body.userId;
      } catch {
        // Request body might be empty, that's okay
      }
    }

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Missing required field: userId (provide as query parameter ?userId=... or in request body)",
          code: "MISSING_REQUIRED_FIELDS",
        },
        { status: 400 }
      );
    }

    // Validate userId format (should be a valid Convex ID)
    if (typeof userId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "userId must be a string",
          code: "INVALID_USER_ID",
        },
        { status: 400 }
      );
    }

    // Remove owner via Convex action
    let result;
    try {
      result = await convex.action(
        (api as any).clinic?.owners?.removeOwner as any,
        {
          tenantId,
          userEmail: session.user.email!,
          userId: userId as Id<"users">,
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
              "The Convex function 'clinic/owners:removeOwner' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          { error: "Only clinic owners can remove owners" },
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

      if (errorMessage.includes("last owner")) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot remove last owner",
            message: errorMessage,
            code: "CANNOT_REMOVE_LAST_OWNER",
          },
          { status: 400 }
        );
      }

      if (errorMessage.includes("cannot remove your own")) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot remove own owner status",
            message: errorMessage,
            code: "CANNOT_REMOVE_OWN_OWNER_STATUS",
          },
          { status: 400 }
        );
      }

      if (
        errorMessage.includes("does not belong") ||
        errorMessage.includes("Invalid")
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
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Convex action failed:", {
          error: errorMessage,
          apiPath: "(api as any).clinic.owners.removeOwner",
        });
      }
      throw convexError;
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "owner_removed",
        resource: "users",
        resourceId: result.userId,
        details: {
          removedUserId: result.userId,
          removedBy: session.user.email,
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
    console.error("Error removing owner:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove owner",
        message: errorMessage,
        code: "REMOVE_OWNER_ERROR",
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


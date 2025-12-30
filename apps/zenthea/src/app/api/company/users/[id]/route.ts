import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { validatePassword } from "@/lib/validation/password";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * PUT /api/company/users/[id]
 * Update a clinic user
 * Owner-only endpoint
 */
export async function PUT(
  request: NextRequest,
  { params }: any
) {
  try {
    const session = await getServerSession(authOptions);

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

    const userId = params.id as Id<"users">;

    // Parse request body
    const body = await request.json();
    const {
      name,
      email,
      password,
      isOwner,
      isActive,
      departmentIds,
      customRoleId,
    } = body;

    // Validate that at least one field is provided for update
    const hasUpdates =
      name !== undefined ||
      email !== undefined ||
      password !== undefined ||
      isOwner !== undefined ||
      isActive !== undefined ||
      departmentIds !== undefined ||
      customRoleId !== undefined;

    if (!hasUpdates) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "At least one field must be provided for update",
          code: "NO_UPDATES_PROVIDED",
        },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "Invalid email format",
            code: "INVALID_EMAIL_FORMAT",
          },
          { status: 400 }
        );
      }
    }

    // Validate password strength if provided
    if (password !== undefined) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: passwordValidation.error,
            code: passwordValidation.code || "PASSWORD_VALIDATION_FAILED",
          },
          { status: 400 }
        );
      }
    }

    // Validate departmentIds is an array if provided
    if (departmentIds !== undefined && !Array.isArray(departmentIds)) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "departmentIds must be an array",
          code: "INVALID_DEPARTMENT_IDS",
        },
        { status: 400 }
      );
    }

    // Update user via Convex action
    let result;
    try {
      result = await convex.action(
        (api as any).clinic?.users?.updateClinicUser as any,
        {
          tenantId,
          userEmail: session.user.email!,
          userId,
          name: name !== undefined ? name.trim() : undefined,
          email: email !== undefined ? email.trim() : undefined,
          password: password || undefined,
          isOwner: isOwner !== undefined ? isOwner : undefined,
          isActive: isActive !== undefined ? isActive : undefined,
          departmentIds: departmentIds !== undefined ? departmentIds : undefined,
          customRoleId: customRoleId || undefined,
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
              "The Convex function 'clinic/users:updateClinicUser' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          { error: "Only clinic owners can update users" },
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
        errorMessage.includes("already exists") ||
        errorMessage.includes("duplicate")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Email already exists",
            message: errorMessage,
            code: "EMAIL_ALREADY_EXISTS",
          },
          { status: 409 }
        );
      }

      if (
        errorMessage.includes("Invalid") ||
        errorMessage.includes("does not belong")
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
          apiPath: "(api as any).clinic.users.updateClinicUser",
        });
      }
      throw convexError;
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "user_updated",
        resource: "users",
        resourceId: userId,
        details: {
          updatedFields: {
            ...(name !== undefined && { name }),
            ...(email !== undefined && { email }),
            ...(password !== undefined && { passwordChanged: true }),
            ...(isOwner !== undefined && { isOwner }),
            ...(isActive !== undefined && { isActive }),
            ...(departmentIds !== undefined && { departmentIds }),
            ...(customRoleId !== undefined && { customRoleId }),
          },
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
    console.error("Error updating user:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user",
        message: errorMessage,
        code: "UPDATE_USER_ERROR",
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
 * DELETE /api/company/users/[id]
 * Deactivate a clinic user (soft delete)
 * Owner-only endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: any
) {
  try {
    const session = await getServerSession(authOptions);

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

    const userId = params.id as Id<"users">;

    // Prevent users from deactivating themselves
    if (session.user.id === userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "You cannot deactivate your own account",
          code: "CANNOT_DEACTIVATE_SELF",
        },
        { status: 400 }
      );
    }

    // Deactivate user via Convex action
    let result;
    try {
      result = await convex.action(
        (api as any).clinic?.users?.deactivateClinicUser as any,
        {
          tenantId,
          userEmail: session.user.email!,
          userId,
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
              "The Convex function 'clinic/users:deactivateClinicUser' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          { error: "Only clinic owners can deactivate users" },
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
            error: "Cannot deactivate last owner",
            message: errorMessage,
            code: "CANNOT_DEACTIVATE_LAST_OWNER",
          },
          { status: 400 }
        );
      }

      // For other Convex errors, log and re-throw
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Convex action failed:", {
          error: errorMessage,
          apiPath: "(api as any).clinic.users.deactivateClinicUser",
        });
      }
      throw convexError;
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "user_deactivated",
        resource: "users",
        resourceId: userId,
        details: {
          deactivatedBy: session.user.email,
          deactivatedAt: Date.now(),
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
    console.error("Error deactivating user:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to deactivate user",
        message: errorMessage,
        code: "DEACTIVATE_USER_ERROR",
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



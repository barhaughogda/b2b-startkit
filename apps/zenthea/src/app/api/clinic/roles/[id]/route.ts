import { NextRequest, NextResponse } from "next/server";
import { getZentheaServerSession } from "@/lib/auth";

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * PUT /api/clinic/roles/[id]
 * Update a custom role
 * Owner-only endpoint
 */
export async function PUT(
  request: NextRequest,
  { params }: any
) {
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

    const roleId = params.id as Id<"customRoles">;

    // Parse request body
    const body = await request.json();
    const { name, description, permissions, isTemplate } = body;

    // Validate that at least one field is provided for update
    const hasUpdates =
      name !== undefined ||
      description !== undefined ||
      permissions !== undefined ||
      isTemplate !== undefined;

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

    // Validate name if provided
    if (name !== undefined) {
      if (name === null || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "Role name cannot be null or empty",
            code: "INVALID_ROLE_NAME",
          },
          { status: 400 }
        );
      }
    }

    // Validate permissions if provided
    if (permissions !== undefined) {
      if (!permissions || typeof permissions !== "object") {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "Permissions must be an object",
            code: "INVALID_PERMISSIONS",
          },
          { status: 400 }
        );
      }
    }

    // Update role via Convex action
    let result;
    try {
      result = await convex.action(
        (api as any).clinic?.roles?.updateCustomRole as any,
        {
          tenantId,
          userEmail: session.user.email!,
          roleId,
          name: name !== undefined ? name?.trim() : undefined,
          description: description !== undefined ? description?.trim() : undefined,
          permissions: permissions !== undefined ? permissions : undefined,
          isTemplate: isTemplate !== undefined ? isTemplate : undefined,
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
              "The Convex function 'clinic/roles:updateCustomRole' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          { error: "Only clinic owners can update roles" },
          { status: 403 }
        );
      }

      if (errorMessage.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Role not found",
            message: errorMessage,
            code: "ROLE_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (errorMessage.includes("already exists")) {
        return NextResponse.json(
          {
            success: false,
            error: "Role name already exists",
            message: errorMessage,
            code: "ROLE_NAME_ALREADY_EXISTS",
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
          apiPath: "(api as any).clinic.roles.updateCustomRole",
        });
      }
      throw convexError;
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "role_updated",
        resource: "customRoles",
        resourceId: roleId,
        details: {
          updatedFields: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(permissions !== undefined && { permissionsUpdated: true }),
            ...(isTemplate !== undefined && { isTemplate }),
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
          roleId: result.roleId,
          message: result.message,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating role:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update role",
        message: errorMessage,
        code: "UPDATE_ROLE_ERROR",
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
 * DELETE /api/clinic/roles/[id]
 * Delete a custom role
 * Owner-only endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: any
) {
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

    const roleId = params.id as Id<"customRoles">;

    // Delete role via Convex action
    let result;
    try {
      result = await convex.action(
        (api as any).clinic?.roles?.deleteCustomRole as any,
        {
          tenantId,
          userEmail: session.user.email!,
          roleId,
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
              "The Convex function 'clinic/roles:deleteCustomRole' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          { error: "Only clinic owners can delete roles" },
          { status: 403 }
        );
      }

      if (errorMessage.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Role not found",
            message: errorMessage,
            code: "ROLE_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (errorMessage.includes("in use") || errorMessage.includes("assigned")) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete role in use",
            message: errorMessage,
            code: "ROLE_IN_USE",
          },
          { status: 400 }
        );
      }

      if (errorMessage.includes("does not belong")) {
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
          apiPath: "(api as any).clinic.roles.deleteCustomRole",
        });
      }
      throw convexError;
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "role_deleted",
        resource: "customRoles",
        resourceId: roleId,
        details: {
          deletedBy: session.user.email,
          deletedAt: Date.now(),
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
          roleId: result.roleId,
          message: result.message,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting role:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete role",
        message: errorMessage,
        code: "DELETE_ROLE_ERROR",
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


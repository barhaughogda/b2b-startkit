import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";
import { callConvexAction } from "@/lib/convex-helpers";

type UpdateCustomRoleResult = {
  success: boolean;
  roleId: Id<"customRoles">;
  message: string;
  affectedUsersCount?: number;
  affectedUserIds?: Id<"users">[];
};

type DeleteCustomRoleResult = {
  success: boolean;
  roleId: Id<"customRoles">;
  message: string;
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * PUT /api/company/roles/[id]
 * Update a custom role
 * Owner-only endpoint
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const actionResult = await callConvexAction<UpdateCustomRoleResult>(
      convex,
      "clinic.roles.updateCustomRole",
      ["clinic", "roles", "updateCustomRole"],
      {
        tenantId,
        userEmail: session.user.email!,
        roleId,
        name: name !== undefined ? name?.trim() : undefined,
        description: description !== undefined ? description?.trim() : undefined,
        permissions: permissions !== undefined ? permissions : undefined,
        isTemplate: isTemplate !== undefined ? isTemplate : undefined,
      },
      {
        errorCode: "UPDATE_ROLE_ERROR",
        errorMessage: "Only clinic owners can update roles",
      }
    );

    // Check if result is an error response
    if (actionResult instanceof NextResponse) {
      return actionResult;
    }

    const result = actionResult.data;

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
 * DELETE /api/company/roles/[id]
 * Delete a custom role
 * Owner-only endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const roleId = params.id as Id<"customRoles">;

    // Delete role via Convex action
    const actionResult = await callConvexAction<DeleteCustomRoleResult>(
      convex,
      "clinic.roles.deleteCustomRole",
      ["clinic", "roles", "deleteCustomRole"],
      {
        tenantId,
        userEmail: session.user.email!,
        roleId,
      },
      {
        errorCode: "DELETE_ROLE_ERROR",
        errorMessage: "Only clinic owners can delete roles",
      }
    );

    // Check if result is an error response
    if (actionResult instanceof NextResponse) {
      return actionResult;
    }

    const result = actionResult.data;

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


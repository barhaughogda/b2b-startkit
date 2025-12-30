import { NextRequest, NextResponse } from "next/server";
import { getZentheaServerSession } from "@/lib/auth";

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";
import { callConvexQuery, callConvexAction } from "@/lib/convex-helpers";

type CreateCustomRoleResult = {
  success: boolean;
  roleId: Id<"customRoles">;
  message: string;
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/company/roles
 * Get list of custom roles for the tenant
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

    // Query Convex for roles
    const queryResult = await callConvexQuery(
      convex,
      "clinic.roles.getCustomRoles",
      ["clinic", "roles", "getCustomRoles"],
      {
        tenantId,
        userEmail: session.user.email!,
      },
      {
        errorCode: "FETCH_ROLES_ERROR",
        errorMessage: "Only clinic owners can view roles",
      }
    );

    // Check if result is an error response
    if (queryResult instanceof NextResponse) {
      return queryResult;
    }

    return NextResponse.json({
      success: true,
      data: queryResult.data,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch roles",
        message: errorMessage,
        code: "FETCH_ROLES_ERROR",
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
 * POST /api/company/roles
 * Create a new custom role
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
    const { name, description, permissions, isTemplate } = body;

    // Validate required fields
    if (!name || !permissions) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Missing required fields: name, permissions",
          code: "MISSING_REQUIRED_FIELDS",
        },
        { status: 400 }
      );
    }

    // Validate name is not empty
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Role name cannot be empty",
          code: "INVALID_ROLE_NAME",
        },
        { status: 400 }
      );
    }

    // Validate permissions is an object
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

    // Create role via Convex action
    const actionResult = await callConvexAction<CreateCustomRoleResult>(
      convex,
      "clinic.roles.createCustomRole",
      ["clinic", "roles", "createCustomRole"],
      {
        tenantId,
        userEmail: session.user.email!,
        name: name.trim(),
        description: description?.trim(),
        permissions,
        isTemplate: isTemplate ?? false,
      },
      {
        errorCode: "CREATE_ROLE_ERROR",
        errorMessage: "Only clinic owners can create roles",
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
        action: "role_created",
        resource: "customRoles",
        resourceId: result.roleId,
        details: {
          roleName: name,
          isTemplate: isTemplate ?? false,
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
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating role:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create role",
        message: errorMessage,
        code: "CREATE_ROLE_ERROR",
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


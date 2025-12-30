import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth, verifySuperAdminSupportAccess } from "@/lib/superadmin-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * PATCH /api/superadmin/users/[id]/role
 * Updates a user's role
 * Requires superadmin role
 */
export async function PATCH(
  request: NextRequest,
  { params }: any
) {
  try {
    // Verify superadmin authorization
    const authResult = await verifySuperAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Extract session after type narrowing
    const session = authResult.session;

    const userId = params.id;

    // Validate user ID format (Convex ID format)
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID",
          message: "User ID is required",
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { role } = body;

    // Validate role
    const validRoles = ["admin", "provider", "demo", "patient", "super_admin"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid role",
          message: `Role must be one of: ${validRoles.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Get current user to check existing role and tenant ID
    let currentUser;
    try {
      currentUser = await convex.query((api as any).admin.users.getUserById, {
        id: userId as Id<"users">,
      });
    } catch (convexError) {
      const errorMessage =
        convexError instanceof Error ? convexError.message : String(convexError);

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
              "The Convex function 'admin/users:getUserById' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
            code: "CONVEX_FUNCTION_NOT_DEPLOYED",
          },
          { status: 503 }
        );
      }

      throw convexError;
    }

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
          message: "The specified user does not exist",
        },
        { status: 404 }
      );
    }

    // Verify support access for accessing user data
    // This route accesses user data, so support access validation is required
    const tenantId = currentUser.tenantId;
    if (tenantId) {
      const supportAccessResult = await verifySuperAdminSupportAccess(
        request,
        userId as Id<"users">,
        tenantId
      );
      
      if (!supportAccessResult.authorized) {
        return supportAccessResult.response;
      }
      
      // Log successful support access verification (optional - already logged in verifySupportAccess)
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Support access verified:', {
          requestId: supportAccessResult.requestId,
          expiresAt: new Date(supportAccessResult.expiresAt).toISOString(),
        });
      }
    }

    // Prevent changing role if it's the same
    if (currentUser.role === role) {
      return NextResponse.json(
        {
          success: false,
          error: "Role unchanged",
          message: "User already has this role",
        },
        { status: 400 }
      );
    }

    // Prevent superadmin from changing their own role
    if (
      session.user.id === userId &&
      currentUser.role === "super_admin" &&
      role !== "super_admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot change own role",
          message: "Superadmins cannot change their own role",
        },
        { status: 403 }
      );
    }

    // Update user role via Convex
    try {
      await convex.mutation((api as any).admin.users.updateUserMutation, {
        id: userId as Id<"users">,
        role: role as
          | "admin"
          | "provider"
          | "demo"
          | "patient"
          | "super_admin",
      });
    } catch (convexError) {
      const errorMessage =
        convexError instanceof Error ? convexError.message : String(convexError);

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
              "The Convex function 'admin/users:updateUserMutation' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
            code: "CONVEX_FUNCTION_NOT_DEPLOYED",
          },
          { status: 503 }
        );
      }

      throw convexError;
    }

    // Log role change to audit log
    // Note: We'll use the Convex audit logger if available
    // For now, we'll log via the audit logger in the API route context
    try {
      // Get tenant ID for audit logging (use "system" if no tenant)
      const tenantId = currentUser.tenantId || "system";

      // Log to audit system via Convex
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: userId as Id<"users">,
        action: "role_changed",
        resource: "users",
        resourceId: userId,
        details: {
          previousRole: currentUser.role,
          newRole: role,
          changedBy: session.user.id,
          changedByName: session.user.name || session.user.email,
        },
        timestamp: Date.now(),
      });
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to log role change to audit log:", auditError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: userId,
          role: role,
          previousRole: currentUser.role,
        },
        message: "User role updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (process.env.NODE_ENV === "development") {
      console.error("Error updating user role:", errorMessage);
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user role",
        message: errorMessage,
        code: "UPDATE_USER_ROLE_ERROR",
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


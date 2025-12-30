import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import * as bcrypt from "bcryptjs";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/security/audit-logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validatePassword } from "@/lib/validation/password";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type AdminSession = NonNullable<Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>>;

interface UpdateUserData {
  name?: string;
  email?: string;
  role?: "admin" | "provider" | "demo" | "patient";
  isActive?: boolean;
  passwordHash?: string;
  updatedAt: number;
}

/**
 * PUT /api/admin/users/[id]
 * Updates a user
 * Requires admin role
 */
export async function PUT(
  request: NextRequest,
  { params }: any
) {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // TypeScript now knows authResult is the authorized branch
    const adminTenantId = authResult.tenantId;
    const session = authResult.session as AdminSession;

    // Parse request body
    const body = await request.json();
    const { name, email, role, isActive, password } = body;

    // Validate email format if email is provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        await logAdminAction(
          request,
          "user_update_failed",
          "user",
          { userId: params.id, reason: "Invalid email format" },
          false,
          "Invalid email format"
        );
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "Invalid email format",
            code: "INVALID_EMAIL_FORMAT"
          },
          { status: 400 }
        );
      }
    }

    // Check if user exists and belongs to admin's tenant
    const existingUser = await convex.query((api as any).admin.users.getUserById, {
      id: params.id as Id<"users">,
    });

    if (!existingUser) {
      await logAdminAction(
        request,
        "user_update_failed",
        "user",
        { userId: params.id, reason: "User not found" },
        false,
        "User not found"
      );
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
          message: "User with the specified ID does not exist",
          code: "USER_NOT_FOUND"
        },
        { status: 404 }
      );
    }

    // Validate tenant isolation - ensure user belongs to admin's tenant
    if (existingUser.tenantId !== adminTenantId) {
      await logAdminAction(
        request,
        "user_update_failed",
        "user",
        {
          userId: params.id,
          userTenantId: existingUser.tenantId,
          adminTenantId,
          reason: "Tenant isolation violation",
        },
        false,
        "Cannot access users from other tenants"
      );
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "Cannot access users from other tenants",
          code: "TENANT_ISOLATION_VIOLATION"
        },
        { status: 403 }
      );
    }

    // Check email uniqueness if email is being updated
    if (email && email !== existingUser.email) {
      try {
        const emailUser = await convex.query(api.users.getUserByEmail, {
          email,
          tenantId: adminTenantId,
        });

        if (emailUser && emailUser._id !== params.id) {
          await logAdminAction(
            request,
            "user_update_failed",
            "user",
            { userId: params.id, reason: "Email already in use" },
            false,
            "Email already in use"
          );
          return NextResponse.json(
            {
              success: false,
              error: "Validation error",
              message: "Another user with this email already exists",
              code: "EMAIL_ALREADY_EXISTS"
            },
            { status: 409 }
          );
        }
      } catch (convexError) {
        const errorMessage = convexError instanceof Error ? convexError.message : String(convexError);
        
        // Check if this is a "function not found" error
        if (errorMessage.includes("Could not find public function") || 
            errorMessage.includes("Did you forget to run")) {
          console.error("❌ Convex function not deployed:", errorMessage);
          return NextResponse.json(
            {
              success: false,
              error: "Convex function not deployed",
              message: "The Convex function 'users:getUserByEmail' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
              code: "CONVEX_FUNCTION_NOT_DEPLOYED",
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
        throw convexError;
      }
    }

    // Validate password if provided
    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        await logAdminAction(
          request,
          "user_update_failed",
          "user",
          { userId: params.id, reason: passwordValidation.error },
          false,
          passwordValidation.error || "Password validation failed"
        );
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: passwordValidation.error,
            code: passwordValidation.code || "PASSWORD_VALIDATION_FAILED"
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data with proper typing
    const updateData: UpdateUserData = {
      updatedAt: Date.now(),
    };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Hash password if provided (validation already passed)
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Update user via Convex mutation
    await convex.mutation((api as any).admin.users.updateUserMutation, {
      id: params.id as Id<"users">,
      ...updateData,
    });

    // Log successful update
    await logAdminAction(
      request,
      "user_updated",
      "user",
      {
        userId: params.id,
        updatedFields: Object.keys(updateData).filter(
          (key) => key !== "updatedAt"
        ),
        adminId: session.user.id,
        tenantId: adminTenantId,
      },
      true
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          message: "User updated successfully",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Error updating user:", errorMessage);
    await logAdminAction(
      request,
      "user_update_failed",
      "user",
      { userId: params.id },
      false,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user",
        message: errorMessage,
        code: "UPDATE_USER_ERROR",
        ...(process.env.NODE_ENV === 'development' && {
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
 * DELETE /api/admin/users/[id]
 * Soft deletes a user (sets isActive = false)
 * Requires admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: any
) {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // TypeScript now knows authResult is the authorized branch
    const adminTenantId = authResult.tenantId;
    const session = authResult.session as AdminSession;

    // Check if user exists and belongs to admin's tenant
    const existingUser = await convex.query((api as any).admin.users.getUserById, {
      id: params.id as Id<"users">,
    });

    if (!existingUser) {
      await logAdminAction(
        request,
        "user_delete_failed",
        "user",
        { userId: params.id, reason: "User not found" },
        false,
        "User not found"
      );
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
          message: "User with the specified ID does not exist",
          code: "USER_NOT_FOUND"
        },
        { status: 404 }
      );
    }

    // Validate tenant isolation - ensure user belongs to admin's tenant
    if (existingUser.tenantId !== adminTenantId) {
      await logAdminAction(
        request,
        "user_delete_failed",
        "user",
        {
          userId: params.id,
          userTenantId: existingUser.tenantId,
          adminTenantId,
          reason: "Tenant isolation violation",
        },
        false,
        "Cannot access users from other tenants"
      );
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "Cannot access users from other tenants",
          code: "TENANT_ISOLATION_VIOLATION"
        },
        { status: 403 }
      );
    }

    // Soft delete user via Convex mutation
    await convex.mutation((api as any).admin.users.deleteUserMutation, {
      id: params.id as Id<"users">,
    });

    // Log successful deletion
    await logAdminAction(
      request,
      "user_deleted",
      "user",
      {
        userId: params.id,
        userEmail: existingUser.email,
        adminId: session.user.id,
        tenantId: adminTenantId,
      },
      true
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          message: "User deleted successfully",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Error deleting user:", errorMessage);
    await logAdminAction(
      request,
      "user_delete_failed",
      "user",
      { userId: params.id },
      false,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete user",
        message: errorMessage,
        code: "DELETE_USER_ERROR",
        ...(process.env.NODE_ENV === 'development' && {
          details: {
            stack: error instanceof Error ? error.stack : undefined,
          },
        }),
      },
      { status: 500 }
    );
  }
}

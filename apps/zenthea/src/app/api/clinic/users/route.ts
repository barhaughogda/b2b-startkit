import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { validatePassword } from "@/lib/validation/password";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/clinic/users
 * Get list of clinic users with pagination, filtering, and search
 * Owner-only endpoint
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const status = searchParams.get("status") as "active" | "inactive" | null;
    const search = searchParams.get("search") || undefined;
    const isOwnerParam = searchParams.get("isOwner");
    const isOwner =
      isOwnerParam === "true"
        ? true
        : isOwnerParam === "false"
        ? false
        : undefined;

    // Query Convex for users
    let result;
    try {
      result = await convex.query(
        (api as any).clinic?.users?.getClinicUsers as any,
        {
          tenantId,
          userEmail: session.user.email!,
          page,
          limit,
          status: status || undefined,
          search,
          isOwner,
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
              "The Convex function 'clinic/users:getClinicUsers' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          { error: "Only clinic owners can view users" },
          { status: 403 }
        );
      }

      // For other Convex errors, log and re-throw
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Convex query failed:", {
          error: errorMessage,
          apiPath: "(api as any).clinic.users.getClinicUsers",
        });
      }
      throw convexError;
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching users:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch users",
        message: errorMessage,
        code: "FETCH_USERS_ERROR",
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
 * POST /api/clinic/users
 * Create a new clinic user
 * Owner-only endpoint
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const {
      email,
      name,
      password,
      isOwner,
      departmentIds,
      customRoleId,
    } = body;

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Missing required fields: email, name, password",
          code: "MISSING_REQUIRED_FIELDS",
        },
        { status: 400 }
      );
    }

    // Validate email format
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

    // Validate password strength
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

    // Create user via Convex action
    let result;
    try {
      result = await convex.action(
        (api as any).clinic?.users?.createClinicUser as any,
        {
          tenantId,
          userEmail: session.user.email!,
          email: email.trim(),
          name: name.trim(),
          password,
          isOwner: isOwner ?? false,
          departmentIds: departmentIds || [],
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
              "The Convex function 'clinic/users:createClinicUser' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          { error: "Only clinic owners can create users" },
          { status: 403 }
        );
      }

      if (errorMessage.includes("already exists")) {
        return NextResponse.json(
          {
            success: false,
            error: "User already exists",
            message: errorMessage,
            code: "USER_ALREADY_EXISTS",
          },
          { status: 409 }
        );
      }

      if (
        errorMessage.includes("not found") ||
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
          apiPath: "(api as any).clinic.users.createClinicUser",
        });
      }
      throw convexError;
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "user_created",
        resource: "users",
        resourceId: result.userId,
        details: {
          createdEmail: email,
          createdName: name,
          isOwner: isOwner ?? false,
          departmentIds: departmentIds || [],
          customRoleId: customRoleId || undefined,
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
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create user",
        message: errorMessage,
        code: "CREATE_USER_ERROR",
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


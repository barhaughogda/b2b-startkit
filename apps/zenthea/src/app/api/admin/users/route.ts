import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import * as bcrypt from "bcryptjs";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/security/audit-logger";
import { getZentheaServerSession } from "@/lib/auth";
import { validatePassword } from "@/lib/validation/password";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type AdminSession = NonNullable<Awaited<ReturnType<typeof getZentheaServerSession>>>;

/**
 * GET /api/admin/users
 * Returns paginated list of users with filtering and search
 * Requires admin role
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // TypeScript now knows authResult is the authorized branch
    const tenantId = authResult.tenantId || "demo-tenant";

    // Validate tenantId
    if (!tenantId || typeof tenantId !== "string" || tenantId.trim() === "") {
      console.error("❌ Invalid tenantId:", tenantId);
      return NextResponse.json(
        {
          success: false,
          error: "Configuration error",
          message: "Invalid tenant ID",
        },
        { status: 500 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const role = searchParams.get("role") as
      | "admin"
      | "provider"
      | "demo"
      | "patient"
      | null;
    const status = searchParams.get("status") as "active" | "inactive" | null;
    const search = searchParams.get("search") || undefined;

    // Query Convex for users
    let result;
    try {
      result = await convex.query((api as any).admin.users.getUsers, {
        tenantId,
        page,
        limit,
        role: role || undefined,
        status: status || undefined,
        search,
      });
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
            message: "The Convex function 'admin/users:getUsers' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
      
      // For other Convex errors, log and re-throw
      console.error("❌ Convex query failed:", {
        error: errorMessage,
        tenantId,
        apiPath: "(api as any).admin.users.getUsers",
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("❌ Error fetching users:", errorMessage);
    
    // Return user-friendly error message
    return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch users",
          message: errorMessage,
          code: "FETCH_USERS_ERROR",
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
 * POST /api/admin/users
 * Creates a new user
 * Requires admin role
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // TypeScript now knows authResult is the authorized branch
    const tenantId = authResult.tenantId;
    const session = authResult.session as AdminSession;

    // Parse request body
    const body = await request.json();
    const { email, name, role, password } = body;

    // Validate required fields
    if (!email || !name || !role || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Missing required fields: email, name, role, password",
          code: "MISSING_REQUIRED_FIELDS"
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
          code: "INVALID_EMAIL_FORMAT"
        },
        { status: 400 }
      );
    }

    // Validate password strength using shared utility
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      await logAdminAction(
        request,
        "user_create_failed",
        "user",
        { email, reason: passwordValidation.error },
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

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await convex.query(api.users.getUserByEmail, {
        email,
        tenantId,
      });
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

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User already exists",
          message: "A user with this email already exists",
          code: "USER_ALREADY_EXISTS"
        },
        { status: 409 }
      );
    }

    // Hash password and create user via Convex mutation
    let passwordHash: string;
    try {
      passwordHash = await bcrypt.hash(password, 10);
    } catch (error) {
      console.error("Error hashing password:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to hash password",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    const now = Date.now();
    let userId;
    try {
      userId = await convex.mutation((api as any).admin.users.createUserMutation, {
        email,
        name,
        role,
        passwordHash,
        isActive: true,
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
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
            message: "The Convex function 'admin/users:createUserMutation' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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

    // Log successful user creation
    await logAdminAction(
      request,
      "user_created",
      "user",
      {
        userId,
        email,
        name,
        role,
        adminId: session.user.id,
        tenantId,
      },
      true
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          userId,
          message: "User created successfully",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Error creating user:", errorMessage);
    // Note: email may not be available if error occurred before parsing body
    await logAdminAction(
      request,
      "user_create_failed",
      "user",
      {},
      false,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create user",
        message: errorMessage,
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


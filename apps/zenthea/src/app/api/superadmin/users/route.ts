import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "@/lib/superadmin-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/superadmin/users
 * Returns list of all users across all tenants with pagination, filtering, search, and sorting
 * Requires superadmin role
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin authorization
    const authResult = await verifySuperAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const role = searchParams.get("role") as
      | "admin"
      | "provider"
      | "demo"
      | "patient"
      | "super_admin"
      | null;
    const status = searchParams.get("status") as "active" | "inactive" | null;
    const tenantId = searchParams.get("tenantId") || undefined;
    const search = searchParams.get("search") || undefined;
    const sortBy = searchParams.get("sortBy") as
      | "name"
      | "email"
      | "role"
      | "createdAt"
      | "lastLogin"
      | null;
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" | null;

    // Validate pagination
    if (page < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid page number",
          message: "Page must be greater than 0",
        },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid limit",
          message: "Limit must be between 1 and 100",
        },
        { status: 400 }
      );
    }

    // Query Convex for user list
    let result;
    try {
      result = await convex.query((api as any).admin.users.listUsersForSuperadmin, {
        page,
        limit,
        role: role || undefined,
        status: status || undefined,
        tenantId,
        search,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      });
    } catch (convexError) {
      const errorMessage =
        convexError instanceof Error ? convexError.message : String(convexError);

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
              "The Convex function 'admin/users:listUsersForSuperadmin' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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

      // For other Convex errors, log and re-throw
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Convex query failed:", {
          error: errorMessage,
          apiPath: "(api as any).admin.users.listUsersForSuperadmin",
        });
      }
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching users:", errorMessage);
    }
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


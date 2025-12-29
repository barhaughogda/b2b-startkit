import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "@/lib/superadmin-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/superadmin/tenants/check-domain
 * Checks if a tenant ID or custom domain is available
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
    const id = searchParams.get("id");
    const customDomain = searchParams.get("customDomain");

    if (!id && !customDomain) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          message: "Either 'id' or 'customDomain' query parameter is required",
        },
        { status: 400 }
      );
    }

    // Check availability via Convex
    let availability;
    try {
      availability = await convex.query(
        (api as any).admin.tenants.checkTenantAvailability,
        {
          id: id || undefined,
          customDomain: customDomain || undefined,
        }
      );
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
              "The Convex function 'admin/tenants:checkTenantAvailability' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          apiPath: "(api as any).admin.tenants.checkTenantAvailability",
        });
      }
      throw convexError;
    }

    return NextResponse.json(
      {
        success: true,
        data: availability,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (process.env.NODE_ENV === "development") {
      console.error("Error checking tenant availability:", errorMessage);
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check tenant availability",
        message: errorMessage,
        code: "CHECK_AVAILABILITY_ERROR",
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


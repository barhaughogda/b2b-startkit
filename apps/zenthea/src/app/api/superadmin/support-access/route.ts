import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "@/lib/superadmin-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { sendSupportAccessRequestEmail } from "@/lib/email/support-access-email";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/superadmin/support-access
 * Create a new support access request
 * Requires superadmin role
 */
export async function POST(request: NextRequest) {
  try {
    // Verify superadmin authorization
    const authResult = await verifySuperAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const session = authResult.session;
    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "User email not found",
          code: "USER_EMAIL_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { targetTenantId, targetUserId, purpose } = body;

    // Validate required fields
    if (!targetTenantId || !purpose) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "targetTenantId and purpose are required",
          code: "MISSING_REQUIRED_FIELDS",
        },
        { status: 400 }
      );
    }

    // Validate purpose is not empty
    if (typeof purpose !== "string" || purpose.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid purpose",
          message: "Purpose must be a non-empty string",
          code: "INVALID_PURPOSE",
        },
        { status: 400 }
      );
    }

    // Get IP address and user agent for audit logging
    const ipAddress = request.ip || request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    // Create support access request via Convex
    try {
      const result = await convex.mutation(
        (api as any).superadmin.supportAccess.requestSupportAccess,
        {
          userEmail,
          targetTenantId,
          targetUserId: targetUserId ? (targetUserId as Id<"users">) : undefined,
          purpose: purpose.trim(),
          ipAddress,
          userAgent,
        }
      );

      // Send notification email to target user if targetUserId is provided
      if (result.targetUserEmail) {
        try {
          await sendSupportAccessRequestEmail({
            targetUserEmail: result.targetUserEmail,
            requestId: result.requestId,
            superadminName: result.superadminName || result.superadminEmail || "Zenthea Support",
            purpose: result.purpose,
            targetTenantId: result.targetTenantId,
            targetUserId: result.targetUserId,
          });
        } catch (emailError) {
          // Log email error but don't fail the request creation
          // The request was created successfully, email failure shouldn't block the operation
          console.error("Failed to send support access request notification email:", emailError);
          // In development, we might want to see this error more prominently
          if (process.env.NODE_ENV === "development") {
            console.warn("⚠️ Support access request created but notification email failed");
          }
        }
      } else {
        // For tenant-level access (no targetUserId), log that notification should be sent to tenant admins
        // TODO: Implement tenant admin notification for tenant-level access requests
        if (process.env.NODE_ENV === "development") {
          console.log("ℹ️ Tenant-level support access request created. Notification to tenant admins not yet implemented.");
        }
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            requestId: result.requestId,
          },
        },
        { status: 201 }
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
              "The Convex function 'superadmin/supportAccess:requestSupportAccess' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
            code: "CONVEX_FUNCTION_NOT_DEPLOYED",
            ...(process.env.NODE_ENV === "development" && {
              details: {
                error: errorMessage,
                solution: "Run 'npx convex dev' in a separate terminal to sync Convex functions",
              },
            }),
          },
          { status: 503 }
        );
      }

      // For other Convex errors, return error response
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create support access request",
          message: errorMessage,
          code: "CONVEX_ERROR",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (process.env.NODE_ENV === "development") {
      console.error("❌ Error creating support access request:", errorMessage);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: errorMessage,
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/superadmin/support-access
 * Get all support access requests for the authenticated superadmin
 * Requires superadmin role
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin authorization
    const authResult = await verifySuperAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const session = authResult.session;
    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "User email not found",
          code: "USER_EMAIL_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as
      | "pending"
      | "approved"
      | "denied"
      | "expired"
      | null;

    // Get support access requests via Convex
    try {
      const requests = await convex.query(
        (api as any).superadmin.supportAccess.getSupportAccessRequests,
        {
          userEmail,
          status: status || undefined,
        }
      );

      return NextResponse.json(
        {
          success: true,
          data: requests,
        },
        { status: 200 }
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
              "The Convex function 'superadmin/supportAccess:getSupportAccessRequests' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
            code: "CONVEX_FUNCTION_NOT_DEPLOYED",
            ...(process.env.NODE_ENV === "development" && {
              details: {
                error: errorMessage,
                solution: "Run 'npx convex dev' in a separate terminal to sync Convex functions",
              },
            }),
          },
          { status: 503 }
        );
      }

      // For other Convex errors, return error response
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch support access requests",
          message: errorMessage,
          code: "CONVEX_ERROR",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (process.env.NODE_ENV === "development") {
      console.error("❌ Error fetching support access requests:", errorMessage);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: errorMessage,
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}


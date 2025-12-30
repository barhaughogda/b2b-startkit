import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { DigitalSignature } from "@/types";
import { sendSupportAccessApprovalEmail } from "@/lib/email/support-access-email";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/superadmin/support-access/[requestId]/approve
 * Approve a support access request with digital signature
 * Requires authentication and user must be the target user
 */
export async function POST(
  request: NextRequest,
  { params }: any
) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const requestId = params.requestId as Id<"supportAccessRequests">;

    // Validate requestId format
    if (!requestId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing request ID",
          code: "MISSING_REQUEST_ID",
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { digitalSignature } = body;

    // Validate digital signature
    if (!digitalSignature) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing digital signature",
          code: "MISSING_SIGNATURE",
        },
        { status: 400 }
      );
    }

    // Validate signature structure
    const signature: DigitalSignature = digitalSignature;
    if (
      !signature.signatureData ||
      !signature.signedAt ||
      !signature.consentText
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid signature format",
          code: "INVALID_SIGNATURE_FORMAT",
        },
        { status: 400 }
      );
    }

    // Get IP address and user agent for audit logging
    const ipAddress =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    // Approve support access request via Convex
    try {
      const result = await convex.mutation(
        (api as any).superadmin.supportAccess.approveSupportAccess,
        {
          requestId,
          userEmail,
          digitalSignature: signature,
          ipAddress,
          userAgent,
        }
      );

      // Send approval notification email to superadmin
      try {
        await sendSupportAccessApprovalEmail({
          superadminEmail: result.superadminEmail,
          requestId: result.requestId,
          targetUserEmail: result.targetUserEmail,
          targetUserName: result.targetUserName || session.user.name || undefined,
          purpose: result.purpose,
          expirationTimestamp: result.expirationTimestamp,
          targetTenantId: result.targetTenantId,
        });
      } catch (emailError) {
        // Log email error but don't fail the approval
        // The request was approved successfully, email failure shouldn't block the operation
        console.error("Failed to send support access approval notification email:", emailError);
        // In development, we might want to see this error more prominently
        if (process.env.NODE_ENV === "development") {
          console.warn("⚠️ Support access request approved but notification email failed");
        }
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            expirationTimestamp: result.expirationTimestamp,
          },
        },
        { status: 200 }
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
              "The Convex function 'superadmin/supportAccess:approveSupportAccess' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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

      // For other Convex errors, return error response
      return NextResponse.json(
        {
          success: false,
          error: "Failed to approve support access request",
          message: errorMessage,
          code: "CONVEX_ERROR",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (process.env.NODE_ENV === "development") {
      console.error("❌ Error approving support access request:", errorMessage);
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


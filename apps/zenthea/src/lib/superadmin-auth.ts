import { NextRequest, NextResponse } from "next/server";
import { getZentheaServerSession } from "@/lib/auth";

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getSupportAccessErrorMessage } from "./support-access";

/**
 * Helper function to verify superadmin authorization
 * Returns session if authorized, or error response if not
 */
export async function verifySuperAdminAuth(request: NextRequest): Promise<
  | { authorized: true; session: NonNullable<Awaited<ReturnType<typeof getZentheaServerSession>>> }
  | { authorized: false; response: NextResponse }
> {
  try {
    const session = await getZentheaServerSession();
    
    if (!session || !session.user) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: "Authentication required",
            code: "AUTHENTICATION_REQUIRED"
          },
          { status: 401 }
        ),
      };
    }

    if (session.user.role !== "super_admin") {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: "Forbidden - Superadmin access required",
            code: "SUPERADMIN_ACCESS_REQUIRED"
          },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      session,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("❌ verifySuperAdminAuth: Error getting session:", error);
    }
    return {
      authorized: false,
      response: NextResponse.json(
        { 
          error: "Authentication error",
          message: error instanceof Error ? error.message : "Unknown error",
          code: "AUTHENTICATION_ERROR"
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Verify superadmin support access for routes that access user/tenant data
 * This function checks if a valid support access request exists and is not expired
 * 
 * @param request - The Next.js request object
 * @param targetUserId - Optional ID of the user account being accessed
 * @param targetTenantId - ID of the tenant being accessed
 * @returns Support access verification result
 */
export async function verifySuperAdminSupportAccess(
  request: NextRequest,
  targetUserId: string | undefined,
  targetTenantId: string
): Promise<
  | { authorized: true; requestId: string; expiresAt: number }
  | { authorized: false; response: NextResponse }
> {
  try {
    // First verify superadmin auth
    const authResult = await verifySuperAdminAuth(request);
    if (!authResult.authorized) {
      return authResult;
    }

    const session = authResult.session;
    const userEmail = session.user.email;

    if (!userEmail) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: "User email not found",
            code: "USER_EMAIL_NOT_FOUND"
          },
          { status: 401 }
        ),
      };
    }

    // Validate targetTenantId is provided
    if (!targetTenantId) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: "Target tenant ID is required for support access",
            code: "TARGET_TENANT_ID_REQUIRED"
          },
          { status: 400 }
        ),
      };
    }

    // Call Convex action to verify support access
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const ipAddress = (request as any).ip || request.headers.get('x-forwarded-for') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await convex.mutation(
      (api as any).superadmin.supportAccess.verifySupportAccessAction,
      {
        userEmail,
        targetUserId: targetUserId as Id<"users"> | undefined,
        targetTenantId,
        ipAddress,
        userAgent,
      }
    );

    if (!result.authorized) {
      const errorMessage = getSupportAccessErrorMessage(result.error || "Support access validation failed");
      
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: "Support access required",
            message: errorMessage,
            code: "SUPPORT_ACCESS_REQUIRED",
            details: result.error,
          },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      requestId: result.requestId!,
      expiresAt: result.expiresAt!,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("❌ verifySuperAdminSupportAccess: Error verifying support access:", error);
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check if this is a "function not found" error
    if (
      errorMessage.includes("Could not find public function") ||
      errorMessage.includes("Did you forget to run")
    ) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: "Support access verification unavailable",
            message: "The Convex function for support access verification is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
            code: "CONVEX_FUNCTION_NOT_DEPLOYED",
            ...(process.env.NODE_ENV === 'development' && {
              details: {
                error: errorMessage,
                solution: "Run 'npx convex dev' in a separate terminal to sync Convex functions",
              },
            }),
          },
          { status: 503 }
        ),
      };
    }

    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: "Support access verification failed",
          message: errorMessage,
          code: "SUPPORT_ACCESS_VERIFICATION_ERROR"
        },
        { status: 500 }
      ),
    };
  }
}


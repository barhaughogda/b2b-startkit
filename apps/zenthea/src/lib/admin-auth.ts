import { NextRequest, NextResponse } from "next/server";
import { getZentheaServerSession } from "@/lib/auth";


/**
 * Type representing an admin session
 */
export type AdminSession = NonNullable<Awaited<ReturnType<typeof getZentheaServerSession>>>;

/**
 * Helper function to verify admin authorization
 * Returns session and tenantId if authorized, or error response if not
 */
export async function verifyAdminAuth(request: NextRequest): Promise<
  | { authorized: true; session: AdminSession; tenantId: string }
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

    if (session.user.role !== "admin") {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: "Forbidden - Admin access required",
            code: "ADMIN_ACCESS_REQUIRED"
          },
          { status: 403 }
        ),
      };
    }

    const tenantId = session.user.tenantId;

    // Fail fast if tenantId is missing in production
    if (!tenantId) {
      if (process.env.NODE_ENV === 'production') {
        return {
          authorized: false,
          response: NextResponse.json(
            {
              error: "Configuration error",
              message: "Tenant ID required",
              code: "MISSING_TENANT_ID"
            },
            { status: 500 }
          ),
        };
      }
      // In development, fall back to demo-tenant for easier testing
      console.warn('⚠️ Admin user missing tenantId, falling back to demo-tenant', {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
      });
      return {
        authorized: true,
        session,
        tenantId: "demo-tenant",
      };
    }

    return {
      authorized: true,
      session,
      tenantId,
    };
  } catch (error) {
    console.error("❌ verifyAdminAuth: Error getting session:", error);
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

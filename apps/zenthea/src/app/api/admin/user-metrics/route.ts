import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

export async function GET(request: NextRequest) {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  try {
    // Verify admin authorization
    const authResult = await verifyAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // TypeScript now knows authResult is the authorized branch
    const tenantId = authResult.tenantId;

    // Query Convex for user metrics
    const metrics = await convex.query((api as any).admin.userMetrics.getUserMetrics, {
      tenantId,
    });

    return NextResponse.json(
      {
        success: true,
        data: metrics,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Error fetching user metrics:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user metrics",
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


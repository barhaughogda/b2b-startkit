import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";
import { logger } from "@/lib/logger";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/company/users/[id]/unlock
 * Unlock a user account that was locked due to failed login attempts
 * Owner-only endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is owner or superadmin
    const isOwner = session.user.isOwner === true;
    const isSuperAdmin = session.user.role === "super_admin";

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Owner or superadmin access required" },
        { status: 403 }
      );
    }

    const userId = params.id as Id<"users">;
    const unlockedBy = session.user.id as Id<"users">;

    // Unlock the account
    const result = await convex.action(api.users.unlockAccount, {
      userId,
      unlockedBy,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.message,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error unlocking account", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Failed to unlock account",
      },
      { status: 500 }
    );
  }
}


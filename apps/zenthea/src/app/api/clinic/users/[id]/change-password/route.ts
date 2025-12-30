import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";
import { logger } from "@/lib/logger";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/clinic/users/[id]/change-password
 * Change user password (user can change their own password, or owner can change any user's password)
 * Special handling: If passwordExpired flag is set, allows password change without session authentication
 * (user must provide current password for verification)
 */
export async function POST(
  request: NextRequest,
  { params }: any
) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { currentPassword, newPassword, passwordExpired } = body;

    const userId = params.id as Id<"users">;

    // If password is expired, allow password change without session authentication
    // User must provide current password for verification
    if (passwordExpired === true) {
      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: "Missing required fields: currentPassword and newPassword" },
          { status: 400 }
        );
      }

      // Validate new password using password policy
      const validation = validatePasswordPolicy(newPassword);
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: "Password validation failed",
            message: validation.error,
            code: validation.code,
            details: validation.details,
          },
          { status: 400 }
        );
      }

      // Change password via Convex (will verify current password)
      const result = await convex.action(api.users.changePassword, {
        userId,
        currentPassword,
        newPassword,
      });

      return NextResponse.json({
        ...result,
        success: true,
        message: "Password changed successfully",
      });
    }

    // Normal password change requires authentication
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = session.user.id as Id<"users">;
    const isOwner = session.user.isOwner === true;

    // Users can only change their own password unless they're an owner
    if (userId !== currentUserId && !isOwner) {
      return NextResponse.json(
        { error: "Forbidden - You can only change your own password" },
        { status: 403 }
      );
    }

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields: currentPassword and newPassword" },
        { status: 400 }
      );
    }

    // Validate new password using password policy
    const validation = validatePasswordPolicy(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Password validation failed",
          message: validation.error,
          code: validation.code,
          details: validation.details,
        },
        { status: 400 }
      );
    }

    // Change password via Convex
    // Note: If user is changing their own expired password, we don't require currentPassword verification
    // The authenticateUser already verified the password, so we can trust the session
    // However, for security, we still require currentPassword for normal password changes
    const result = await convex.action(api.users.changePassword, {
      userId,
      currentPassword,
      newPassword,
    });

    return NextResponse.json({
      ...result,
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error("Password change error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to change password",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}


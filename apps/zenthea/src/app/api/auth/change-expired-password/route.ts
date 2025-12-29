import { NextRequest, NextResponse } from "next/server";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { logger } from "@/lib/logger";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/auth/change-expired-password
 * Change expired password using email/tenantId (no session authentication required)
 * User must provide current password for verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, tenantId, currentPassword, newPassword } = body;

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields: email, currentPassword, and newPassword" },
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

    // Get user by email and tenantId
    const user = await convex.query(api.users.getUserByEmail, {
      email,
      tenantId: tenantId || undefined,
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "User account is inactive" },
        { status: 403 }
      );
    }

    // Verify current password
    const bcrypt = require("bcryptjs");
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Check if password is actually expired
    const expirationStatus = await convex.action(api.users.checkPasswordExpiration, {
      userId: user._id,
    });

    if (!expirationStatus.expired) {
      return NextResponse.json(
        { error: "Password is not expired. Use the regular password change endpoint." },
        { status: 400 }
      );
    }

    // Change password via Convex
    const result = await convex.action(api.users.changePassword, {
      userId: user._id,
      currentPassword,
      newPassword,
    });

    return NextResponse.json({
      ...result,
      success: true,
      message: "Password changed successfully. Please sign in with your new password.",
    });
  } catch (error) {
    logger.error("Expired password change error", {
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


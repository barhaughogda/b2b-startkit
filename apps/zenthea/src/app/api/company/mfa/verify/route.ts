import { NextRequest, NextResponse } from "next/server";
import { getZentheaServerSession } from "@/lib/auth";

import { verifyTOTP, validateTOTPCodeFormat, validateBackupCodeFormat, encryptTOTPSecret } from "@/lib/mfa";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";
import { logger } from "@/lib/logger";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Force dynamic rendering - this route uses session which requires headers
export const dynamic = 'force-dynamic';

/**
 * POST /api/company/mfa/verify
 * Verify TOTP code and complete MFA setup
 * User can only verify MFA for themselves
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getZentheaServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is clinic user (with backward compatibility)
    const isClinicUser =
      session.user.role === "clinic_user" ||
      session.user.role === "admin" ||
      session.user.role === "provider";

    if (!isClinicUser && session.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden - Clinic access required" },
        { status: 403 }
      );
    }

    const userId = session.user.id as Id<"users">;

    // Parse request body
    const body = await request.json();
    const { code, secret, backupCodes } = body;

    // Validate required fields
    if (!code || !secret || !backupCodes) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Missing required fields: code, secret, and backupCodes",
        },
        { status: 400 }
      );
    }

    // Validate code format
    if (!validateTOTPCodeFormat(code)) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Invalid TOTP code format. Code must be 6 digits.",
        },
        { status: 400 }
      );
    }

    // Validate backup codes format if provided
    if (backupCodes && Array.isArray(backupCodes)) {
      for (const backupCode of backupCodes) {
        if (typeof backupCode === 'string' && !validateBackupCodeFormat(backupCode)) {
          return NextResponse.json(
            {
              success: false,
              error: "Validation error",
              message: "Invalid backup code format. Backup codes must be in format XXXX-XXXX.",
            },
            { status: 400 }
          );
        }
      }
    }

    // Verify TOTP code
    const isValid = verifyTOTP(secret, code);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification failed",
          message: "Invalid TOTP code. Please try again.",
        },
        { status: 400 }
      );
    }

    // Encrypt the secret before storing
    const encryptedSecret = await encryptTOTPSecret(secret, userId);

    // Complete MFA setup via Convex
    const result = await convex.action(api.mfa.setupMFA, {
      userId,
      encryptedSecret,
      backupCodes,
    });

    // Update verification timestamp
    await convex.action(api.mfa.confirmTOTPVerification, {
      userId,
      code,
    });

    return NextResponse.json({
      ...result,
      success: true,
      message: "MFA setup completed successfully",
    });
  } catch (error) {
    logger.error("MFA verification error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify MFA setup",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}


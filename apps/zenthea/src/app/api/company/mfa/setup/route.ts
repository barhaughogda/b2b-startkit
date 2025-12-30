import { NextRequest, NextResponse } from "next/server";
import { getZentheaServerSession } from "@/lib/auth";

import { getTOTPSetupInfo, encryptTOTPSecret } from "@/lib/mfa";
import { Id } from "@/convex/_generated/dataModel";
import { logger } from "@/lib/logger";

// Force dynamic rendering - this route uses session which requires headers
export const dynamic = 'force-dynamic';

/**
 * POST /api/company/mfa/setup
 * Generate TOTP setup information (secret, QR code, backup codes)
 * User can only set up MFA for themselves
 */
export async function POST(_request: NextRequest) {
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
    const email = session.user.email || "";

    if (!email) {
      return NextResponse.json(
        { error: "User email not found in session" },
        { status: 400 }
      );
    }

    // Generate TOTP setup information
    const setupInfo = await getTOTPSetupInfo(userId, email);

    // Encrypt the secret (will be stored encrypted)
    const encryptedSecret = await encryptTOTPSecret(setupInfo.secret, userId);

    // SECURITY NOTE: MFA Secret Handling
    // ===================================
    // The plaintext secret is returned to the client ONLY during initial setup for:
    // 1. QR code generation in the authenticator app
    // 2. Manual entry if QR code scanning fails
    //
    // Security considerations:
    // - The secret is ONLY returned during this one-time setup flow
    // - It is encrypted before storage (encryptedSecret field)
    // - The client MUST discard the plaintext secret after QR code generation
    // - The encrypted secret is sent to Convex on verification and stored securely
    // - Once setup is complete, the plaintext secret is never returned again
    //
    // Best practice: The client should clear the secret from memory after use
    // and never store it in localStorage or send it in subsequent requests.

    // Return setup information to client
    return NextResponse.json({
      success: true,
      secret: setupInfo.secret, // Plaintext secret for QR code and manual entry (ONE-TIME USE ONLY)
      qrCode: setupInfo.qrCode, // QR code data URL
      backupCodes: setupInfo.backupCodes, // Plaintext backup codes (will be hashed before storage)
      encryptedSecret, // Encrypted secret for storage (will be sent to Convex on verification)
    });
  } catch (error) {
    logger.error("MFA setup error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate MFA setup information",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}


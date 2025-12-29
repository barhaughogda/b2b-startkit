import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateBackupCodes } from "@/lib/mfa";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";
import { logger } from "@/lib/logger";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/clinic/mfa/regenerate-backup-codes
 * Regenerate backup codes for MFA
 * User can only regenerate backup codes for themselves
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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

    // Generate new backup codes (10 codes by default)
    const newBackupCodes = generateBackupCodes(10);

    // Regenerate backup codes via Convex (will hash and store them)
    const result = await convex.action(api.mfa.regenerateBackupCodes, {
      userId,
      newBackupCodes,
    });

    // Return the plaintext backup codes to the user
    // Note: These codes are only shown once - they are hashed before storage
    return NextResponse.json({
      ...result,
      backupCodes: newBackupCodes,
    });
  } catch (error) {
    logger.error("Backup code regeneration error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to regenerate backup codes",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}


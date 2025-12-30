import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { validatePassword } from "@/lib/validation/password";
import { logger } from "@/lib/logger";
import { callConvexAction } from "@/lib/convex-helpers";

type AcceptInvitationResult = {
  success: true;
  userId: Id<"users">;
  message: string;
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/company/invitations/accept/[token]
 * Accept an invitation and create user account
 */
export async function POST(
  request: NextRequest,
  { params }: any
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, password } = body;

    // Validate required fields
    if (!name || !password) {
      return NextResponse.json(
        { error: "Name and password are required" },
        { status: 400 }
      );
    }

    // Validate name
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          error: passwordValidation.error || "Invalid password",
          code: passwordValidation.code,
        },
        { status: 400 }
      );
    }

    // Accept invitation via Convex action
    const result = await callConvexAction<AcceptInvitationResult>(
      convex,
      "invitations.acceptInvitation",
      ["invitations", "acceptInvitation"],
      {
        token,
        name: name.trim(),
        password,
      },
      {
        errorCode: "ACCEPT_INVITATION_ERROR",
        errorMessage: "Failed to accept invitation",
      }
    );

    // Check if result is an error response
    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.json({
      success: true,
      message: result.data.message || "Invitation accepted successfully",
      userId: result.data.userId,
    });
  } catch (error) {
    logger.error("Error accepting invitation", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}


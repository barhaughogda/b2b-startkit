import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { validatePassword } from "@/lib/validation/password";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/clinic/invitations/accept/[token]
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
    const result = await convex.action((api as any).invitations?.acceptInvitation as any, {
      token,
      name: name.trim(),
      password,
    });

    return NextResponse.json({
      success: true,
      message: result.message || "Invitation accepted successfully",
      userId: result.userId,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);

    // Handle known errors
    if (error instanceof Error) {
      // Check for specific error messages
      if (
        error.message.includes("not found") ||
        error.message.includes("Invitation")
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (
        error.message.includes("expired") ||
        error.message.includes("already been")
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      if (error.message.includes("already exists")) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }

      if (error.message.includes("required")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}


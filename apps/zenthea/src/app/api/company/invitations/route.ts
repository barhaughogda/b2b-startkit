import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";
import { sendInvitationEmail } from "@/lib/email/invitation-email";
import { logger } from "@/lib/logger";
import { callConvexMutation, callConvexQuery } from "@/lib/convex-helpers";

type CreateInvitationResult = {
  invitationId: Id<"invitations">;
  token: string;
  expiresAt: number;
};

type Invitation = {
  _id: Id<"invitations">;
  tenantId: string;
  email: string;
  token: string;
  clinicIds: string[];
  customRoleId: Id<"customRoles">;
  invitedBy: Id<"users">;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expiresAt: number;
  acceptedAt?: number;
  acceptedBy?: Id<"users">;
  createdAt: number;
  updatedAt: number;
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Force dynamic rendering - this route uses session which requires headers
export const dynamic = 'force-dynamic';

/**
 * POST /api/company/invitations
 * Create a new user invitation
 * Owner-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
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

    const body = await request.json();
    const { email, clinicIds, customRoleId, expiresInDays } = body;

    // Validate required fields
    if (!email || !clinicIds || !customRoleId) {
      return NextResponse.json(
        { error: "Missing required fields: email, clinicIds, customRoleId" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    // Validate clinicIds is an array
    if (!Array.isArray(clinicIds) || clinicIds.length === 0) {
      return NextResponse.json(
        { error: "clinicIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Get tenant ID from session
    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in session" },
        { status: 400 }
      );
    }

    // Verify owner access via Convex (double-check on server side)
    // Note: The Convex mutation will also verify owner access, but we can add an extra check here
    // For now, we'll rely on the Convex mutation's verification

    // Create invitation via Convex mutation
    const mutationResult = await callConvexMutation<CreateInvitationResult>(
      convex,
      "invitations.createInvitation",
      ["invitations", "createInvitation"],
      {
        tenantId,
        email: email.trim(),
        clinicIds,
        customRoleId,
        invitedByEmail: session.user.email!,
        expiresInDays: expiresInDays || undefined,
      },
      {
        errorCode: "CREATE_INVITATION_ERROR",
        errorMessage: "Only clinic owners can create invitations",
      }
    );

    // Check if result is an error response
    if (mutationResult instanceof NextResponse) {
      return mutationResult;
    }

    const result = mutationResult.data;

    // Send invitation email
    try {
      // Get tenant name for email (optional - can be enhanced later)
      const tenantName = session.user.tenantId; // TODO: Fetch actual tenant name from Convex
      
      await sendInvitationEmail({
        email: email.trim(),
        invitationToken: result.token,
        invitedBy: session.user.name || session.user.email || "Clinic Owner",
        tenantName,
        expiresAt: result.expiresAt,
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      // The invitation was created successfully, email can be retried
      logger.error("Failed to send invitation email", {
        error: emailError instanceof Error ? emailError.message : String(emailError),
        stack: emailError instanceof Error ? emailError.stack : undefined,
        invitationId: result.invitationId,
      });
      // In production, you might want to queue this for retry
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "user_invitation_created",
        resource: "invitations",
        resourceId: result.invitationId,
        details: {
          invitedEmail: email,
          clinicIds,
          customRoleId,
          expiresAt: result.expiresAt,
        },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        timestamp: Date.now(),
      });
    } catch (auditError) {
      // Log audit error but don't fail the request
      logger.error("Failed to create audit log", {
        error: auditError instanceof Error ? auditError.message : String(auditError),
        stack: auditError instanceof Error ? auditError.stack : undefined,
        invitationId: result.invitationId,
      });
    }

    return NextResponse.json({
      success: true,
      invitationId: result.invitationId,
      expiresAt: result.expiresAt,
      message: "Invitation created successfully. Email will be sent shortly.",
    });
  } catch (error) {
    logger.error("Error creating invitation", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle known errors
    if (error instanceof Error) {
      // Check for specific error messages
      if (error.message.includes("Unauthorized") || error.message.includes("owner")) {
        return NextResponse.json(
          { error: "Only clinic owners can create invitations" },
          { status: 403 }
        );
      }

      if (error.message.includes("already exists")) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }

      if (error.message.includes("not found") || error.message.includes("Invalid")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/company/invitations
 * Get all invitations for the current tenant
 * Owner-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
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

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in session" },
        { status: 400 }
      );
    }

    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as
      | "pending"
      | "accepted"
      | "expired"
      | "cancelled"
      | null;

    // Get invitations via Convex query
    const queryResult = await callConvexQuery<Invitation[]>(
      convex,
      "invitations.getInvitationsByTenant",
      ["invitations", "getInvitationsByTenant"],
      {
        tenantId,
        userEmail: session.user.email!,
        status: status || undefined,
      },
      {
        errorCode: "FETCH_INVITATIONS_ERROR",
        errorMessage: "Only clinic owners can view invitations",
      }
    );

    // Check if result is an error response
    if (queryResult instanceof NextResponse) {
      return queryResult;
    }

    const invitations = queryResult.data;

    return NextResponse.json({
      success: true,
      invitations,
      count: invitations.length,
    });
  } catch (error) {
    logger.error("Error fetching invitations", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}


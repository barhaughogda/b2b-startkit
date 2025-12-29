import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { sendInvitationEmail } from "@/lib/email/invitation-email";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * PUT /api/clinic/invitations/[id]
 * Resend an invitation email
 * Owner-only endpoint
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const invitationId = params.id as Id<"invitations">;

    // Parse optional expiresInDays from request body
    let expiresInDays: number | undefined;
    try {
      const body = await request.json().catch(() => ({}));
      expiresInDays = body.expiresInDays;
    } catch {
      // Body is optional, continue without it
    }

    // Resend invitation via Convex mutation
    let result;
    try {
      result = await convex.mutation((api as any).invitations?.resendInvitation as any, {
        invitationId,
        userEmail: session.user.email!,
        expiresInDays: expiresInDays || undefined,
      });
    } catch (convexError) {
      const errorMessage =
        convexError instanceof Error
          ? convexError.message
          : String(convexError);

      if (
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("owner")
      ) {
        return NextResponse.json(
          { error: "Only clinic owners can resend invitations" },
          { status: 403 }
        );
      }

      if (errorMessage.includes("not found")) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 404 }
        );
      }

      if (
        errorMessage.includes("Cannot resend") ||
        errorMessage.includes("status")
      ) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        );
      }

      throw convexError;
    }

    // Fetch invitation details for email
    const invitations = await convex.query(
      (api as any).invitations?.getInvitationsByTenant as any,
      {
        tenantId,
        userEmail: session.user.email!,
      }
    );

    const invitation = invitations.find(
      (inv: any) => inv._id === invitationId
    );

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Send invitation email
    try {
      // Get tenant name for email (optional - can be enhanced later)
      const tenantName = session.user.tenantId; // TODO: Fetch actual tenant name from Convex

      await sendInvitationEmail({
        email: invitation.email,
        invitationToken: result.token,
        invitedBy: session.user.name || session.user.email || "Clinic Owner",
        tenantName,
        expiresAt: result.expiresAt,
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      // The invitation was updated successfully, email can be retried
      console.error("Failed to send invitation email:", emailError);
      // In production, you might want to queue this for retry
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "user_invitation_resent",
        resource: "invitations",
        resourceId: invitationId,
        details: {
          invitedEmail: invitation.email,
          newExpiresAt: result.expiresAt,
        },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        timestamp: Date.now(),
      });
    } catch (auditError) {
      // Log audit error but don't fail the request
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      invitationId,
      expiresAt: result.expiresAt,
      message: "Invitation resent successfully. Email will be sent shortly.",
    });
  } catch (error) {
    console.error("Error resending invitation:", error);

    return NextResponse.json(
      { error: "Failed to resend invitation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clinic/invitations/[id]
 * Cancel an invitation
 * Owner-only endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const invitationId = params.id as Id<"invitations">;

    // Fetch invitation details before canceling (for audit log)
    const invitations = await convex.query(
      (api as any).invitations?.getInvitationsByTenant as any,
      {
        tenantId,
        userEmail: session.user.email!,
      }
    );

    const invitation = invitations.find(
      (inv: any) => inv._id === invitationId
    );

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Cancel invitation via Convex mutation
    try {
      await convex.mutation((api as any).invitations?.cancelInvitation as any, {
        invitationId,
        userEmail: session.user.email!,
      });
    } catch (convexError) {
      const errorMessage =
        convexError instanceof Error
          ? convexError.message
          : String(convexError);

      if (
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("owner")
      ) {
        return NextResponse.json(
          { error: "Only clinic owners can cancel invitations" },
          { status: 403 }
        );
      }

      if (errorMessage.includes("not found")) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 404 }
        );
      }

      if (
        errorMessage.includes("Cannot cancel") ||
        errorMessage.includes("status")
      ) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        );
      }

      throw convexError;
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "user_invitation_cancelled",
        resource: "invitations",
        resourceId: invitationId,
        details: {
          invitedEmail: invitation.email,
          previousStatus: invitation.status,
        },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        timestamp: Date.now(),
      });
    } catch (auditError) {
      // Log audit error but don't fail the request
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      invitationId,
      message: "Invitation cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling invitation:", error);

    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}


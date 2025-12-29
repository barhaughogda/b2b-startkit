import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { sendInvitationEmail } from "@/lib/email/invitation-email";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/clinic/invitations
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
    const { email, departmentIds, customRoleId, expiresInDays } = body;

    // Validate required fields
    if (!email || !departmentIds || !customRoleId) {
      return NextResponse.json(
        { error: "Missing required fields: email, departmentIds, customRoleId" },
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

    // Validate departmentIds is an array
    if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
      return NextResponse.json(
        { error: "departmentIds must be a non-empty array" },
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
    const result = await convex.mutation((api as any).invitations?.createInvitation as any, {
      tenantId,
      email: email.trim(),
      departmentIds,
      customRoleId: customRoleId as any,
      invitedByEmail: session.user.email!,
      expiresInDays: expiresInDays || undefined,
    });

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
      console.error("Failed to send invitation email:", emailError);
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
          departmentIds,
          customRoleId,
          expiresAt: result.expiresAt,
        },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        timestamp: Date.now(),
      });
    } catch (auditError) {
      // Log audit error but don't fail the request
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      invitationId: result.invitationId,
      expiresAt: result.expiresAt,
      message: "Invitation created successfully. Email will be sent shortly.",
    });
  } catch (error) {
    console.error("Error creating invitation:", error);

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
 * GET /api/clinic/invitations
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
    const invitations = await convex.query((api as any).invitations?.getInvitationsByTenant as any, {
      tenantId,
      userEmail: session.user.email!,
      status: status || undefined,
    });

    return NextResponse.json({
      success: true,
      invitations,
      count: invitations.length,
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);

    if (error instanceof Error) {
      if (error.message.includes("Unauthorized") || error.message.includes("owner")) {
        return NextResponse.json(
          { error: "Only clinic owners can view invitations" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}


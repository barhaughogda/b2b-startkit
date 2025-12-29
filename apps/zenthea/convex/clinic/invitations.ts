import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Invite a user to join the clinic
 * Owner-only action for sending user invitations
 * 
 * This function:
 * - Validates owner access
 * - Creates invitation record with secure token
 * - Creates audit log entry
 * - Returns invitation details for email sending (handled by API route)
 * 
 * Note: Email sending is handled by the API route after this function completes,
 * as Convex actions cannot directly send emails. The API route calls this function
 * and then sends the email using the returned invitation details.
 */
export const inviteUser = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    invitedEmail: v.string(), // Email of the user being invited
    clinicIds: v.array(v.string()), // Array of clinic IDs (changed from departmentIds to match schema)
    customRoleId: v.id("customRoles"), // Custom role to assign
    expiresInDays: v.optional(v.number()), // Optional expiration days (default: 7)
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    invitationId: Id<"invitations">;
    token: string;
    expiresAt: number;
    message: string;
  }> => {
    // Verify owner access via query (actions can't call verifyOwnerAccess directly)
    const authResult = await ctx.runQuery(api.utils.authorization.verifyOwnerAccessQuery, {
      userEmail: args.userEmail,
      tenantId: args.tenantId,
    });
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized - Only clinic owners can invite users");
    }

    // Create invitation via mutation (this generates token and creates record)
    // Note: Using type assertion because mutation signature was updated but TypeScript types may be stale
    const invitationResult = await ctx.runMutation(api.invitations.createInvitation, {
      tenantId: args.tenantId,
      email: args.invitedEmail,
      clinicIds: args.clinicIds, // Changed from departmentIds to clinicIds to match schema
      customRoleId: args.customRoleId,
      invitedByEmail: args.userEmail,
      expiresInDays: args.expiresInDays,
    } as any);

    // Create audit log entry for invitation creation
    try {
      await ctx.runMutation(api.auditLogs.create, {
        tenantId: args.tenantId,
        userId: authResult.userId!,
        action: "user_invitation_created",
        resource: "invitations",
        resourceId: invitationResult.invitationId as string, // Convert Id to string for audit log
        details: {
          invitedEmail: args.invitedEmail,
          clinicIds: args.clinicIds, // Changed from departmentIds to clinicIds
          customRoleId: args.customRoleId,
          expiresAt: invitationResult.expiresAt,
          expiresInDays: args.expiresInDays || 7,
        },
        timestamp: Date.now(),
      });
    } catch (auditError) {
      // Log audit error but don't fail the request
      // The invitation was created successfully, audit log failure shouldn't block the operation
      console.error("Failed to create audit log for invitation:", auditError);
    }

    return {
      success: true,
      invitationId: invitationResult.invitationId,
      token: invitationResult.token,
      expiresAt: invitationResult.expiresAt,
      message: "Invitation created successfully",
    };
  },
});


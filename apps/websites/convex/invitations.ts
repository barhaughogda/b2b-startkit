import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { verifyOwnerAccess } from "./utils/authorization";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

/**
 * Generate a cryptographically secure invitation token
 * Uses Web Crypto API for secure token generation (works in Convex environment)
 */
function generateInvitationToken(): string {
  // Generate 32 bytes of random data using Web Crypto API
  // Convert Uint8Array to base64url string
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // Convert to base64url
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Create a new user invitation
 * Only clinic owners can create invitations
 */
export const createInvitation = mutation({
  args: {
    tenantId: v.string(),
    email: v.string(),
    clinicIds: v.array(v.string()), // Changed from departmentIds to clinicIds to match schema
    customRoleId: v.id("customRoles"),
    invitedByEmail: v.string(), // Email of the user creating the invitation
    expiresInDays: v.optional(v.number()), // Optional expiration days (default: 7)
  },
  handler: async (ctx, args) => {
    // Verify owner access
    const authResult = await verifyOwnerAccess(ctx, args.invitedByEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email address format");
    }

    // Check if user with this email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .first();

    if (existingUser) {
      throw new Error("A user with this email address already exists");
    }

    // Check if there's already a pending invitation for this email in this tenant
    const existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_tenant_email", (q) =>
        q.eq("tenantId", args.tenantId).eq("email", args.email.toLowerCase().trim())
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingInvitation) {
      // Check if existing invitation is expired
      if (existingInvitation.expiresAt < Date.now()) {
        // Update expired invitation to expired status
        await ctx.db.patch(existingInvitation._id, {
          status: "expired",
          updatedAt: Date.now(),
        });
      } else {
        throw new Error("A pending invitation already exists for this email address");
      }
    }

    // Validate custom role exists and belongs to tenant
    const customRole = await ctx.db.get(args.customRoleId);
    if (!customRole) {
      throw new Error("Custom role not found");
    }
    if (customRole.tenantId !== args.tenantId) {
      throw new Error("Custom role does not belong to this tenant");
    }

    // Validate clinics exist and belong to tenant
    for (const clinicId of args.clinicIds) {
      const clinic = await ctx.db
        .query("clinics")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .filter((q) => q.eq(q.field("_id"), clinicId))
        .first();

      if (!clinic) {
        throw new Error(`Clinic ${clinicId} not found or does not belong to this tenant`);
      }
      if (!clinic.isActive) {
        throw new Error(`Clinic ${clinicId} is not active`);
      }
    }

    // Generate secure invitation token
    const token = generateInvitationToken();

    // Calculate expiration (default: 7 days)
    const expiresInDays = args.expiresInDays || 7;
    const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;

    // Create invitation record
    const invitationId = await ctx.db.insert("invitations", {
      tenantId: args.tenantId,
      email: args.email.toLowerCase().trim(),
      token,
      clinicIds: args.clinicIds, // Changed from departmentIds to clinicIds to match schema
      customRoleId: args.customRoleId,
      invitedBy: authResult.userId!,
      status: "pending",
      expiresAt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      invitationId,
      token,
      expiresAt,
    };
  },
});

/**
 * Get invitation by token
 * Used when user clicks invitation link
 */
export const getInvitationByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return null;
    }

    // Check if invitation is expired (don't update in query - that's handled in action)
    if (invitation.expiresAt < Date.now() && invitation.status === "pending") {
      return {
        ...invitation,
        status: "expired" as const,
      };
    }

    return invitation;
  },
});

/**
 * Get invitations for a tenant (owner only)
 */
export const getInvitationsByTenant = query({
  args: {
    tenantId: v.string(),
    userEmail: v.string(),
    status: v.optional(v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired"), v.literal("cancelled"))),
  },
  handler: async (ctx, args) => {
    // Verify owner access
    const authResult = await verifyOwnerAccess(ctx, args.userEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    let query = ctx.db
      .query("invitations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId));

    const invitations = await query.collect();

    // Filter by status if provided
    const filteredInvitations = args.status
      ? invitations.filter((inv) => inv.status === args.status)
      : invitations;

    // Sort by created date (most recent first)
    filteredInvitations.sort((a, b) => b.createdAt - a.createdAt);

    return filteredInvitations;
  },
});

/**
 * Cancel an invitation (owner only)
 */
export const cancelInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify owner access
    const authResult = await verifyOwnerAccess(ctx, args.userEmail, invitation.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Only cancel pending invitations
    if (invitation.status !== "pending") {
      throw new Error(`Cannot cancel invitation with status: ${invitation.status}`);
    }

    // Update invitation status
    await ctx.db.patch(args.invitationId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Resend invitation email (owner only)
 * Creates a new token and extends expiration
 */
export const resendInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    userEmail: v.string(),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify owner access
    const authResult = await verifyOwnerAccess(ctx, args.userEmail, invitation.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Only resend pending invitations
    if (invitation.status !== "pending") {
      throw new Error(`Cannot resend invitation with status: ${invitation.status}`);
    }

    // Generate new token
    const newToken = generateInvitationToken();

    // Calculate new expiration (default: 7 days)
    const expiresInDays = args.expiresInDays || 7;
    const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;

    // Update invitation
    await ctx.db.patch(args.invitationId, {
      token: newToken,
      expiresAt,
      updatedAt: Date.now(),
    });

    return {
      token: newToken,
      expiresAt,
    };
  },
});

/**
 * Accept an invitation and create user account
 * This is an action because it needs to hash passwords and coordinate multiple mutations
 */
export const acceptInvitation = action({
  args: {
    token: v.string(),
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: true; userId: Id<"users">; message: string }> => {
    // Get invitation by token
    const invitation: any = await ctx.runQuery(api.invitations.getInvitationByToken, {
      token: args.token,
    });

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check invitation status
    if (invitation.status !== "pending") {
      throw new Error(`Invitation has already been ${invitation.status}`);
    }

    // Check if invitation is expired
    if (invitation.expiresAt < Date.now()) {
      // Update status to expired
      await ctx.runMutation(api.invitations.updateInvitationStatus, {
        invitationId: invitation._id,
        status: "expired",
      });
      throw new Error("This invitation has expired");
    }

    // Validate name
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Name is required");
    }

    // Validate password (minimum length check - full validation should be done in API route)
    if (!args.password || args.password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // Check if user already exists
    const existingUser = await ctx.runQuery(api.users.getUserByEmail, {
      email: invitation.email,
      tenantId: invitation.tenantId,
    });

    if (existingUser) {
      throw new Error("A user with this email address already exists");
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(args.password, 10);

    // Create user account
    const now = Date.now();
    const userId: Id<"users"> = await ctx.runMutation(api.users.createUserMutation, {
      email: invitation.email.toLowerCase().trim(),
      name: args.name.trim(),
      role: "clinic_user",
      passwordHash,
      isActive: true,
      tenantId: invitation.tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Assign custom role
    await ctx.runMutation(api.users.assignCustomRoleToUser, {
      userId,
      customRoleId: invitation.customRoleId,
    });

    // Assign clinics
    for (const clinicId of invitation.clinicIds) {
      await ctx.runMutation(api.clinics.assignUserToClinic, {
        userId,
        clinicId: clinicId as any, // Clinic ID as string (stored in user.clinics array)
      });
    }

    // Update invitation status to accepted
    await ctx.runMutation(api.invitations.updateInvitationStatus, {
      invitationId: invitation._id,
      status: "accepted",
      acceptedBy: userId,
    });

    return {
      success: true,
      userId,
      message: "Invitation accepted successfully",
    };
  },
});

/**
 * Update invitation status (internal mutation)
 * Used by acceptInvitation action
 */
export const updateInvitationStatus = mutation({
  args: {
    invitationId: v.id("invitations"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    acceptedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    const updateData: {
      status: typeof args.status;
      updatedAt: number;
      acceptedAt?: number;
      acceptedBy?: Id<"users">;
    } = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "accepted") {
      updateData.acceptedAt = Date.now();
      if (args.acceptedBy) {
        updateData.acceptedBy = args.acceptedBy;
      }
    }

    await ctx.db.patch(args.invitationId, updateData);

    return { success: true };
  },
});


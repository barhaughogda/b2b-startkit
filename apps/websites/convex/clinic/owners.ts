import { query, action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { verifyOwnerAccess } from "../utils/authorization";
import { Id, Doc } from "../_generated/dataModel";

/**
 * Get all owners for a tenant
 * Owner-only query for listing clinic owners
 */
export const getOwners = query({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
  },
  handler: async (ctx, args) => {
    // Verify owner access
    const authResult = await verifyOwnerAccess(ctx, args.userEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Get all users for the tenant
    const users = await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter to only owners who are active
    const owners = users
      .filter((u) => (u.isOwner ?? false) && u.isActive !== false)
      .map(({ passwordHash, ...user }) => ({
        ...user,
        // Ensure optional fields have defaults
        isOwner: user.isOwner ?? false,
        departments: user.departments ?? [],
      }));

    return owners;
  },
});

/**
 * Add owner status to a user
 * Owner-only action for promoting a user to owner
 */
export const addOwner = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    userId: Id<"users">;
    message: string;
  }> => {
    // Verify owner access via query (actions can't call verifyOwnerAccess directly)
    const authResult = await ctx.runQuery(api.utils.authorization.verifyOwnerAccessQuery, {
      userEmail: args.userEmail,
      tenantId: args.tenantId,
    });
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Get the user to promote
    const user = await ctx.runQuery(api.users.getUserById, {
      userId: args.userId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user belongs to the same tenant
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to this tenant");
    }

    // Check if user is already an owner
    if (user.isOwner) {
      return {
        success: true,
        userId: args.userId,
        message: "User is already an owner",
      };
    }

    // Update user to set isOwner = true
    await ctx.runMutation(api.users.updateUserMutation, {
      id: args.userId,
      isOwner: true,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      userId: args.userId,
      message: "User promoted to owner successfully",
    };
  },
});

/**
 * Remove owner status from a user
 * Owner-only action for demoting an owner to regular user
 * Prevents removing the last owner
 */
export const removeOwner = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    userId: Id<"users">;
    message: string;
  }> => {
    // Verify owner access via query (actions can't call verifyOwnerAccess directly)
    const authResult = await ctx.runQuery(api.utils.authorization.verifyOwnerAccessQuery, {
      userEmail: args.userEmail,
      tenantId: args.tenantId,
    });
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Get the user to demote
    const user = await ctx.runQuery(api.users.getUserById, {
      userId: args.userId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user belongs to the same tenant
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to this tenant");
    }

    // Check if user is already not an owner
    if (!user.isOwner) {
      return {
        success: true,
        userId: args.userId,
        message: "User is not an owner",
      };
    }

    // Prevent users from removing their own owner status
    if (authResult.userId === args.userId) {
      throw new Error("You cannot remove your own owner status");
    }

    // Check if this is the last owner
    const allUsers = await ctx.runQuery(api.users.getUsersByTenant, {
      tenantId: args.tenantId,
    });

    const activeOwners = allUsers.filter(
      (u: Doc<"users">) => (u.isOwner ?? false) && u.isActive !== false && u._id !== args.userId
    );

    if (activeOwners.length === 0) {
      throw new Error(
        "Cannot remove the last owner. At least one owner must remain."
      );
    }

    // Update user to set isOwner = false
    await ctx.runMutation(api.users.updateUserMutation, {
      id: args.userId,
      isOwner: false,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      userId: args.userId,
      message: "Owner status removed successfully",
    };
  },
});

/**
 * Transfer clinic ownership from one user to another
 * Owner-only action for transferring ownership between users
 * Ensures at least one owner remains after transfer
 */
export const transferOwnership = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    fromUserId: v.id("users"), // User losing owner status
    toUserId: v.id("users"), // User gaining owner status
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    fromUserId: Id<"users">;
    toUserId: Id<"users">;
    message: string;
  }> => {
    // Verify owner access via query (actions can't call verifyOwnerAccess directly)
    const authResult = await ctx.runQuery(api.utils.authorization.verifyOwnerAccessQuery, {
      userEmail: args.userEmail,
      tenantId: args.tenantId,
    });
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized - Only clinic owners can transfer ownership");
    }

    // Get both users
    const fromUser = await ctx.runQuery(api.users.getUserById, {
      userId: args.fromUserId,
    });

    const toUser = await ctx.runQuery(api.users.getUserById, {
      userId: args.toUserId,
    });

    if (!fromUser) {
      throw new Error("Source user not found");
    }

    if (!toUser) {
      throw new Error("Target user not found");
    }

    // Verify both users belong to the same tenant
    if (fromUser.tenantId !== args.tenantId) {
      throw new Error("Source user does not belong to this tenant");
    }

    if (toUser.tenantId !== args.tenantId) {
      throw new Error("Target user does not belong to this tenant");
    }

    // Verify both users are active
    if (fromUser.isActive === false) {
      throw new Error("Cannot transfer ownership from an inactive user");
    }

    if (toUser.isActive === false) {
      throw new Error("Cannot transfer ownership to an inactive user");
    }

    // Verify fromUser is currently an owner
    if (!fromUser.isOwner) {
      throw new Error("Source user is not an owner");
    }

    // Check if toUser is already an owner (if so, this is just removing fromUser's owner status)
    const toUserIsAlreadyOwner = toUser.isOwner ?? false;

    // Get all users for the tenant to check owner count
    const allUsers = await ctx.runQuery(api.users.getUsersByTenant, {
      tenantId: args.tenantId,
    });

    // Count active owners excluding fromUser (since we're removing their owner status)
    const activeOwnersAfterTransfer = allUsers.filter(
      (u: Doc<"users">) =>
        u._id !== args.fromUserId &&
        (u.isOwner ?? false) &&
        u.isActive !== false
    );

    // If toUser is not already an owner, add them to the count
    const totalOwnersAfterTransfer = toUserIsAlreadyOwner
      ? activeOwnersAfterTransfer.length
      : activeOwnersAfterTransfer.length + 1;

    // Ensure at least one owner remains after transfer
    if (totalOwnersAfterTransfer === 0) {
      throw new Error(
        "Cannot transfer ownership. At least one owner must remain after the transfer."
      );
    }

    // Prevent transferring ownership to the same user
    if (args.fromUserId === args.toUserId) {
      throw new Error("Cannot transfer ownership to the same user");
    }

    // Update both users' isOwner flags
    // Remove owner status from fromUser
    await ctx.runMutation(api.users.updateUserMutation, {
      id: args.fromUserId,
      isOwner: false,
      updatedAt: Date.now(),
    });

    // Add owner status to toUser (if not already an owner)
    if (!toUserIsAlreadyOwner) {
      await ctx.runMutation(api.users.updateUserMutation, {
        id: args.toUserId,
        isOwner: true,
        updatedAt: Date.now(),
      });
    }

    // Create audit log entry for ownership transfer
    try {
      await ctx.runMutation(api.auditLogs.create, {
        tenantId: args.tenantId,
        userId: authResult.userId!,
        action: "ownership_transferred",
        resource: "users",
        resourceId: args.fromUserId as string, // Convert Id to string for audit log
        details: {
          fromUserId: args.fromUserId,
          fromUserEmail: fromUser.email,
          toUserId: args.toUserId,
          toUserEmail: toUser.email,
          transferredBy: args.userEmail,
          toUserWasAlreadyOwner: toUserIsAlreadyOwner,
        },
        timestamp: Date.now(),
      });
    } catch (auditError) {
      // Log audit error but don't fail the request
      // The ownership transfer was successful, audit log failure shouldn't block the operation
      console.error("Failed to create audit log for ownership transfer:", auditError);
    }

    // TODO: Send notifications to both users
    // - Notify fromUser that they are no longer an owner
    // - Notify toUser that they are now an owner (if they weren't already)
    // This should be implemented similar to invitation emails (see src/lib/email/invitation-email.ts)
    // For now, notifications are logged in development mode
    if (process.env.NODE_ENV === "development") {
      console.log("📧 Ownership transfer notifications (Development Mode - Notifications not actually sent)");
      console.log(`- From user (${fromUser.email}): Ownership removed`);
      if (!toUserIsAlreadyOwner) {
        console.log(`- To user (${toUser.email}): Ownership granted`);
      }
    }

    return {
      success: true,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      message: toUserIsAlreadyOwner
        ? `Ownership removed from ${fromUser.email}. ${toUser.email} remains an owner.`
        : `Ownership transferred from ${fromUser.email} to ${toUser.email} successfully`,
    };
  },
});


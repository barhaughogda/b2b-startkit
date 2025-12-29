import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { createHIPAAAuditLogger } from "./auditLogger";
import { validateCalendarShareUsers } from "./utils/shareValidation";

// Maximum number of calendar shares per user
const MAX_SHARES_PER_USER = 50;

/**
 * Check rate limit for calendar shares
 */
async function checkShareRateLimit(
  ctx: any,
  ownerUserId: Id<"users">,
  tenantId: string
): Promise<void> {
  const existingShares = await ctx.db
    .query("calendarShares")
    .withIndex("by_owner", (q: any) => q.eq("ownerUserId", ownerUserId))
    .filter((q: any) => q.eq(q.field("tenantId"), tenantId))
    .collect();

  if (existingShares.length >= MAX_SHARES_PER_USER) {
    throw new Error(
      `RATE_LIMIT_EXCEEDED: Maximum calendar shares limit reached (${MAX_SHARES_PER_USER}). Please revoke some shares before adding new ones.`
    );
  }
}

/**
 * Share a calendar with another user
 */
export const shareCalendar = mutation({
  args: {
    ownerUserId: v.id("users"), // User who owns the calendar
    sharedWithUserId: v.id("users"), // User to share with
    permission: v.union(v.literal("view"), v.literal("edit")), // Access level
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    // Validate users and tenant isolation
    const validationResult = await validateCalendarShareUsers(
      ctx,
      args.ownerUserId,
      args.sharedWithUserId,
      args.tenantId
    );
    const { owner, sharedWith } = validationResult;

    // Check rate limit
    await checkShareRateLimit(ctx, args.ownerUserId, args.tenantId);

    // Check if share already exists
    const existingShare = await ctx.db
      .query("calendarShares")
      .withIndex("by_owner_shared_with", (q) =>
        q.eq("ownerUserId", args.ownerUserId).eq("sharedWithUserId", args.sharedWithUserId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    const logger = createHIPAAAuditLogger(ctx);
    const now = Date.now();

    if (existingShare) {
      // Update existing share
      const oldPermission = existingShare.permission;
      await ctx.db.patch(existingShare._id, {
        permission: args.permission,
        updatedAt: now,
      });

      // Audit log: permission updated
      await logger.logModification(
        args.tenantId,
        args.ownerUserId,
        "calendar_share_permission_updated",
        "calendarShares",
        existingShare._id,
        {
          ownerUserId: args.ownerUserId,
          sharedWithUserId: args.sharedWithUserId,
          oldPermission,
          newPermission: args.permission,
        }
      );

      return existingShare._id;
    }

    // Create new share
    const shareId = await ctx.db.insert("calendarShares", {
      ownerUserId: args.ownerUserId,
      sharedWithUserId: args.sharedWithUserId,
      permission: args.permission,
      tenantId: args.tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log: calendar shared
    await logger.logModification(
      args.tenantId,
      args.ownerUserId,
      "calendar_shared",
      "calendarShares",
      shareId,
      {
        ownerUserId: args.ownerUserId,
        sharedWithUserId: args.sharedWithUserId,
        permission: args.permission,
        ownerEmail: owner.email,
        sharedWithEmail: sharedWith.email,
      }
    );

    return shareId;
  },
});

/**
 * Revoke calendar share access
 */
export const revokeCalendarShare = mutation({
  args: {
    ownerUserId: v.id("users"), // User who owns the calendar
    sharedWithUserId: v.id("users"), // User to revoke access from
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    // Validate owner user exists and belongs to tenant
    const owner = await ctx.db.get(args.ownerUserId);
    if (!owner) {
      throw new Error("USER_NOT_FOUND: Owner user not found");
    }
    if (owner.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Owner does not belong to the specified tenant");
    }

    // Find the share
    const share = await ctx.db
      .query("calendarShares")
      .withIndex("by_owner_shared_with", (q) =>
        q.eq("ownerUserId", args.ownerUserId).eq("sharedWithUserId", args.sharedWithUserId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (!share) {
      throw new Error("SHARE_NOT_FOUND: Calendar share not found");
    }

    // Get shared with user for audit log
    const sharedWith = await ctx.db.get(args.sharedWithUserId);

    // Delete the share
    await ctx.db.delete(share._id);

    // Audit log: calendar share revoked
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logModification(
      args.tenantId,
      args.ownerUserId,
      "calendar_share_revoked",
      "calendarShares",
      share._id,
      {
        ownerUserId: args.ownerUserId,
        sharedWithUserId: args.sharedWithUserId,
        permission: share.permission,
        ownerEmail: owner.email,
        sharedWithEmail: sharedWith?.email,
      }
    );

    return { success: true };
  },
});

/**
 * Update calendar share permission
 */
export const updateCalendarSharePermission = mutation({
  args: {
    ownerUserId: v.id("users"), // User who owns the calendar
    sharedWithUserId: v.id("users"), // User whose permission to update
    permission: v.union(v.literal("view"), v.literal("edit")), // New permission level
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    // Validate owner user exists and belongs to tenant
    const owner = await ctx.db.get(args.ownerUserId);
    if (!owner) {
      throw new Error("USER_NOT_FOUND: Owner user not found");
    }
    if (owner.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Owner does not belong to the specified tenant");
    }

    // Find the share
    const share = await ctx.db
      .query("calendarShares")
      .withIndex("by_owner_shared_with", (q) =>
        q.eq("ownerUserId", args.ownerUserId).eq("sharedWithUserId", args.sharedWithUserId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (!share) {
      throw new Error("SHARE_NOT_FOUND: Calendar share not found");
    }

    // Don't update if permission is the same
    if (share.permission === args.permission) {
      return share._id;
    }

    // Get shared with user for audit log
    const sharedWith = await ctx.db.get(args.sharedWithUserId);

    // Update permission
    const oldPermission = share.permission;
    const now = Date.now();
    await ctx.db.patch(share._id, {
      permission: args.permission,
      updatedAt: now,
    });

    // Audit log: permission updated
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logModification(
      args.tenantId,
      args.ownerUserId,
      "calendar_share_permission_updated",
      "calendarShares",
      share._id,
      {
        ownerUserId: args.ownerUserId,
        sharedWithUserId: args.sharedWithUserId,
        oldPermission,
        newPermission: args.permission,
        ownerEmail: owner.email,
        sharedWithEmail: sharedWith?.email,
      }
    );

    return share._id;
  },
});

/**
 * Get calendars shared with the current user
 */
export const getSharedCalendars = query({
  args: {
    userId: v.id("users"), // User to get shared calendars for
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    const shares = await ctx.db
      .query("calendarShares")
      .withIndex("by_shared_with", (q) => q.eq("sharedWithUserId", args.userId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    // Enrich with owner user details
    const sharedCalendars = await Promise.all(
      shares.map(async (share) => {
        const owner = await ctx.db.get(share.ownerUserId);
        return {
          ...share,
          owner: owner
            ? {
                _id: owner._id,
                name: owner.name,
                email: owner.email,
                firstName: owner.firstName,
                lastName: owner.lastName,
              }
            : null,
        };
      })
    );

    return sharedCalendars;
  },
});

/**
 * Get users who have access to a calendar
 */
export const getCalendarShares = query({
  args: {
    ownerUserId: v.id("users"), // User who owns the calendar
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    const shares = await ctx.db
      .query("calendarShares")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", args.ownerUserId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    // Enrich with shared with user details
    const calendarShares = await Promise.all(
      shares.map(async (share) => {
        const sharedWith = await ctx.db.get(share.sharedWithUserId);
        return {
          ...share,
          sharedWith: sharedWith
            ? {
                _id: sharedWith._id,
                name: sharedWith.name,
                email: sharedWith.email,
                firstName: sharedWith.firstName,
                lastName: sharedWith.lastName,
              }
            : null,
        };
      })
    );

    return calendarShares;
  },
});

/**
 * Check if a user has access to a calendar
 */
export const checkCalendarAccess = query({
  args: {
    ownerUserId: v.id("users"), // User who owns the calendar
    userId: v.id("users"), // User to check access for
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    // User always has access to their own calendar
    if (args.ownerUserId === args.userId) {
      return { hasAccess: true, permission: "edit" as const };
    }

    // Check for shared calendar
    const share = await ctx.db
      .query("calendarShares")
      .withIndex("by_owner_shared_with", (q) =>
        q.eq("ownerUserId", args.ownerUserId).eq("sharedWithUserId", args.userId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (!share) {
      return { hasAccess: false, permission: null };
    }

    return {
      hasAccess: true,
      permission: share.permission,
    };
  },
});



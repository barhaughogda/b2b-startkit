import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { createHIPAAAuditLogger } from "./auditLogger";

/**
 * Sharing scope validator - matches the schema definition
 */
const sharingScopeValidator = v.union(
  v.literal("private"),
  v.literal("care_team"),
  v.literal("company")
);

/**
 * Default sharing settings - private by default for HIPAA compliance
 */
const DEFAULT_SHARING_SETTINGS = {
  calendarDefaultSharing: "private" as const,
  patientsDefaultSharing: "private" as const,
  messagesDefaultSharing: "private" as const,
};

/**
 * Get user sharing settings
 * Returns the user's sharing preferences, or defaults if not yet set
 */
export const getUserSharingSettings = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND: User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: User does not belong to the specified tenant");
    }

    // Get existing settings
    const settings = await ctx.db
      .query("userSharingSettings")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .first();

    if (settings) {
      return settings;
    }

    // Return defaults if no settings exist (don't create yet)
    return {
      userId: args.userId,
      tenantId: args.tenantId,
      ...DEFAULT_SHARING_SETTINGS,
      _id: null, // Indicate this is a default, not persisted
      createdAt: null,
      updatedAt: null,
    };
  },
});

/**
 * Initialize user sharing settings with defaults
 * Called when a new user is created
 */
export const initializeUserSharingSettings = mutation({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND: User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: User does not belong to the specified tenant");
    }

    // Don't create for patients - they don't have sharing settings
    if (user.role === "patient") {
      throw new Error("INVALID_OPERATION: Patients do not have sharing settings");
    }

    // Check if settings already exist
    const existing = await ctx.db
      .query("userSharingSettings")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Create default settings
    const now = Date.now();
    const settingsId = await ctx.db.insert("userSharingSettings", {
      userId: args.userId,
      tenantId: args.tenantId,
      ...DEFAULT_SHARING_SETTINGS,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logModification(
      args.tenantId,
      args.userId,
      "sharing_settings_initialized",
      "userSharingSettings",
      settingsId,
      {
        userId: args.userId,
        defaults: DEFAULT_SHARING_SETTINGS,
      }
    );

    return settingsId;
  },
});

/**
 * Update user sharing settings
 */
export const updateUserSharingSettings = mutation({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
    calendarDefaultSharing: v.optional(sharingScopeValidator),
    patientsDefaultSharing: v.optional(sharingScopeValidator),
    messagesDefaultSharing: v.optional(sharingScopeValidator),
  },
  handler: async (ctx, args) => {
    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND: User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: User does not belong to the specified tenant");
    }

    // Don't allow patients to have sharing settings
    if (user.role === "patient") {
      throw new Error("INVALID_OPERATION: Patients do not have sharing settings");
    }

    const now = Date.now();
    const logger = createHIPAAAuditLogger(ctx);

    // Get existing settings
    const existing = await ctx.db
      .query("userSharingSettings")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .first();

    // Build update object with only provided fields
    const updates: Record<string, any> = { updatedAt: now };
    if (args.calendarDefaultSharing !== undefined) {
      updates.calendarDefaultSharing = args.calendarDefaultSharing;
    }
    if (args.patientsDefaultSharing !== undefined) {
      updates.patientsDefaultSharing = args.patientsDefaultSharing;
    }
    if (args.messagesDefaultSharing !== undefined) {
      updates.messagesDefaultSharing = args.messagesDefaultSharing;
    }

    if (existing) {
      // Store old values for audit
      const oldSettings = {
        calendarDefaultSharing: existing.calendarDefaultSharing,
        patientsDefaultSharing: existing.patientsDefaultSharing,
        messagesDefaultSharing: existing.messagesDefaultSharing,
      };

      // Update existing settings
      await ctx.db.patch(existing._id, updates);

      // Audit log
      await logger.logModification(
        args.tenantId,
        args.userId,
        "sharing_settings_updated",
        "userSharingSettings",
        existing._id,
        {
          userId: args.userId,
          oldSettings,
          newSettings: {
            calendarDefaultSharing: args.calendarDefaultSharing ?? existing.calendarDefaultSharing,
            patientsDefaultSharing: args.patientsDefaultSharing ?? existing.patientsDefaultSharing,
            messagesDefaultSharing: args.messagesDefaultSharing ?? existing.messagesDefaultSharing,
          },
        }
      );

      return existing._id;
    }

    // Create new settings with provided values
    const settingsId = await ctx.db.insert("userSharingSettings", {
      userId: args.userId,
      tenantId: args.tenantId,
      calendarDefaultSharing: args.calendarDefaultSharing ?? DEFAULT_SHARING_SETTINGS.calendarDefaultSharing,
      patientsDefaultSharing: args.patientsDefaultSharing ?? DEFAULT_SHARING_SETTINGS.patientsDefaultSharing,
      messagesDefaultSharing: args.messagesDefaultSharing ?? DEFAULT_SHARING_SETTINGS.messagesDefaultSharing,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await logger.logModification(
      args.tenantId,
      args.userId,
      "sharing_settings_created",
      "userSharingSettings",
      settingsId,
      {
        userId: args.userId,
        settings: {
          calendarDefaultSharing: args.calendarDefaultSharing ?? DEFAULT_SHARING_SETTINGS.calendarDefaultSharing,
          patientsDefaultSharing: args.patientsDefaultSharing ?? DEFAULT_SHARING_SETTINGS.patientsDefaultSharing,
          messagesDefaultSharing: args.messagesDefaultSharing ?? DEFAULT_SHARING_SETTINGS.messagesDefaultSharing,
        },
      }
    );

    return settingsId;
  },
});

/**
 * Get all sharing settings for users in a tenant (admin function)
 * Useful for migration and admin review
 */
export const getTenantSharingSettings = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSharingSettings")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Enrich with user details
    const enrichedSettings = await Promise.all(
      settings.map(async (setting) => {
        const user = await ctx.db.get(setting.userId);
        return {
          ...setting,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
              }
            : null,
        };
      })
    );

    return enrichedSettings;
  },
});


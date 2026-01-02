import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get system settings for a tenant
 * Returns all system settings including general, security, notification, and integration settings
 */
export const getSystemSettings = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Return tenant settings with defaults for missing fields
    const settings = tenant.settings || {};
    
    return {
      // General settings (from tenant.settings)
      timezone: settings.timezone || "America/New_York",
      dateFormat: settings.dateFormat || "MM/dd/yyyy",
      timeFormat: settings.timeFormat || "12h",
      currency: settings.currency || "USD",
      language: settings.language || "en",
      
      // Session management (tenant-level only)
      // Handle both object and number formats for backward compatibility
      sessionTimeout: typeof (settings as any).sessionTimeout === 'object'
        ? (settings as any).sessionTimeout?.timeout ?? 30
        : (settings as any).sessionTimeout ?? 30,
      maxConcurrentSessions: typeof (settings as any).sessionTimeout === 'object'
        ? (settings as any).sessionTimeout?.maxConcurrentSessions ?? 3
        : 3, // After migration, maxConcurrentSessions only exists in nested sessionTimeout object
      
      // Notification settings
      emailNotifications: (settings as any).emailNotifications ?? true,
      smsNotifications: (settings as any).smsNotifications ?? false,
      pushNotifications: (settings as any).pushNotifications ?? false,
      emailFromAddress: (settings as any).emailFromAddress || "noreply@zenthea.com",
      smsProvider: (settings as any).smsProvider || "twilio",
    };
  },
});

/**
 * Update system settings for a tenant
 * Updates tenant settings with new system settings values
 */
export const updateSystemSettings = mutation({
  args: {
    tenantId: v.string(),
    settings: v.object({
      // General settings
      timezone: v.optional(v.string()),
      dateFormat: v.optional(v.string()),
      timeFormat: v.optional(v.string()),
      currency: v.optional(v.string()),
      language: v.optional(v.string()),
      
      // Session management (tenant-level only)
      sessionTimeout: v.optional(v.number()),
      maxConcurrentSessions: v.optional(v.number()),
      
      // Reminder settings
      reminderSettings: v.optional(v.object({
        email: v.optional(v.boolean()),
        sms: v.optional(v.boolean()),
        phone: v.optional(v.boolean()),
        advanceNoticeHours: v.optional(v.number()),
      })),
      
      // Notification settings
      emailNotifications: v.optional(v.boolean()),
      smsNotifications: v.optional(v.boolean()),
      pushNotifications: v.optional(v.boolean()),
      emailFromAddress: v.optional(v.string()),
      smsProvider: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Merge new settings with existing settings
    const currentSettings = tenant.settings || {};
    // Handle sessionTimeout and reminderSettings separately - they need special merging
    const { 
      sessionTimeout: sessionTimeoutArg, 
      maxConcurrentSessions: maxConcurrentSessionsArg,
      reminderSettings: reminderSettingsArg,
      ...otherSettings 
    } = args.settings;
    
    // Extract and exclude top-level maxConcurrentSessions from currentSettings (will be migrated to nested format)
    const { maxConcurrentSessions: currentTopLevelMaxConcurrentSessions, ...currentSettingsWithoutMaxConcurrent } = currentSettings as any;
    
    // Handle backward compatibility: if sessionTimeout is a number, extract it and check for top-level maxConcurrentSessions
    const isLegacyFormat = typeof currentSettingsWithoutMaxConcurrent.sessionTimeout === 'number';
    const legacyTimeout = isLegacyFormat ? currentSettingsWithoutMaxConcurrent.sessionTimeout : undefined;
    const legacyMaxConcurrentSessions = isLegacyFormat 
      ? currentTopLevelMaxConcurrentSessions 
      : undefined;
    
    const currentSessionTimeout = typeof currentSettingsWithoutMaxConcurrent.sessionTimeout === 'object' && currentSettingsWithoutMaxConcurrent.sessionTimeout !== null
      ? currentSettingsWithoutMaxConcurrent.sessionTimeout
      : {};
    
    // Default values for sessionTimeout object
    const DEFAULT_SESSION_TIMEOUT = {
      timeout: 30, // minutes
      warningTime: 2, // minutes
      enabled: true,
      maxConcurrentSessions: 3,
    };
    
    // Build updated sessionTimeout object, migrating legacy top-level values if needed
    let updatedSessionTimeout = {
      ...DEFAULT_SESSION_TIMEOUT,
      ...currentSessionTimeout, // Preserve existing nested values
      // Migrate legacy top-level maxConcurrentSessions if it exists and wasn't already in nested format
      ...(legacyMaxConcurrentSessions !== undefined && currentSessionTimeout.maxConcurrentSessions === undefined
        ? { maxConcurrentSessions: legacyMaxConcurrentSessions }
        : {}),
      // Migrate legacy timeout if it exists and wasn't already in nested format
      ...(legacyTimeout !== undefined && currentSessionTimeout.timeout === undefined
        ? { timeout: legacyTimeout }
        : {}),
    };
    
    if (sessionTimeoutArg !== undefined) {
      if (typeof sessionTimeoutArg === 'number') {
        // Convert number to object format, preserving existing properties
        updatedSessionTimeout = {
          ...updatedSessionTimeout,
          timeout: sessionTimeoutArg,
        };
      } else if (typeof sessionTimeoutArg === 'object' && sessionTimeoutArg !== null) {
        // Already an object, merge it with defaults and current values
        updatedSessionTimeout = {
          ...DEFAULT_SESSION_TIMEOUT,
          ...currentSessionTimeout,
          ...(legacyMaxConcurrentSessions !== undefined && currentSessionTimeout.maxConcurrentSessions === undefined
            ? { maxConcurrentSessions: legacyMaxConcurrentSessions }
            : {}),
          ...(sessionTimeoutArg as Record<string, any>),
        };
      }
    }
    
    // If maxConcurrentSessions is provided as separate field, merge it into sessionTimeout
    if (maxConcurrentSessionsArg !== undefined) {
      updatedSessionTimeout = {
        ...updatedSessionTimeout,
        maxConcurrentSessions: maxConcurrentSessionsArg,
      };
    }
    
    // Merge reminderSettings properly (following pattern from tenants.ts)
    const currentReminderSettings = currentSettingsWithoutMaxConcurrent.reminderSettings || {
      email: true,
      sms: false,
      phone: false,
      advanceNoticeHours: 24,
    };
    const updatedReminderSettings = reminderSettingsArg !== undefined
      ? {
          ...currentReminderSettings,
          ...reminderSettingsArg,
        }
      : currentReminderSettings;
    
    // Build updated settings, migrating legacy format if needed
    // Note: maxConcurrentSessions is excluded from currentSettingsWithoutMaxConcurrent and migrated to nested format
    const updatedSettings = {
      ...currentSettingsWithoutMaxConcurrent,
      ...otherSettings,
      reminderSettings: updatedReminderSettings,
      // Always set sessionTimeout to object format (migrates legacy number format)
      sessionTimeout: updatedSessionTimeout,
    };

    // Update tenant settings
    await ctx.db.patch(tenant._id, {
      settings: updatedSettings,
      updatedAt: Date.now(),
    });

    // Log settings update
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      action: "system_settings_updated",
      resource: "system_settings",
      resourceId: args.tenantId,
      details: {
        updatedFields: Object.keys(args.settings),
        updatedBy: "admin", // Could be enhanced to track actual user
      },
      timestamp: Date.now(),
    });

    return updatedSettings;
  },
});


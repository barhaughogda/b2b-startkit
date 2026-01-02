import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get platform-wide settings (not tenant-specific)
 * Superadmin-only function
 */
export const getPlatformSettings = query({
  args: {},
  handler: async (ctx) => {
    // Platform settings are stored in a special "platform" tenant or separate table
    // For now, we'll use a default tenant with id "platform" or store in a separate collection
    // This is a simplified implementation - in production, you might want a dedicated platformSettings table
    
    // Try to get platform tenant, or return defaults
    const platformTenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", "platform"))
      .first();

    const settings = platformTenant?.settings || {};

    return {
      // Security Policies
      passwordMinLength: (settings as any).passwordMinLength || 8,
      passwordRequireUppercase: (settings as any).passwordRequireUppercase ?? true,
      passwordRequireLowercase: (settings as any).passwordRequireLowercase ?? true,
      passwordRequireNumbers: (settings as any).passwordRequireNumbers ?? true,
      passwordRequireSpecialChars: (settings as any).passwordRequireSpecialChars ?? true,
      requireMFA: (settings as any).requireMFA ?? true,
      sessionTimeout: typeof (settings as any).sessionTimeout === 'object' 
        ? (settings as any).sessionTimeout?.timeout || 30
        : (settings as any).sessionTimeout || 30,
      accountLockoutMaxAttempts: (settings as any).accountLockoutMaxAttempts || 5,
      accountLockoutDuration: (settings as any).accountLockoutDuration || 15,

      // Platform Integrations
      apiKeys: (settings as any).platformApiKeys || [],
      webhooks: (settings as any).platformWebhooks || [],

      // Default Tenant Settings Templates
      defaultTenantSettings: (settings as any).defaultTenantSettings || {
        branding: {
          primaryColor: "#2563eb",
          secondaryColor: "#1e40af",
        },
        features: {
          onlineScheduling: true,
          telehealth: false,
          prescriptionRefills: true,
          labResults: true,
          messaging: true,
          billing: false,
          patientPortal: true,
          mobileApp: false,
        },
      },
    };
  },
});

/**
 * Update platform-wide settings
 * Superadmin-only mutation
 */
export const updatePlatformSettings = mutation({
  args: {
    settings: v.object({
      // Security Policies
      passwordMinLength: v.optional(v.number()),
      passwordRequireUppercase: v.optional(v.boolean()),
      passwordRequireLowercase: v.optional(v.boolean()),
      passwordRequireNumbers: v.optional(v.boolean()),
      passwordRequireSpecialChars: v.optional(v.boolean()),
      requireMFA: v.optional(v.boolean()),
      sessionTimeout: v.optional(v.number()),
      accountLockoutMaxAttempts: v.optional(v.number()),
      accountLockoutDuration: v.optional(v.number()),

      // Platform Integrations
      apiKeys: v.optional(
        v.array(
          v.object({
            name: v.string(),
            key: v.string(),
            createdAt: v.optional(v.string()),
          })
        )
      ),
      webhooks: v.optional(
        v.array(
          v.object({
            url: v.string(),
            events: v.array(v.string()),
            active: v.boolean(),
          })
        )
      ),

      // Default Tenant Settings
      defaultTenantSettings: v.optional(
        v.object({
          branding: v.optional(
            v.object({
              primaryColor: v.optional(v.string()),
              secondaryColor: v.optional(v.string()),
            })
          ),
          features: v.optional(
            v.object({
              onlineScheduling: v.optional(v.boolean()),
              telehealth: v.optional(v.boolean()),
              prescriptionRefills: v.optional(v.boolean()),
              labResults: v.optional(v.boolean()),
              messaging: v.optional(v.boolean()),
              billing: v.optional(v.boolean()),
              patientPortal: v.optional(v.boolean()),
              mobileApp: v.optional(v.boolean()),
            })
          ),
        })
      ),
    }),
  },
  handler: async (ctx, args) => {
    // Get or create platform tenant
    let platformTenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", "platform"))
      .first();

    // Get current settings with proper typing
    const currentSettings = platformTenant?.settings || {
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
      currency: "USD",
      language: "en",
      appointmentDuration: 30,
      reminderSettings: {
        email: true,
        sms: false,
        phone: false,
        advanceNoticeHours: 24,
      },
    };

      // Merge settings, preserving required tenant settings fields
    // Handle sessionTimeout separately - convert number to object if provided
    const { sessionTimeout: sessionTimeoutArg, ...otherSettings } = args.settings;
    const currentSessionTimeout = currentSettings.sessionTimeout || {};
    
    const updatedSettings = {
      timezone: currentSettings.timezone || "UTC",
      dateFormat: currentSettings.dateFormat || "MM/DD/YYYY",
      timeFormat: currentSettings.timeFormat || "12h",
      currency: currentSettings.currency || "USD",
      language: currentSettings.language || "en",
      appointmentDuration: currentSettings.appointmentDuration || 30,
      reminderSettings: currentSettings.reminderSettings || {
        email: true,
        sms: false,
        phone: false,
        advanceNoticeHours: 24,
      },
      // Handle sessionTimeout: convert number to object format if provided
      ...(sessionTimeoutArg !== undefined && typeof sessionTimeoutArg === 'number'
        ? {
            sessionTimeout: {
              ...currentSessionTimeout,
              timeout: sessionTimeoutArg,
              enabled: currentSessionTimeout.enabled ?? true,
            },
          }
        : sessionTimeoutArg !== undefined
        ? { sessionTimeout: sessionTimeoutArg }
        : {}),
      // Merge in other platform-specific settings from args
      ...otherSettings,
    };

    if (platformTenant) {
      // Update existing platform tenant - only patch settings, keep other fields intact
      await ctx.db.patch(platformTenant._id, {
        settings: updatedSettings,
        updatedAt: Date.now(),
      });
    } else {
      // Create platform tenant (this shouldn't normally happen, but handle it)
      // Use "group" type since "platform" is not in the schema
      await ctx.db.insert("tenants", {
        id: "platform",
        name: "Platform Settings",
        type: "group", // Use "group" instead of "platform" to match schema
        status: "active",
        settings: updatedSettings,
        branding: {
          primaryColor: "#2563eb",
          secondaryColor: "#1e40af",
        },
        features: {
          onlineScheduling: false,
          telehealth: false,
          prescriptionRefills: false,
          labResults: false,
          messaging: false,
          billing: false,
          patientPortal: false,
          mobileApp: false,
        },
        subscription: {
          plan: "enterprise",
          status: "active",
          startDate: new Date().toISOString(),
          maxUsers: 0,
          maxPatients: 0,
        },
        contactInfo: {
          email: "platform@zenthea.com",
          phone: "",
          address: {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "US",
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Log platform settings update
    await ctx.db.insert("auditLogs", {
      tenantId: "platform",
      action: "platform_settings_updated",
      resource: "platform_settings",
      resourceId: "platform",
      details: { updatedFields: Object.keys(args.settings) },
      timestamp: Date.now(),
    });

    return updatedSettings;
  },
});


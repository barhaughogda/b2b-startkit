import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get tenant by ID
export const getTenant = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();
    
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    return tenant;
  },
});

// Get tenant branding information
export const getTenantBranding = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();
    
    // Return null instead of throwing - allows React components to handle gracefully
    if (!tenant) {
      return null;
    }
    
    return {
      tenantId: tenant.id,
      name: tenant.name,
      branding: tenant.branding,
      contactInfo: tenant.contactInfo,
      features: tenant.features,
    };
  },
});

// Get tenant settings
export const getTenantSettings = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();
    
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    return {
      tenantId: tenant.id,
      settings: tenant.settings,
      features: tenant.features,
    };
  },
});

// Create a new tenant
export const createTenant = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    type: v.union(v.literal("clinic"), v.literal("hospital"), v.literal("practice"), v.literal("group")),
    contactInfo: v.object({
      phone: v.string(),
      email: v.string(),
      address: v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zipCode: v.string(),
        country: v.string()
      }),
      website: v.optional(v.string())
    }),
    branding: v.optional(v.object({
      logo: v.optional(v.string()),
      primaryColor: v.optional(v.string()),
      secondaryColor: v.optional(v.string()),
      accentColor: v.optional(v.string()),
      customDomain: v.optional(v.string()),
      favicon: v.optional(v.string()),
      customCss: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    // Check if tenant ID already exists
    const existingTenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.id))
      .first();
    
    if (existingTenant) {
      throw new Error("Tenant ID already exists");
    }
    
    const now = Date.now();
    
    // Default branding if not provided
    const defaultBranding: any = {
      primaryColor: "#2563eb", // Blue
      secondaryColor: "#1e40af", // Darker blue
      accentColor: "#10b981", // Green
    };
    
    // Merge provided branding, only including defined values
    if (args.branding) {
      if (args.branding.logo) defaultBranding.logo = args.branding.logo;
      if (args.branding.primaryColor) defaultBranding.primaryColor = args.branding.primaryColor;
      if (args.branding.secondaryColor) defaultBranding.secondaryColor = args.branding.secondaryColor;
      if (args.branding.accentColor) defaultBranding.accentColor = args.branding.accentColor;
      if (args.branding.customDomain) defaultBranding.customDomain = args.branding.customDomain;
      if (args.branding.favicon) defaultBranding.favicon = args.branding.favicon;
      if (args.branding.customCss) defaultBranding.customCss = args.branding.customCss;
    }
    
    // Default subscription for new tenants
    const defaultSubscription: any = {
      plan: "demo" as const,
      status: "active" as const,
      startDate: new Date().toISOString(),
      maxUsers: 10,
      maxPatients: 100
    };
    
    // Default features
    const defaultFeatures = {
      onlineScheduling: true,
      telehealth: false,
      prescriptionRefills: true,
      labResults: true,
      messaging: true,
      billing: false,
      patientPortal: true,
      mobileApp: false
    };
    
    // Default settings
    const defaultSettings = {
      timezone: "America/New_York",
      dateFormat: "MM/dd/yyyy",
      timeFormat: "12h",
      currency: "USD",
      language: "en",
      appointmentDuration: 30,
      reminderSettings: {
        email: true,
        sms: false,
        phone: false,
        advanceNoticeHours: 24
      }
    };
    
    // Ensure no null values in branding, but keep required fields
    const cleanBranding = {
      primaryColor: defaultBranding.primaryColor || "#2563eb",
      secondaryColor: defaultBranding.secondaryColor || "#1e40af",
      ...Object.fromEntries(
        Object.entries(defaultBranding).filter(([key, value]) => 
          value !== null && value !== undefined && 
          key !== 'primaryColor' && key !== 'secondaryColor'
        )
      )
    };

    const tenantId = await ctx.db.insert("tenants", {
      id: args.id,
      name: args.name,
      type: args.type,
      status: "active",
      subscription: defaultSubscription,
      branding: cleanBranding,
      contactInfo: args.contactInfo,
      features: defaultFeatures,
      settings: defaultSettings,
      createdAt: now,
      updatedAt: now
    });
    
    // Log tenant creation
    await ctx.db.insert("auditLogs", {
      tenantId: args.id,
      action: "tenant_created",
      resource: "tenant",
      resourceId: args.id,
      details: { name: args.name, type: args.type },
      timestamp: now
    });
    
    return tenantId;
  },
});

// Update tenant branding
export const updateTenantBranding = mutation({
  args: {
    tenantId: v.string(),
    branding: v.object({
      logo: v.optional(v.string()),
      primaryColor: v.optional(v.string()),
      secondaryColor: v.optional(v.string()),
      accentColor: v.optional(v.string()),
      customDomain: v.optional(v.string()),
      favicon: v.optional(v.string()),
      customCss: v.optional(v.string())
    })
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();
    
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    const updatedBranding = {
      ...tenant.branding,
      ...args.branding
    };
    
    await ctx.db.patch(tenant._id, {
      branding: updatedBranding,
      updatedAt: Date.now()
    });
    
    // Log branding update
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      action: "tenant_branding_updated",
      resource: "tenant",
      resourceId: args.tenantId,
      details: { updatedFields: Object.keys(args.branding) },
      timestamp: Date.now()
    });
    
    return updatedBranding;
  },
});

// Update tenant features
export const updateTenantFeatures = mutation({
  args: {
    tenantId: v.string(),
    features: v.object({
      onlineScheduling: v.optional(v.boolean()),
      telehealth: v.optional(v.boolean()),
      prescriptionRefills: v.optional(v.boolean()),
      labResults: v.optional(v.boolean()),
      messaging: v.optional(v.boolean()),
      billing: v.optional(v.boolean()),
      patientPortal: v.optional(v.boolean()),
      mobileApp: v.optional(v.boolean())
    })
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();
    
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    const updatedFeatures = {
      ...tenant.features,
      ...args.features
    };
    
    await ctx.db.patch(tenant._id, {
      features: updatedFeatures,
      updatedAt: Date.now()
    });
    
    // Log feature update
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      action: "tenant_features_updated",
      resource: "tenant",
      resourceId: args.tenantId,
      details: { updatedFeatures: Object.keys(args.features) },
      timestamp: Date.now()
    });
    
    return updatedFeatures;
  },
});

// Update tenant settings
export const updateTenantSettings = mutation({
  args: {
    tenantId: v.string(),
    settings: v.object({
      timezone: v.optional(v.string()),
      dateFormat: v.optional(v.string()),
      timeFormat: v.optional(v.string()),
      currency: v.optional(v.string()),
      language: v.optional(v.string()),
      appointmentDuration: v.optional(v.number()),
      reminderSettings: v.optional(v.object({
        email: v.optional(v.boolean()),
        sms: v.optional(v.boolean()),
        phone: v.optional(v.boolean()),
        advanceNoticeHours: v.optional(v.number())
      })),
      sessionTimeout: v.optional(v.object({
        timeout: v.optional(v.number()),
        warningTime: v.optional(v.number()),
        enabled: v.optional(v.boolean()),
        maxConcurrentSessions: v.optional(v.number()),
      }))
    })
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();
    
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    // Extract sessionTimeout from args.settings to handle separately
    const { sessionTimeout: sessionTimeoutArg, ...otherSettings } = args.settings;
    
    // Default values for sessionTimeout object
    const DEFAULT_SESSION_TIMEOUT = {
      timeout: 30, // minutes
      warningTime: 2, // minutes
      enabled: true,
      maxConcurrentSessions: 3,
    };
    
    // Handle sessionTimeout merging with defaults
    const currentSessionTimeout = tenant.settings?.sessionTimeout ?? {};
    const updatedSessionTimeout = sessionTimeoutArg !== undefined
      ? {
          ...DEFAULT_SESSION_TIMEOUT,
          ...currentSessionTimeout,
          ...sessionTimeoutArg
        }
      : (currentSessionTimeout && Object.keys(currentSessionTimeout).length > 0
          ? currentSessionTimeout
          : DEFAULT_SESSION_TIMEOUT);
    
    const updatedSettings = {
      ...tenant.settings,
      ...otherSettings,
      reminderSettings: {
        ...tenant.settings.reminderSettings,
        ...args.settings.reminderSettings
      },
      sessionTimeout: updatedSessionTimeout
    };
    
    await ctx.db.patch(tenant._id, {
      settings: updatedSettings,
      updatedAt: Date.now()
    });
    
    // Log settings update
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      action: "tenant_settings_updated",
      resource: "tenant",
      resourceId: args.tenantId,
      details: { updatedSettings: Object.keys(args.settings) },
      timestamp: Date.now()
    });
    
    return updatedSettings;
  },
});

// Update tenant subscription
export const updateTenantSubscription = mutation({
  args: {
    tenantId: v.string(),
    subscription: v.object({
      plan: v.optional(v.union(v.literal("demo"), v.literal("basic"), v.literal("premium"), v.literal("enterprise"))),
      status: v.optional(v.union(v.literal("active"), v.literal("cancelled"), v.literal("expired"))),
      maxUsers: v.optional(v.number()),
      maxPatients: v.optional(v.number()),
      endDate: v.optional(v.string()),
    })
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();
    
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    const updatedSubscription = {
      ...tenant.subscription,
      ...args.subscription
    };
    
    await ctx.db.patch(tenant._id, {
      subscription: updatedSubscription,
      updatedAt: Date.now()
    });
    
    // Log subscription update
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      action: "tenant_subscription_updated",
      resource: "tenant",
      resourceId: args.tenantId,
      details: { updatedFields: Object.keys(args.subscription) },
      timestamp: Date.now()
    });
    
    return updatedSubscription;
  },
});

// Update tenant contact info
export const updateTenantContactInfo = mutation({
  args: {
    tenantId: v.string(),
    contactInfo: v.object({
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      website: v.optional(v.string()),
      address: v.optional(v.object({
        street: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        country: v.optional(v.string())
      }))
    })
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();
    
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    const updatedContactInfo = {
      ...tenant.contactInfo,
      ...args.contactInfo,
      address: {
        ...tenant.contactInfo.address,
        ...args.contactInfo.address
      }
    };
    
    await ctx.db.patch(tenant._id, {
      contactInfo: updatedContactInfo,
      updatedAt: Date.now()
    });
    
    // Log contact info update
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      action: "tenant_contact_info_updated",
      resource: "tenant",
      resourceId: args.tenantId,
      details: { updatedFields: Object.keys(args.contactInfo) },
      timestamp: Date.now()
    });
    
    return updatedContactInfo;
  },
});

// Get full tenant data (for admin)
export const getTenantData = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();
    
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    return {
      name: tenant.name,
      type: tenant.type,
      status: tenant.status,
      branding: tenant.branding,
      features: tenant.features,
      subscription: tenant.subscription,
      contactInfo: tenant.contactInfo,
    };
  },
});

// List all tenants (admin function)
export const listTenants = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended"), v.literal("trial"))),
    limit: v.optional(v.number()),
    offset: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    let tenants;
    
    if (args.status) {
      tenants = await ctx.db
        .query("tenants")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate({
          numItems: args.limit || 20,
          cursor: null
        });
    } else {
      tenants = await ctx.db
        .query("tenants")
        .order("desc")
        .paginate({
          numItems: args.limit || 20,
          cursor: null
        });
    }
    
    return {
      tenants: tenants.page,
      hasMore: tenants.isDone === false,
      nextCursor: tenants.continueCursor
    };
  },
});

// Validate tenant access (utility function)
export const validateTenantAccess = query({
  args: { 
    tenantId: v.string(),
    userId: v.optional(v.id("users"))
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();
    
    if (!tenant) {
      return { hasAccess: false, reason: "Tenant not found" };
    }
    
    if (tenant.status !== "active") {
      return { hasAccess: false, reason: "Tenant is not active" };
    }
    
    // If userId is provided, check if user belongs to tenant
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (!user || user.tenantId !== args.tenantId) {
        return { hasAccess: false, reason: "User does not belong to tenant" };
      }
    }
    
    return { 
      hasAccess: true, 
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        features: tenant.features
      }
    };
  },
});

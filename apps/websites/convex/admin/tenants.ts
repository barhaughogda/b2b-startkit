import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get tenant summary with user and patient counts
 * Used for superadmin tenant list
 */
export const getTenantSummary = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      return null;
    }

    // Get user and patient counts
    const [users, patients] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      ctx.db
        .query("patients")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
    ]);

    return {
      id: tenant.id,
      name: tenant.name,
      type: tenant.type,
      status: tenant.status,
      subscription: tenant.subscription,
      userCount: users.length,
      patientCount: patients.length,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  },
});

/**
 * List all tenants with pagination, filtering, and search
 * Superadmin-only function
 */
export const listTenantsForSuperadmin = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("suspended"),
      v.literal("trial")
    )),
    plan: v.optional(v.union(
      v.literal("demo"),
      v.literal("basic"),
      v.literal("premium"),
      v.literal("enterprise")
    )),
    type: v.optional(v.union(
      v.literal("clinic"),
      v.literal("hospital"),
      v.literal("practice"),
      v.literal("group")
    )),
    search: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal("name"),
      v.literal("createdAt"),
      v.literal("status")
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const page = args.page || 1;
    const limit = args.limit || 20;
    const skip = (page - 1) * limit;

    // Get all tenants
    let tenants = await ctx.db.query("tenants").collect();

    // Apply status filter
    if (args.status) {
      tenants = tenants.filter((t) => t.status === args.status);
    }

    // Apply subscription plan filter
    if (args.plan) {
      tenants = tenants.filter((t) => t.subscription.plan === args.plan);
    }

    // Apply type filter
    if (args.type) {
      tenants = tenants.filter((t) => t.type === args.type);
    }

    // Apply search filter (name, tenantId, email)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      tenants = tenants.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.id.toLowerCase().includes(searchLower) ||
          t.contactInfo.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    const sortBy = args.sortBy || "createdAt";
    const sortOrder = args.sortOrder || "desc";
    tenants.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortBy === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortBy === "createdAt") {
        aVal = a.createdAt;
        bVal = b.createdAt;
      } else if (sortBy === "status") {
        aVal = a.status;
        bVal = b.status;
      } else {
        aVal = a.createdAt;
        bVal = b.createdAt;
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    // Calculate pagination
    const total = tenants.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedTenants = tenants.slice(skip, skip + limit);

    // Helper function to calculate configuration completeness
    const calculateCompleteness = (tenant: any): number => {
      let completed = 0;
      let total = 0;

      // Branding (30% weight)
      total += 5;
      if (tenant.branding?.primaryColor && tenant.branding.primaryColor !== "#2563eb") completed += 1;
      if (tenant.branding?.secondaryColor && tenant.branding.secondaryColor !== "#1e40af") completed += 1;
      if (tenant.branding?.logo) completed += 1;
      if (tenant.branding?.customDomain) completed += 1;
      if (tenant.branding?.favicon) completed += 1;

      // Contact Info (40% weight)
      total += 4;
      if (tenant.contactInfo?.email) completed += 1;
      if (tenant.contactInfo?.phone) completed += 1;
      if (tenant.contactInfo?.address?.street && tenant.contactInfo?.address?.city) completed += 1;
      if (tenant.contactInfo?.website) completed += 1;

      // Features (20% weight) - at least 3 features enabled
      total += 1;
      const enabledFeatures = tenant.features ? Object.values(tenant.features).filter(Boolean).length : 0;
      if (enabledFeatures >= 3) completed += 1;

      // Subscription (10% weight) - plan is set
      total += 1;
      if (tenant.subscription?.plan && tenant.subscription.plan !== "demo") completed += 1;

      return Math.round((completed / total) * 100);
    };

    // Get user and patient counts for each tenant
    const tenantSummaries = await Promise.all(
      paginatedTenants.map(async (tenant) => {
        const [users, patients] = await Promise.all([
          ctx.db
            .query("users")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenant.id))
            .collect(),
          ctx.db
            .query("patients")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenant.id))
            .collect(),
        ]);

        const completeness = calculateCompleteness(tenant);

        return {
          id: tenant.id,
          name: tenant.name,
          type: tenant.type,
          status: tenant.status,
          subscription: tenant.subscription,
          userCount: users.length,
          patientCount: patients.length,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt,
          configCompleteness: completeness,
        };
      })
    );

    return {
      tenants: tenantSummaries,
      total,
      page,
      limit,
      totalPages,
    };
  },
});

/**
 * Get full tenant details for superadmin
 */
export const getTenantDetailsForSuperadmin = query({
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

    // Get user and patient counts
    const [users, patients] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      ctx.db
        .query("patients")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
    ]);

    return {
      ...tenant,
      userCount: users.length,
      patientCount: patients.length,
    };
  },
});

/**
 * Update tenant (superadmin mutation)
 */
export const updateTenantForSuperadmin = mutation({
  args: {
    tenantId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      type: v.optional(v.union(
        v.literal("clinic"),
        v.literal("hospital"),
        v.literal("practice"),
        v.literal("group")
      )),
      status: v.optional(v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("suspended"),
        v.literal("trial")
      )),
      branding: v.optional(v.object({
        logo: v.optional(v.string()),
        primaryColor: v.optional(v.string()),
        secondaryColor: v.optional(v.string()),
        accentColor: v.optional(v.string()),
        customDomain: v.optional(v.string()),
        favicon: v.optional(v.string()),
        customCss: v.optional(v.string()),
      })),
      features: v.optional(v.object({
        onlineScheduling: v.optional(v.boolean()),
        telehealth: v.optional(v.boolean()),
        prescriptionRefills: v.optional(v.boolean()),
        labResults: v.optional(v.boolean()),
        messaging: v.optional(v.boolean()),
        billing: v.optional(v.boolean()),
        patientPortal: v.optional(v.boolean()),
        mobileApp: v.optional(v.boolean()),
      })),
      subscription: v.optional(v.object({
        plan: v.optional(v.union(
          v.literal("demo"),
          v.literal("basic"),
          v.literal("premium"),
          v.literal("enterprise")
        )),
        status: v.optional(v.union(
          v.literal("active"),
          v.literal("cancelled"),
          v.literal("expired")
        )),
        maxUsers: v.optional(v.number()),
        maxPatients: v.optional(v.number()),
        endDate: v.optional(v.string()),
      })),
      contactInfo: v.optional(v.object({
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        website: v.optional(v.string()),
        address: v.optional(v.object({
          street: v.optional(v.string()),
          city: v.optional(v.string()),
          state: v.optional(v.string()),
          zipCode: v.optional(v.string()),
          country: v.optional(v.string()),
        })),
      })),
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

    // Build update object
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.updates.name !== undefined) {
      updateData.name = args.updates.name;
    }
    if (args.updates.type !== undefined) {
      updateData.type = args.updates.type;
    }
    if (args.updates.status !== undefined) {
      updateData.status = args.updates.status;
    }
    if (args.updates.branding !== undefined) {
      updateData.branding = {
        ...tenant.branding,
        ...args.updates.branding,
      };
    }
    if (args.updates.features !== undefined) {
      updateData.features = {
        ...tenant.features,
        ...args.updates.features,
      };
    }
    if (args.updates.subscription !== undefined) {
      updateData.subscription = {
        ...tenant.subscription,
        ...args.updates.subscription,
      };
    }
    if (args.updates.contactInfo !== undefined) {
      updateData.contactInfo = {
        ...tenant.contactInfo,
        ...args.updates.contactInfo,
        address: {
          ...tenant.contactInfo.address,
          ...args.updates.contactInfo.address,
        },
      };
    }

    await ctx.db.patch(tenant._id, updateData);

    // Log tenant update
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      action: "tenant_updated_by_superadmin",
      resource: "tenant",
      resourceId: args.tenantId,
      details: { updatedFields: Object.keys(args.updates) },
      timestamp: Date.now(),
    });

    return await ctx.db.get(tenant._id);
  },
});

/**
 * Create a new tenant (superadmin mutation)
 */
export const createTenantForSuperadmin = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("clinic"),
      v.literal("hospital"),
      v.literal("practice"),
      v.literal("group")
    ),
    contactInfo: v.object({
      phone: v.string(),
      email: v.string(),
      address: v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zipCode: v.string(),
        country: v.string(),
      }),
      website: v.optional(v.string()),
    }),
    subscription: v.optional(v.object({
      plan: v.optional(v.union(
        v.literal("demo"),
        v.literal("basic"),
        v.literal("premium"),
        v.literal("enterprise")
      )),
      maxUsers: v.optional(v.number()),
      maxPatients: v.optional(v.number()),
    })),
    branding: v.optional(v.object({
      logo: v.optional(v.string()),
      primaryColor: v.optional(v.string()),
      secondaryColor: v.optional(v.string()),
      accentColor: v.optional(v.string()),
      customDomain: v.optional(v.string()),
      favicon: v.optional(v.string()),
      customCss: v.optional(v.string()),
    })),
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

    // Check if custom domain is already in use (if provided)
    if (args.branding?.customDomain) {
      const existingDomain = await ctx.db
        .query("tenants")
        .filter((q) => q.eq(q.field("branding.customDomain"), args.branding!.customDomain))
        .first();

      if (existingDomain) {
        throw new Error("Custom domain already in use");
      }
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
      plan: args.subscription?.plan || ("demo" as const),
      status: "active" as const,
      startDate: new Date().toISOString(),
      maxUsers: args.subscription?.maxUsers || 10,
      maxPatients: args.subscription?.maxPatients || 100,
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
      mobileApp: false,
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
        advanceNoticeHours: 24,
      },
    };

    // Ensure no null values in branding, but keep required fields
    const cleanBranding = {
      primaryColor: defaultBranding.primaryColor || "#2563eb",
      secondaryColor: defaultBranding.secondaryColor || "#1e40af",
      ...Object.fromEntries(
        Object.entries(defaultBranding).filter(
          ([key, value]) =>
            value !== null &&
            value !== undefined &&
            key !== "primaryColor" &&
            key !== "secondaryColor"
        )
      ),
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
      updatedAt: now,
    });

    // Log tenant creation
    await ctx.db.insert("auditLogs", {
      tenantId: args.id,
      action: "tenant_created_by_superadmin",
      resource: "tenant",
      resourceId: args.id,
      details: { name: args.name, type: args.type },
      timestamp: now,
    });

    return await ctx.db.get(tenantId);
  },
});

/**
 * Check if tenant ID or domain is available
 */
export const checkTenantAvailability = query({
  args: {
    id: v.optional(v.string()),
    customDomain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results: {
      idAvailable?: boolean;
      domainAvailable?: boolean;
    } = {};

    if (args.id) {
      const existingTenant = await ctx.db
        .query("tenants")
        .withIndex("by_tenant_id", (q) => q.eq("id", args.id!))
        .first();
      results.idAvailable = !existingTenant;
    }

    if (args.customDomain) {
      const existingDomain = await ctx.db
        .query("tenants")
        .filter((q) => q.eq(q.field("branding.customDomain"), args.customDomain!))
        .first();
      results.domainAvailable = !existingDomain;
    }

    return results;
  },
});


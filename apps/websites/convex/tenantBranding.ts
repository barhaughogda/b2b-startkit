import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Tenant Branding - Queries and Mutations
 * 
 * Handles tenant branding configuration including:
 * - Logo, colors, favicon
 * - Slug and domain settings
 * - Landing page configuration
 */

// Get current tenant's branding settings
export const getTenantBranding = query({
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

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      tagline: tenant.tagline,
      description: tenant.description,
      branding: tenant.branding,
      domains: tenant.domains,
      landingPage: tenant.landingPage,
      bookingSettings: tenant.bookingSettings,
      contactInfo: tenant.contactInfo,
    };
  },
});

// Update tenant branding (logo, colors)
export const updateTenantBranding = mutation({
  args: {
    tenantId: v.string(),
    logo: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    favicon: v.optional(v.string()),
    customCss: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const updates: Partial<typeof tenant.branding> = {};
    
    if (args.logo !== undefined) updates.logo = args.logo;
    if (args.primaryColor !== undefined) updates.primaryColor = args.primaryColor;
    if (args.secondaryColor !== undefined) updates.secondaryColor = args.secondaryColor;
    if (args.accentColor !== undefined) updates.accentColor = args.accentColor;
    if (args.favicon !== undefined) updates.favicon = args.favicon;
    if (args.customCss !== undefined) updates.customCss = args.customCss;

    await ctx.db.patch(tenant._id, {
      branding: {
        ...tenant.branding,
        ...updates,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update tenant slug
export const updateTenantSlug = mutation({
  args: {
    tenantId: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate slug format
    const slugRegex = /^[a-z][a-z0-9-]{2,49}$/;
    if (!slugRegex.test(args.slug)) {
      throw new Error("Invalid slug format. Use lowercase letters, numbers, and hyphens. Must start with a letter and be 3-50 characters.");
    }

    // Check if slug is already taken
    const existingTenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existingTenant && existingTenant.id !== args.tenantId) {
      throw new Error("This URL is already taken. Please choose a different one.");
    }

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    await ctx.db.patch(tenant._id, {
      slug: args.slug,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update tenant domain settings
export const updateTenantDomains = mutation({
  args: {
    tenantId: v.string(),
    subdomain: v.optional(v.string()),
    customDomain: v.optional(v.string()),
    preferredAccess: v.optional(v.union(
      v.literal("path"),
      v.literal("subdomain"),
      v.literal("custom")
    )),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Validate subdomain format if provided
    if (args.subdomain) {
      const subdomainRegex = /^[a-z][a-z0-9-]{2,49}$/;
      if (!subdomainRegex.test(args.subdomain)) {
        throw new Error("Invalid subdomain format. Use lowercase letters, numbers, and hyphens.");
      }

      // Check if subdomain is already taken
      const existingTenant = await ctx.db
        .query("tenants")
        .withIndex("by_subdomain", (q) => q.eq("domains.subdomain", args.subdomain))
        .first();

      if (existingTenant && existingTenant.id !== args.tenantId) {
        throw new Error("This subdomain is already taken. Please choose a different one.");
      }
    }

    // Validate custom domain format if provided
    if (args.customDomain) {
      const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
      if (!domainRegex.test(args.customDomain)) {
        throw new Error("Invalid domain format. Please enter a valid domain name.");
      }

      // Check if custom domain is already taken
      const existingTenant = await ctx.db
        .query("tenants")
        .withIndex("by_custom_domain", (q) => q.eq("domains.customDomain", args.customDomain))
        .first();

      if (existingTenant && existingTenant.id !== args.tenantId) {
        throw new Error("This domain is already in use. Please choose a different one.");
      }
    }

    const currentDomains = tenant.domains || {};
    const updates: typeof currentDomains = { ...currentDomains };

    if (args.subdomain !== undefined) updates.subdomain = args.subdomain;
    if (args.customDomain !== undefined) {
      updates.customDomain = args.customDomain;
      // Reset verification when domain changes
      if (args.customDomain !== currentDomains.customDomain) {
        updates.customDomainVerified = false;
        updates.customDomainVerifiedAt = undefined;
      }
    }
    if (args.preferredAccess !== undefined) updates.preferredAccess = args.preferredAccess;

    await ctx.db.patch(tenant._id, {
      domains: updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update tenant basic info (name, tagline, description)
export const updateTenantInfo = mutation({
  args: {
    tenantId: v.string(),
    name: v.optional(v.string()),
    tagline: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const updates: Partial<typeof tenant> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.tagline !== undefined) updates.tagline = args.tagline;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(tenant._id, updates);

    return { success: true };
  },
});

// Check if a slug is available
export const checkSlugAvailability = query({
  args: {
    slug: v.string(),
    excludeTenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingTenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!existingTenant) {
      return { available: true };
    }

    if (args.excludeTenantId && existingTenant.id === args.excludeTenantId) {
      return { available: true };
    }

    return { available: false };
  },
});

// Check if a subdomain is available
export const checkSubdomainAvailability = query({
  args: {
    subdomain: v.string(),
    excludeTenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingTenant = await ctx.db
      .query("tenants")
      .withIndex("by_subdomain", (q) => q.eq("domains.subdomain", args.subdomain))
      .first();

    if (!existingTenant) {
      return { available: true };
    }

    if (args.excludeTenantId && existingTenant.id === args.excludeTenantId) {
      return { available: true };
    }

    return { available: false };
  },
});


import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Landing Page Configuration - Queries and Mutations
 * 
 * Handles landing page customization including:
 * - Hero section configuration
 * - Module toggles (booking, care team, clinics, etc.)
 * - Section ordering
 * - Custom sections
 */

// Get landing page configuration
export const getLandingPageConfig = query({
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
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      landingPage: tenant.landingPage || {
        enabled: false,
        showBooking: true,
        showCareTeam: true,
        showClinics: true,
        showTestimonials: false,
        showServices: true,
        sectionOrder: ["hero", "services", "careTeam", "clinics", "booking"],
      },
      bookingSettings: tenant.bookingSettings,
      features: tenant.features,
    };
  },
});

// Update landing page enabled status
export const updateLandingPageEnabled = mutation({
  args: {
    tenantId: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentLandingPage = tenant.landingPage || {};
    await ctx.db.patch(tenant._id, {
      landingPage: {
        ...currentLandingPage,
        enabled: args.enabled,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update hero section
export const updateHeroSection = mutation({
  args: {
    tenantId: v.string(),
    heroTitle: v.optional(v.string()),
    heroSubtitle: v.optional(v.string()),
    heroImage: v.optional(v.string()),
    heroCtaText: v.optional(v.string()),
    heroCtaLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentLandingPage = tenant.landingPage || {};
    const updates: Partial<typeof currentLandingPage> = {};

    if (args.heroTitle !== undefined) updates.heroTitle = args.heroTitle;
    if (args.heroSubtitle !== undefined) updates.heroSubtitle = args.heroSubtitle;
    if (args.heroImage !== undefined) updates.heroImage = args.heroImage;
    if (args.heroCtaText !== undefined) updates.heroCtaText = args.heroCtaText;
    if (args.heroCtaLink !== undefined) updates.heroCtaLink = args.heroCtaLink;

    await ctx.db.patch(tenant._id, {
      landingPage: {
        ...currentLandingPage,
        ...updates,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update module toggles
export const updateLandingPageModules = mutation({
  args: {
    tenantId: v.string(),
    showBooking: v.optional(v.boolean()),
    showCareTeam: v.optional(v.boolean()),
    showClinics: v.optional(v.boolean()),
    showTestimonials: v.optional(v.boolean()),
    showServices: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentLandingPage = tenant.landingPage || {};
    const updates: Partial<typeof currentLandingPage> = {};

    if (args.showBooking !== undefined) updates.showBooking = args.showBooking;
    if (args.showCareTeam !== undefined) updates.showCareTeam = args.showCareTeam;
    if (args.showClinics !== undefined) updates.showClinics = args.showClinics;
    if (args.showTestimonials !== undefined) updates.showTestimonials = args.showTestimonials;
    if (args.showServices !== undefined) updates.showServices = args.showServices;

    await ctx.db.patch(tenant._id, {
      landingPage: {
        ...currentLandingPage,
        ...updates,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update section order
export const updateSectionOrder = mutation({
  args: {
    tenantId: v.string(),
    sectionOrder: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentLandingPage = tenant.landingPage || {};
    await ctx.db.patch(tenant._id, {
      landingPage: {
        ...currentLandingPage,
        sectionOrder: args.sectionOrder,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Add custom section
export const addCustomSection = mutation({
  args: {
    tenantId: v.string(),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentLandingPage = tenant.landingPage || {};
    const currentSections = currentLandingPage.customSections || [];
    
    const newSection = {
      id: `custom-${Date.now()}`,
      title: args.title,
      content: args.content,
      order: currentSections.length,
      enabled: true,
    };

    await ctx.db.patch(tenant._id, {
      landingPage: {
        ...currentLandingPage,
        customSections: [...currentSections, newSection],
      },
      updatedAt: Date.now(),
    });

    return { success: true, sectionId: newSection.id };
  },
});

// Update custom section
export const updateCustomSection = mutation({
  args: {
    tenantId: v.string(),
    sectionId: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentLandingPage = tenant.landingPage || {};
    const currentSections = currentLandingPage.customSections || [];
    
    const updatedSections = currentSections.map(section => {
      if (section.id === args.sectionId) {
        return {
          ...section,
          ...(args.title !== undefined && { title: args.title }),
          ...(args.content !== undefined && { content: args.content }),
          ...(args.enabled !== undefined && { enabled: args.enabled }),
          ...(args.order !== undefined && { order: args.order }),
        };
      }
      return section;
    });

    await ctx.db.patch(tenant._id, {
      landingPage: {
        ...currentLandingPage,
        customSections: updatedSections,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete custom section
export const deleteCustomSection = mutation({
  args: {
    tenantId: v.string(),
    sectionId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentLandingPage = tenant.landingPage || {};
    const currentSections = currentLandingPage.customSections || [];
    
    const updatedSections = currentSections.filter(
      section => section.id !== args.sectionId
    );

    await ctx.db.patch(tenant._id, {
      landingPage: {
        ...currentLandingPage,
        customSections: updatedSections,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});


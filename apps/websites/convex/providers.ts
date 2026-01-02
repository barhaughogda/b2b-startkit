import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new provider
export const createProvider = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    specialty: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    licenseNumber: v.string(),
    npi: v.string(),
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.firstName?.trim()) {
      throw new Error("First name is required");
    }
    if (!args.lastName?.trim()) {
      throw new Error("Last name is required");
    }
    if (!args.specialty?.trim()) {
      throw new Error("Specialty is required");
    }
    if (!args.email?.trim()) {
      throw new Error("Email is required");
    }
    if (!args.licenseNumber?.trim()) {
      throw new Error("License number is required");
    }
    if (!args.npi?.trim()) {
      throw new Error("NPI is required");
    }
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // Validate NPI format (10 digits)
    if (!/^\d{10}$/.test(args.npi)) {
      throw new Error("NPI must be exactly 10 digits");
    }

    // Check for duplicate email within tenant
    const existingProvider = await ctx.db
      .query("providers")
      .withIndex("by_email_tenant", (q) => 
        q.eq("email", args.email).eq("tenantId", args.tenantId)
      )
      .first();
    
    if (existingProvider) {
      throw new Error("Provider with this email already exists in this tenant");
    }

    // Check for duplicate NPI within tenant
    const existingNPI = await ctx.db
      .query("providers")
      .withIndex("by_npi", (q) => q.eq("npi", args.npi))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();
    
    if (existingNPI) {
      throw new Error("Provider with this NPI already exists in this tenant");
    }

    // Validate phone format if provided
    if (args.phone && !/^\+?[\d\s\-\(\)]+$/.test(args.phone)) {
      throw new Error("Invalid phone number format");
    }

    try {
      const now = Date.now();
      return await ctx.db.insert("providers", {
        ...args,
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        specialty: args.specialty.trim(),
        email: args.email.trim().toLowerCase(),
        licenseNumber: args.licenseNumber.trim(),
        npi: args.npi.trim(),
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      throw new Error(`Failed to create provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Get provider by ID
export const getProvider = query({
  args: { id: v.id("providers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get provider by email and tenant
export const getProviderByEmail = query({
  args: { 
    email: v.string(),
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("providers")
      .withIndex("by_email_tenant", (q) => 
        q.eq("email", args.email).eq("tenantId", args.tenantId)
      )
      .first();
  },
});

// Search providers by specialty
export const getProvidersBySpecialty = query({
  args: { specialty: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("providers")
      .withIndex("by_specialty", (q) => q.eq("specialty", args.specialty))
      .collect();
  },
});

// Update provider
export const updateProvider = mutation({
  args: {
    id: v.id("providers"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    specialty: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    npi: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete provider
export const deleteProvider = mutation({
  args: { id: v.id("providers") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// List all providers
export const listProviders = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db.query("providers").take(limit);
  },
});

// Get providers by tenant (real-time dashboard)
export const getProvidersByTenant = query({
  args: { 
    tenantId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    return await ctx.db
      .query("providers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(limit);
  },
});

// Get providers by specialty with tenant filtering (real-time filtering)
export const getProvidersBySpecialtyWithTenant = query({
  args: { 
    specialty: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("providers")
      .withIndex("by_specialty", (q) => q.eq("specialty", args.specialty))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();
  },
});

// Get provider statistics (real-time metrics)
export const getProviderStats = query({
  args: { 
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    
    // Group by specialty
    const specialtyCounts = providers.reduce((acc, provider) => {
      acc[provider.specialty] = (acc[provider.specialty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: providers.length,
      specialties: Object.keys(specialtyCounts).length,
      specialtyBreakdown: specialtyCounts,
      withPhone: providers.filter(p => p.phone).length,
    };
  },
});

// Get recent providers (real-time activity feed)
export const getRecentProviders = query({
  args: { 
    tenantId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    return await ctx.db
      .query("providers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(limit);
  },
});

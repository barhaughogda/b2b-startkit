import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Booking Configuration - Queries and Mutations
 * 
 * Handles booking settings configuration including:
 * - Booking mode (full, request, account_required, disabled)
 * - Required fields
 * - Appointment types
 * - Advance booking limits
 */

// Get booking configuration
export const getBookingConfig = query({
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
      bookingSettings: tenant.bookingSettings || {
        mode: "disabled",
        requirePhone: false,
        requireInsurance: false,
        requireDateOfBirth: false,
        advanceBookingDays: 30,
        minimumNoticeHours: 24,
        appointmentTypes: [],
      },
      features: tenant.features,
    };
  },
});

// Update booking mode
export const updateBookingMode = mutation({
  args: {
    tenantId: v.string(),
    mode: v.union(
      v.literal("full"),
      v.literal("request"),
      v.literal("account_required"),
      v.literal("disabled")
    ),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentSettings = tenant.bookingSettings || {};
    await ctx.db.patch(tenant._id, {
      bookingSettings: {
        ...currentSettings,
        mode: args.mode,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update booking requirements
export const updateBookingRequirements = mutation({
  args: {
    tenantId: v.string(),
    requirePhone: v.optional(v.boolean()),
    requireInsurance: v.optional(v.boolean()),
    requireDateOfBirth: v.optional(v.boolean()),
    advanceBookingDays: v.optional(v.number()),
    minimumNoticeHours: v.optional(v.number()),
    welcomeMessage: v.optional(v.string()),
    confirmationMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentSettings = tenant.bookingSettings || {};
    const updates: Partial<typeof currentSettings> = {};

    if (args.requirePhone !== undefined) updates.requirePhone = args.requirePhone;
    if (args.requireInsurance !== undefined) updates.requireInsurance = args.requireInsurance;
    if (args.requireDateOfBirth !== undefined) updates.requireDateOfBirth = args.requireDateOfBirth;
    if (args.advanceBookingDays !== undefined) updates.advanceBookingDays = args.advanceBookingDays;
    if (args.minimumNoticeHours !== undefined) updates.minimumNoticeHours = args.minimumNoticeHours;
    if (args.welcomeMessage !== undefined) updates.welcomeMessage = args.welcomeMessage;
    if (args.confirmationMessage !== undefined) updates.confirmationMessage = args.confirmationMessage;

    await ctx.db.patch(tenant._id, {
      bookingSettings: {
        ...currentSettings,
        ...updates,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Pricing validator for service pricing configuration
const pricingValidator = v.optional(
  v.object({
    mode: v.union(
      v.literal('hidden'),
      v.literal('free'),
      v.literal('fixed'),
      v.literal('from'),
      v.literal('range')
    ),
    currency: v.optional(v.string()),
    amountCents: v.optional(v.number()),
    minCents: v.optional(v.number()),
    maxCents: v.optional(v.number()),
  })
);

// Icon validator for service icon configuration
const iconValidator = v.optional(
  v.union(
    v.object({
      kind: v.literal('lucide'),
      name: v.string(),
    }),
    v.object({
      kind: v.literal('customSvg'),
      url: v.string(),
    })
  )
);

// Add appointment type (service)
export const addAppointmentType = mutation({
  args: {
    tenantId: v.string(),
    name: v.string(),
    duration: v.number(),
    description: v.optional(v.string()),
    allowOnline: v.optional(v.boolean()),
    price: v.optional(v.number()), // Legacy field
    pricing: pricingValidator,
    icon: iconValidator,
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentSettings = tenant.bookingSettings || {};
    const currentTypes = currentSettings.appointmentTypes || [];

    // Build pricing object - if legacy price is provided without pricing, convert to fixed mode
    let pricing = args.pricing;
    if (!pricing && args.price !== undefined) {
      pricing = {
        mode: 'fixed' as const,
        amountCents: args.price,
      };
    }

    const newType = {
      id: `type-${Date.now()}`,
      name: args.name,
      duration: args.duration,
      description: args.description,
      enabled: true,
      allowOnline: args.allowOnline ?? true,
      price: args.price, // Keep legacy field for backward compatibility
      pricing,
      icon: args.icon,
    };

    await ctx.db.patch(tenant._id, {
      bookingSettings: {
        ...currentSettings,
        appointmentTypes: [...currentTypes, newType],
      },
      updatedAt: Date.now(),
    });

    return { success: true, typeId: newType.id };
  },
});

// Update appointment type (service)
export const updateAppointmentType = mutation({
  args: {
    tenantId: v.string(),
    typeId: v.string(),
    name: v.optional(v.string()),
    duration: v.optional(v.number()),
    description: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    allowOnline: v.optional(v.boolean()),
    price: v.optional(v.number()), // Legacy field
    pricing: pricingValidator,
    icon: iconValidator,
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentSettings = tenant.bookingSettings || {};
    const currentTypes = currentSettings.appointmentTypes || [];

    const updatedTypes = currentTypes.map(type => {
      if (type.id === args.typeId) {
        return {
          ...type,
          ...(args.name !== undefined && { name: args.name }),
          ...(args.duration !== undefined && { duration: args.duration }),
          ...(args.description !== undefined && { description: args.description }),
          ...(args.enabled !== undefined && { enabled: args.enabled }),
          ...(args.allowOnline !== undefined && { allowOnline: args.allowOnline }),
          ...(args.price !== undefined && { price: args.price }),
          ...(args.pricing !== undefined && { pricing: args.pricing }),
          ...(args.icon !== undefined && { icon: args.icon }),
        };
      }
      return type;
    });

    await ctx.db.patch(tenant._id, {
      bookingSettings: {
        ...currentSettings,
        appointmentTypes: updatedTypes,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete appointment type
export const deleteAppointmentType = mutation({
  args: {
    tenantId: v.string(),
    typeId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentSettings = tenant.bookingSettings || {};
    const currentTypes = currentSettings.appointmentTypes || [];

    await ctx.db.patch(tenant._id, {
      bookingSettings: {
        ...currentSettings,
        appointmentTypes: currentTypes.filter(type => type.id !== args.typeId),
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});


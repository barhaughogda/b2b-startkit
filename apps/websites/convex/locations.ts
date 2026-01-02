import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { createHIPAAAuditLogger } from "./auditLogger";

// Create a new location
export const createLocation = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.optional(v.string()),
    })),
    phone: v.optional(v.string()),
    type: v.union(
      v.literal("office"),
      v.literal("hospital"),
      v.literal("telehealth")
    ),
    tenantId: v.string(), // Required for tenant isolation
    userId: v.optional(v.id("users")), // User who created the location (for audit logging)
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.name?.trim()) {
      throw new Error("Location name is required");
    }
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Validate phone format if provided
    if (args.phone && !/^\+?[\d\s\-\(\)]+$/.test(args.phone)) {
      throw new Error("Invalid phone number format");
    }

    try {
      const now = Date.now();
      const locationId = await ctx.db.insert("locations", {
        name: args.name.trim(),
        address: args.address,
        phone: args.phone?.trim(),
        type: args.type,
        tenantId: args.tenantId,
        createdAt: now,
        updatedAt: now,
      });

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logCalendarEdit({
        tenantId: args.tenantId,
        userId: args.userId,
        action: "location_created",
        resource: "locations",
        resourceId: locationId,
        details: {
          name: args.name.trim(),
          type: args.type,
        },
      });

      return locationId;
    } catch (error) {
      throw new Error(`Failed to create location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Update location details
export const updateLocation = mutation({
  args: {
    id: v.id("locations"),
    name: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.optional(v.string()),
    })),
    phone: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("office"),
      v.literal("hospital"),
      v.literal("telehealth")
    )),
    userId: v.optional(v.id("users")), // User who updated the location (for audit logging)
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Validate phone format if provided
    if (updates.phone && !/^\+?[\d\s\-\(\)]+$/.test(updates.phone)) {
      throw new Error("Invalid phone number format");
    }

    // Check if location exists
    const location = await ctx.db.get(id);
    if (!location) {
      throw new Error("Location not found");
    }

    // Store original values for audit logging
    const originalValues = {
      name: location.name,
      type: location.type,
    };

    // Prepare update object with trimmed strings
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.address !== undefined) {
      updateData.address = updates.address;
    }
    if (updates.phone !== undefined) {
      updateData.phone = updates.phone?.trim();
    }
    if (updates.type !== undefined) {
      updateData.type = updates.type;
    }

    try {
      await ctx.db.patch(id, updateData);

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logCalendarEdit({
        tenantId: location.tenantId,
        userId: args.userId,
        action: "location_updated",
        resource: "locations",
        resourceId: id,
        details: {
          locationId: id,
          original: originalValues,
          updated: {
            name: updateData.name ?? originalValues.name,
            type: updateData.type ?? originalValues.type,
          },
        },
      });

      return id;
    } catch (error) {
      throw new Error(`Failed to update location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Soft delete location (mark as deleted but keep record)
// Note: In a production system, you might want to add a `deletedAt` field to the schema
// For now, we'll use a hard delete but check for dependencies first
export const deleteLocation = mutation({
  args: { 
    id: v.id("locations"),
    tenantId: v.string(), // Required for tenant isolation verification
    userId: v.optional(v.id("users")), // User who deleted the location (for audit logging)
  },
  handler: async (ctx, args) => {
    // Check if location exists and belongs to tenant
    const location = await ctx.db.get(args.id);
    if (!location) {
      throw new Error("Location not found");
    }
    if (location.tenantId !== args.tenantId) {
      throw new Error("Location does not belong to the specified tenant");
    }

    // Check if location is still in use by providers
    const providerLocations = await ctx.db
      .query("providerLocations")
      .withIndex("by_location", (q) => q.eq("locationId", args.id))
      .collect();

    if (providerLocations.length > 0) {
      throw new Error("Cannot delete location: it is still assigned to one or more providers");
    }

    // Check if location is referenced by any appointments
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_location", (q) => q.eq("locationId", args.id))
      .first();

    if (appointments) {
      throw new Error("Cannot delete location: it is referenced by existing appointments");
    }

    // Store location details for audit logging before deletion
    const locationDetails = {
      name: location.name,
      type: location.type,
    };

    try {
      await ctx.db.delete(args.id);

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logCalendarEdit({
        tenantId: args.tenantId,
        userId: args.userId,
        action: "location_deleted",
        resource: "locations",
        resourceId: args.id,
        details: {
          locationId: args.id,
          ...locationDetails,
        },
      });

      return args.id;
    } catch (error) {
      throw new Error(`Failed to delete location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Get location by ID
export const getLocation = query({
  args: { id: v.id("locations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// List all locations for a tenant
export const getLocationsByTenant = query({
  args: { 
    tenantId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    return await ctx.db
      .query("locations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(limit);
  },
});

// Alias for getLocationsByTenant - matches calendar page usage
export const getLocations = query({
  args: { 
    tenantId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    return await ctx.db
      .query("locations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(limit);
  },
});

// Get locations by type for a tenant
export const getLocationsByType = query({
  args: { 
    tenantId: v.string(),
    type: v.union(
      v.literal("office"),
      v.literal("hospital"),
      v.literal("telehealth")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("locations")
      .withIndex("by_tenant_type", (q) => 
        q.eq("tenantId", args.tenantId).eq("type", args.type)
      )
      .collect();
  },
});

// Get locations for a specific provider
export const getProviderLocations = query({
  args: { 
    providerId: v.id("providers"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get provider-location relationships
    const providerLocations = await ctx.db
      .query("providerLocations")
      .withIndex("by_provider_tenant", (q) => 
        q.eq("providerId", args.providerId).eq("tenantId", args.tenantId)
      )
      .collect();

    // Fetch full location details (filter out entries with undefined locationId)
    const locations = await Promise.all(
      providerLocations
        .filter((pl) => pl.locationId !== undefined)
        .map(async (pl) => {
          const location = await ctx.db.get(pl.locationId!);
          return {
            ...location,
            isDefault: pl.isDefault,
            providerLocationId: pl._id,
          };
        })
    );

    return locations.filter(loc => loc !== null);
  },
});

// Assign provider to a location
export const addProviderToLocation = mutation({
  args: {
    providerId: v.id("providers"),
    locationId: v.id("locations"),
    isDefault: v.optional(v.boolean()),
    tenantId: v.string(),
    userId: v.optional(v.id("users")), // User who assigned the provider (for audit logging)
  },
  handler: async (ctx, args) => {
    // Validate that provider exists and belongs to tenant
    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }
    if (provider.tenantId !== args.tenantId) {
      throw new Error("Provider does not belong to the specified tenant");
    }

    // Validate that location exists and belongs to tenant
    const location = await ctx.db.get(args.locationId);
    if (!location) {
      throw new Error("Location not found");
    }
    if (location.tenantId !== args.tenantId) {
      throw new Error("Location does not belong to the specified tenant");
    }

    // Check if provider is already assigned to this location
    const existing = await ctx.db
      .query("providerLocations")
      .withIndex("by_provider_tenant", (q) => 
        q.eq("providerId", args.providerId).eq("tenantId", args.tenantId)
      )
      .filter((q) => q.eq(q.field("locationId"), args.locationId))
      .first();

    if (existing) {
      throw new Error("Provider is already assigned to this location");
    }

    // If this is set as default, unset other defaults for this provider
    const isDefault = args.isDefault ?? false;
    if (isDefault) {
      const currentDefaults = await ctx.db
        .query("providerLocations")
        .withIndex("by_default", (q) => 
          q.eq("providerId", args.providerId).eq("isDefault", true)
        )
        .collect();

      // Unset all current defaults
      await Promise.all(
        currentDefaults.map((pl) =>
          ctx.db.patch(pl._id, { isDefault: false, updatedAt: Date.now() })
        )
      );
    }

    try {
      const now = Date.now();
      const providerLocationId = await ctx.db.insert("providerLocations", {
        providerId: args.providerId,
        locationId: args.locationId,
        isDefault: isDefault,
        tenantId: args.tenantId,
        createdAt: now,
        updatedAt: now,
      });

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logCalendarEdit({
        tenantId: args.tenantId,
        userId: args.userId,
        action: "provider_location_assigned",
        resource: "locations",
        resourceId: args.locationId,
        details: {
          providerId: args.providerId,
          locationId: args.locationId,
          locationName: location.name,
          isDefault: isDefault,
        },
      });

      return providerLocationId;
    } catch (error) {
      throw new Error(`Failed to assign provider to location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Remove provider from a location
export const removeProviderFromLocation = mutation({
  args: {
    providerLocationId: v.id("providerLocations"),
    tenantId: v.string(), // Required for tenant isolation verification
    userId: v.optional(v.id("users")), // User who removed the provider (for audit logging)
  },
  handler: async (ctx, args) => {
    // Check if provider-location relationship exists
    const providerLocation = await ctx.db.get(args.providerLocationId);
    if (!providerLocation) {
      throw new Error("Provider-location relationship not found");
    }
    if (providerLocation.tenantId !== args.tenantId) {
      throw new Error("Provider-location relationship does not belong to the specified tenant");
    }
    if (!providerLocation.locationId) {
      throw new Error("Provider-location relationship has no locationId");
    }

    // Get location details for audit logging
    const location = await ctx.db.get(providerLocation.locationId);
    const locationName = location?.name || "Unknown";

    try {
      await ctx.db.delete(args.providerLocationId);

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logCalendarEdit({
        tenantId: args.tenantId,
        userId: args.userId,
        action: "provider_location_removed",
        resource: "locations",
        resourceId: providerLocation.locationId,
        details: {
          providerId: providerLocation.providerId,
          locationId: providerLocation.locationId,
          locationName: locationName,
        },
      });

      return args.providerLocationId;
    } catch (error) {
      throw new Error(`Failed to remove provider from location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Set provider's default location
export const setDefaultLocation = mutation({
  args: {
    providerId: v.id("providers"),
    locationId: v.id("locations"),
    tenantId: v.string(),
    userId: v.optional(v.id("users")), // User who set the default location (for audit logging)
  },
  handler: async (ctx, args) => {
    // Validate that provider exists and belongs to tenant
    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }
    if (provider.tenantId !== args.tenantId) {
      throw new Error("Provider does not belong to the specified tenant");
    }

    // Validate that location exists and belongs to tenant
    const location = await ctx.db.get(args.locationId);
    if (!location) {
      throw new Error("Location not found");
    }
    if (location.tenantId !== args.tenantId) {
      throw new Error("Location does not belong to the specified tenant");
    }

    // Find the provider-location relationship
    const providerLocation = await ctx.db
      .query("providerLocations")
      .withIndex("by_provider_tenant", (q) => 
        q.eq("providerId", args.providerId).eq("tenantId", args.tenantId)
      )
      .filter((q) => q.eq(q.field("locationId"), args.locationId))
      .first();

    if (!providerLocation) {
      throw new Error("Provider is not assigned to this location");
    }

    // Unset all current defaults for this provider
    const currentDefaults = await ctx.db
      .query("providerLocations")
      .withIndex("by_default", (q) => 
        q.eq("providerId", args.providerId).eq("isDefault", true)
      )
      .collect();

    await Promise.all(
      currentDefaults.map((pl) =>
        ctx.db.patch(pl._id, { isDefault: false, updatedAt: Date.now() })
      )
    );

    // Set the new default
    try {
      const now = Date.now();
      await ctx.db.patch(providerLocation._id, {
        isDefault: true,
        updatedAt: now,
      });

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logCalendarEdit({
        tenantId: args.tenantId,
        userId: args.userId,
        action: "provider_default_location_set",
        resource: "locations",
        resourceId: args.locationId,
        details: {
          providerId: args.providerId,
          locationId: args.locationId,
          locationName: location.name,
        },
      });

      return providerLocation._id;
    } catch (error) {
      throw new Error(`Failed to set default location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// ============================================================================
// USER-BASED LOCATION FUNCTIONS (for clinic/user-centric calendar)
// ============================================================================

// Get user locations (user-based, not provider-based)
// Looks up provider from user via providerProfiles, then gets locations
export const getUserLocations = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Get provider profile to find providerId
    const providerProfile = await ctx.db
      .query("providerProfiles")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId)
      )
      .first();

    if (!providerProfile || !providerProfile.providerId) {
      // User doesn't have a provider profile - return empty array
      return [];
    }

    // Use existing getProviderLocations logic
    const providerLocations = await ctx.db
      .query("providerLocations")
      .withIndex("by_provider_tenant", (q) => 
        q.eq("providerId", providerProfile.providerId!).eq("tenantId", args.tenantId)
      )
      .collect();

    // Fetch full location details (filter out entries with undefined locationId)
    const locations = await Promise.all(
      providerLocations
        .filter((pl) => pl.locationId !== undefined)
        .map(async (pl) => {
          const location = await ctx.db.get(pl.locationId!);
          return {
            ...location,
            isDefault: pl.isDefault,
            providerLocationId: pl._id,
          };
        })
    );

    return locations.filter(loc => loc !== null);
  },
});

// Add user to a location (user-based)
// Looks up provider from user, then assigns provider to location
export const addUserToLocation = mutation({
  args: {
    userId: v.id("users"),
    locationId: v.id("locations"),
    isDefault: v.optional(v.boolean()),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Get provider profile to find providerId
    const providerProfile = await ctx.db
      .query("providerProfiles")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId)
      )
      .first();

    if (!providerProfile || !providerProfile.providerId) {
      throw new Error("User does not have a provider profile");
    }

    // Use existing addProviderToLocation logic
    const provider = await ctx.db.get(providerProfile.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }
    if (provider.tenantId !== args.tenantId) {
      throw new Error("Provider does not belong to the specified tenant");
    }

    // Validate that location exists and belongs to tenant
    const location = await ctx.db.get(args.locationId);
    if (!location) {
      throw new Error("Location not found");
    }
    if (location.tenantId !== args.tenantId) {
      throw new Error("Location does not belong to the specified tenant");
    }

    // Check if provider is already assigned to this location
    const existing = await ctx.db
      .query("providerLocations")
      .withIndex("by_provider_tenant", (q) => 
        q.eq("providerId", providerProfile.providerId!).eq("tenantId", args.tenantId)
      )
      .filter((q) => q.eq(q.field("locationId"), args.locationId))
      .first();

    if (existing) {
      throw new Error("User is already assigned to this location");
    }

    // If this is set as default, unset other defaults for this provider
    const isDefault = args.isDefault ?? false;
    if (isDefault) {
      const currentDefaults = await ctx.db
        .query("providerLocations")
        .withIndex("by_default", (q) => 
          q.eq("providerId", providerProfile.providerId!).eq("isDefault", true)
        )
        .collect();

      // Unset all current defaults
      await Promise.all(
        currentDefaults.map((pl) =>
          ctx.db.patch(pl._id, { isDefault: false, updatedAt: Date.now() })
        )
      );
    }

    try {
      const now = Date.now();
      const providerLocationId = await ctx.db.insert("providerLocations", {
        providerId: providerProfile.providerId!,
        locationId: args.locationId,
        isDefault: isDefault,
        tenantId: args.tenantId,
        createdAt: now,
        updatedAt: now,
      });

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logCalendarEdit({
        tenantId: args.tenantId,
        userId: args.userId,
        action: "provider_location_assigned",
        resource: "locations",
        resourceId: args.locationId,
        details: {
          providerId: providerProfile.providerId!,
          locationId: args.locationId,
          locationName: location.name,
          isDefault: isDefault,
        },
      });

      return providerLocationId;
    } catch (error) {
      throw new Error(`Failed to assign user to location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Set user's default location (user-based)
export const setUserDefaultLocation = mutation({
  args: {
    userId: v.id("users"),
    locationId: v.id("locations"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Get provider profile to find providerId
    const providerProfile = await ctx.db
      .query("providerProfiles")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId)
      )
      .first();

    if (!providerProfile || !providerProfile.providerId) {
      throw new Error("User does not have a provider profile");
    }

    // Use existing setDefaultLocation logic
    const provider = await ctx.db.get(providerProfile.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }
    if (provider.tenantId !== args.tenantId) {
      throw new Error("Provider does not belong to the specified tenant");
    }

    // Validate that location exists and belongs to tenant
    const location = await ctx.db.get(args.locationId);
    if (!location) {
      throw new Error("Location not found");
    }
    if (location.tenantId !== args.tenantId) {
      throw new Error("Location does not belong to the specified tenant");
    }

    // Find the provider-location relationship
    const providerLocation = await ctx.db
      .query("providerLocations")
      .withIndex("by_provider_tenant", (q) => 
        q.eq("providerId", providerProfile.providerId!).eq("tenantId", args.tenantId)
      )
      .filter((q) => q.eq(q.field("locationId"), args.locationId))
      .first();

    if (!providerLocation) {
      throw new Error("User is not assigned to this location");
    }

    // Unset all current defaults for this provider
    const currentDefaults = await ctx.db
      .query("providerLocations")
      .withIndex("by_default", (q) => 
        q.eq("providerId", providerProfile.providerId!).eq("isDefault", true)
      )
      .collect();

    await Promise.all(
      currentDefaults.map((pl) =>
        ctx.db.patch(pl._id, { isDefault: false, updatedAt: Date.now() })
      )
    );

    // Set the new default
    try {
      const now = Date.now();
      await ctx.db.patch(providerLocation._id, {
        isDefault: true,
        updatedAt: now,
      });

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logCalendarEdit({
        tenantId: args.tenantId,
        userId: args.userId,
        action: "provider_default_location_set",
        resource: "locations",
        resourceId: args.locationId,
        details: {
          providerId: providerProfile.providerId!,
          locationId: args.locationId,
          locationName: location.name,
        },
      });

      return providerLocation._id;
    } catch (error) {
      throw new Error(`Failed to set default location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});


import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Create a clinic
 * 
 * This mutation creates a new clinic for a tenant.
 * Used for creating default clinics during migration and for owner-created clinics.
 * 
 * Note: Owner access validation should be done at the API route level (Task 6.2.6).
 * This mutation is a low-level function that assumes authorization has been checked.
 */
export const createClinic = mutation({
  args: {
    tenantId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    // Structured address (canonical format)
    address: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zipCode: v.string(),
        country: v.optional(v.string()),
      })
    ),
    // Legacy string address for backward compatibility
    addressLegacy: v.optional(v.string()),
    phone: v.optional(v.string()), // Clinic phone number
    type: v.optional(
      v.union(
        v.literal('office'),
        v.literal('hospital'),
        v.literal('telehealth')
      )
    ), // Clinic type
    timezone: v.optional(v.string()), // IANA timezone (e.g., "America/New_York"). Defaults to tenant timezone if not set.
    isActive: v.boolean(),
    // Migration tracking
    migratedFromLocationId: v.optional(v.string()), // Original location ID if migrated from locations table
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const clinicId = await ctx.db.insert("clinics", {
      tenantId: args.tenantId,
      name: args.name,
      description: args.description,
      address: args.address,
      addressLegacy: args.addressLegacy,
      phone: args.phone,
      type: args.type,
      timezone: args.timezone,
      isActive: args.isActive,
      migratedFromLocationId: args.migratedFromLocationId,
      createdAt: args.createdAt ?? now,
      updatedAt: args.updatedAt ?? now,
    });

    return clinicId;
  },
});

/**
 * Get clinic by ID
 */
export const getClinic = query({
  args: {
    clinicId: v.id("clinics"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.clinicId);
  },
});

/**
 * Get the effective timezone for a clinic
 * Returns the clinic's timezone if set, otherwise falls back to the tenant's timezone
 */
export const getClinicTimezone = query({
  args: {
    clinicId: v.id("clinics"),
  },
  handler: async (ctx, args) => {
    // Get the clinic
    const clinic = await ctx.db.get(args.clinicId);
    if (!clinic) {
      return null;
    }

    // If clinic has a timezone set, return it
    if (clinic.timezone) {
      return {
        timezone: clinic.timezone,
        source: 'clinic' as const,
        clinicId: clinic._id,
        clinicName: clinic.name,
      };
    }

    // Fall back to tenant timezone
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", clinic.tenantId))
      .first();

    if (tenant?.settings?.timezone) {
      return {
        timezone: tenant.settings.timezone,
        source: 'tenant' as const,
        clinicId: clinic._id,
        clinicName: clinic.name,
      };
    }

    // Ultimate fallback: UTC
    return {
      timezone: 'UTC',
      source: 'default' as const,
      clinicId: clinic._id,
      clinicName: clinic.name,
    };
  },
});

/**
 * Get all clinics for a tenant
 */
export const getClinicsByTenant = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clinics")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

/**
 * Find a clinic by name and tenant
 * Useful for checking if a default clinic already exists during migration
 */
export const findClinicByName = query({
  args: {
    tenantId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const clinics = await ctx.db
      .query("clinics")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return clinics.find((clinic) => clinic.name === args.name);
  },
});

/**
 * Assign a user to a clinic
 * Updates the user's clinics array to include the clinic ID
 * 
 * Note: This function does not validate that the clinic exists or that the user
 * belongs to the same tenant. These validations should be done at the API route level.
 * This mutation is a low-level function that assumes authorization has been checked.
 * 
 * IMPORTANT: Clinic ID Type Consistency
 * - Clinics are created with type Id<"clinics"> (Convex ID)
 * - However, user.clinics array stores clinic IDs as strings
 * - When calling this function, convert the clinic ID to string:
 *   Example: clinicId: clinicId as string
 * - This design allows for easier serialization and avoids type complexity in arrays
 */
export const assignUserToClinic = mutation({
  args: {
    userId: v.id("users"),
    clinicId: v.string(), // Clinic ID as string (stored in user.clinics array)
    // Note: Even though clinics are created as Id<"clinics">, they are stored
    // as strings in the user.clinics array for consistency and easier serialization
  },
  handler: async (ctx, args) => {
    // Get the user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error(`User with ID ${args.userId} not found`);
    }

    // Get current clinics array (default to empty array if undefined)
    const currentClinics = user.clinics ?? [];

    // Check if user is already assigned to this clinic (idempotent)
    if (currentClinics.includes(args.clinicId)) {
      // User already assigned - no change needed
      return {
        success: true,
        message: `User already assigned to clinic ${args.clinicId}`,
        userId: user._id,
        clinicId: args.clinicId,
      };
    }

    // Add clinic to user's clinics array
    const updatedClinics = [...currentClinics, args.clinicId];

    // Update user
    await ctx.db.patch(args.userId, {
      clinics: updatedClinics,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Successfully assigned user to clinic ${args.clinicId}`,
      userId: user._id,
      clinicId: args.clinicId,
    };
  },
});

/**
 * Assign multiple users to a clinic
 * Used during migration to assign all users in a tenant to the default clinic
 * 
 * Note: This is a helper mutation that calls assignUserToClinic for each user.
 * For better performance during migration, consider calling assignUserToClinic
 * directly from the migration script for each user.
 */
export const assignUsersToClinic = mutation({
  args: {
    userIds: v.array(v.id("users")),
    clinicId: v.string(),
  },
  handler: async (ctx, args) => {
    const results = [];
    const errors = [];

    for (const userId of args.userIds) {
      try {
        // Get the user
        const user = await ctx.db.get(userId);
        if (!user) {
          errors.push({
            userId,
            error: "User not found",
          });
          continue;
        }

        // Get current clinics array (default to empty array if undefined)
        const currentClinics = user.clinics ?? [];

        // Check if user is already assigned to this clinic (idempotent)
        if (currentClinics.includes(args.clinicId)) {
          results.push({
            success: true,
            message: `User already assigned to clinic ${args.clinicId}`,
            userId: user._id,
            clinicId: args.clinicId,
          });
          continue;
        }

        // Add clinic to user's clinics array
        const updatedClinics = [...currentClinics, args.clinicId];

        // Update user
        await ctx.db.patch(userId, {
          clinics: updatedClinics,
          updatedAt: Date.now(),
        });

        results.push({
          success: true,
          message: `Successfully assigned user to clinic ${args.clinicId}`,
          userId: user._id,
          clinicId: args.clinicId,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({
          userId,
          error: errorMessage,
        });
      }
    }

    return {
      success: errors.length === 0,
      assigned: results.length,
      failed: errors.length,
      results,
      errors,
    };
  },
});

/**
 * Remove a user from a clinic
 * Updates the user's clinics array to remove the clinic ID
 * 
 * Note: This function does not validate that the clinic exists or that the user
 * belongs to the same tenant. These validations should be done at the API route level.
 * This mutation is a low-level function that assumes authorization has been checked.
 * 
 * IMPORTANT: Clinic ID Type Consistency
 * - Clinics are created with type Id<"clinics"> (Convex ID)
 * - However, user.clinics array stores clinic IDs as strings
 * - When calling this function, convert the clinic ID to string:
 *   Example: clinicId: clinicId as string
 */
export const removeUserFromClinic = mutation({
  args: {
    userId: v.id("users"),
    clinicId: v.string(), // Clinic ID as string (stored in user.clinics array)
  },
  handler: async (ctx, args) => {
    // Get the user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error(`User with ID ${args.userId} not found`);
    }

    // Get current clinics array (default to empty array if undefined)
    const currentClinics = user.clinics ?? [];

    // Check if user is assigned to this clinic
    if (!currentClinics.includes(args.clinicId)) {
      // User not assigned - no change needed (idempotent)
      return {
        success: true,
        message: `User not assigned to clinic ${args.clinicId}`,
        userId: user._id,
        clinicId: args.clinicId,
      };
    }

    // Remove clinic from user's clinics array
    const updatedClinics = currentClinics.filter(
      (clinicId) => clinicId !== args.clinicId
    );

    // Update user
    await ctx.db.patch(args.userId, {
      clinics: updatedClinics,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Successfully removed user from clinic ${args.clinicId}`,
      userId: user._id,
      clinicId: args.clinicId,
    };
  },
});

/**
 * Update a clinic
 * 
 * This mutation updates an existing clinic's fields including name, description,
 * address, phone, type, timezone, and active status.
 * 
 * Note: Owner access validation should be done at the API route level.
 * This mutation is a low-level function that assumes authorization has been checked.
 */
export const updateClinic = mutation({
  args: {
    clinicId: v.id("clinics"),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    // Structured address (canonical format)
    address: v.optional(
      v.union(
        v.object({
          street: v.string(),
          city: v.string(),
          state: v.string(),
          zipCode: v.string(),
          country: v.optional(v.string()),
        }),
        v.null()
      )
    ),
    // Legacy string address for backward compatibility
    addressLegacy: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    type: v.optional(
      v.union(
        v.literal('office'),
        v.literal('hospital'),
        v.literal('telehealth'),
        v.null()
      )
    ),
    timezone: v.optional(v.union(v.string(), v.null())), // IANA timezone (e.g., "America/New_York"). Set to null to use tenant default.
    isActive: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { clinicId, updatedAt, ...updates } = args;
    const patchData: Record<string, unknown> = {
      ...updates,
      updatedAt: updatedAt || Date.now(),
    };
    
    return await ctx.db.patch(clinicId, patchData);
  },
});

/**
 * Delete a clinic
 * 
 * This mutation deletes a clinic from the database.
 * 
 * Note: Owner access validation and usage checking should be done at the API route level.
 * This mutation is a low-level function that assumes authorization has been checked.
 */
export const deleteClinic = mutation({
  args: {
    clinicId: v.id("clinics"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.clinicId);
    return args.clinicId;
  },
});

/**
 * Get clinic usage counts (how many users are in each clinic)
 * Returns a map of clinicId -> user count for all clinics in a tenant
 */
export const getClinicUsageCounts = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all users for this tenant
    const users = await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Count users per clinic
    const usageCounts: Record<string, number> = {};
    
    for (const user of users) {
      // Get user's clinics array (default to empty array if undefined)
      const userClinics = user.clinics ?? [];
      
      // Count user in each clinic they belong to
      for (const clinicId of userClinics) {
        // Convert clinic ID to string for consistency (clinics are stored as strings in user.clinics)
        const clinicIdStr = typeof clinicId === 'string' ? clinicId : clinicId;
        usageCounts[clinicIdStr] = (usageCounts[clinicIdStr] || 0) + 1;
      }
    }

    return usageCounts;
  },
});

/**
 * Get all clinics a user is assigned to
 * Returns the full clinic details for each clinic in the user's clinics array
 */
export const getUserClinics = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return [];
    }

    // Verify user belongs to the tenant
    if (user.tenantId !== args.tenantId) {
      return [];
    }

    // Get clinic IDs from user
    const clinicIds = user.clinics ?? [];
    
    // Fetch full clinic details for each ID
    const clinics = [];
    for (const clinicId of clinicIds) {
      try {
        const clinic = await ctx.db.get(clinicId as Id<"clinics">);
        if (clinic && "tenantId" in clinic && "isActive" in clinic && clinic.tenantId === args.tenantId && clinic.isActive !== false) {
          clinics.push(clinic);
        }
      } catch {
        // Invalid clinic ID, skip
      }
    }

    return clinics;
  },
});

/**
 * Get active clinics for a tenant (excluding ones already assigned to a user)
 * Used for the clinic selection UI where providers add themselves to clinics
 */
export const getAvailableClinicsForUser = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return [];
    }

    // Verify user belongs to the tenant
    if (user.tenantId !== args.tenantId) {
      return [];
    }

    // Get all active clinics for the tenant
    const allClinics = await ctx.db
      .query("clinics")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Get user's current clinic IDs
    const userClinicIds = new Set(user.clinics ?? []);

    // Filter to only active clinics not yet assigned to the user
    return allClinics.filter(
      (clinic) => clinic.isActive !== false && !userClinicIds.has(clinic._id)
    );
  },
});

/**
 * Get a user's default clinic (the first clinic in their clinics array)
 * This is used when booking appointments and setting availability defaults
 */
export const getUserDefaultClinic = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    // Verify user belongs to the tenant
    if (user.tenantId !== args.tenantId) {
      return null;
    }

    // Get first clinic ID
    const clinicIds = user.clinics ?? [];
    if (clinicIds.length === 0) {
      return null;
    }

    try {
      const clinic = await ctx.db.get(clinicIds[0] as Id<"clinics">);
      if (clinic && "tenantId" in clinic && "isActive" in clinic && clinic.tenantId === args.tenantId && clinic.isActive !== false) {
        return clinic;
      }
    } catch {
      // Invalid clinic ID
    }

    return null;
  },
});

/**
 * Set a user's default clinic (move it to the front of the clinics array)
 */
export const setUserDefaultClinic = mutation({
  args: {
    userId: v.id("users"),
    clinicId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error(`User with ID ${args.userId} not found`);
    }

    // Get current clinics array
    const currentClinics = user.clinics ?? [];

    // Check if clinic is in the user's list
    if (!currentClinics.includes(args.clinicId)) {
      throw new Error(`User is not assigned to clinic ${args.clinicId}`);
    }

    // Move the clinic to the front of the array (making it the default)
    const updatedClinics = [
      args.clinicId,
      ...currentClinics.filter((id) => id !== args.clinicId),
    ];

    // Update user
    await ctx.db.patch(args.userId, {
      clinics: updatedClinics,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Successfully set clinic ${args.clinicId} as default`,
      userId: user._id,
      clinicId: args.clinicId,
    };
  },
});

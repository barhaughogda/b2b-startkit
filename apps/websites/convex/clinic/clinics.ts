import { query, action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { verifyOwnerAccess } from "../utils/authorization";
import { Id } from "../_generated/dataModel";
import type { Doc } from "../_generated/dataModel";

/**
 * Get all clinics for a tenant with usage counts
 * Owner-only query for clinic management
 */
export const getClinics = query({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
  },
  handler: async (ctx, args): Promise<Array<Doc<"clinics"> & { usageCount: number }>> => {
    // Verify owner access
    const authResult = await verifyOwnerAccess(ctx, args.userEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Get all clinics for the tenant
    const clinics = await ctx.runQuery(api.clinics.getClinicsByTenant, {
      tenantId: args.tenantId,
    });

    // Get usage counts for each clinic
    const usageCounts = await ctx.runQuery(api.clinics.getClinicUsageCounts, {
      tenantId: args.tenantId,
    });

    // Add usage count to each clinic
    const clinicsWithUsage: Array<Doc<"clinics"> & { usageCount: number }> = clinics.map((clinic: Doc<"clinics">) => ({
      ...clinic,
      usageCount: usageCounts[clinic._id] || 0,
    }));

    return clinicsWithUsage;
  },
});

/**
 * Create a new clinic
 * Owner-only action for creating clinics
 */
export const createClinic = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    timezone: v.optional(v.string()), // IANA timezone (e.g., "America/New_York"). Defaults to tenant timezone if not set.
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    clinicId: Id<"clinics">;
    message: string;
  }> => {
    // Verify owner access via query (actions can't call verifyOwnerAccess directly)
    const authResult = await ctx.runQuery(api.utils.authorization.verifyOwnerAccessQuery, {
      userEmail: args.userEmail,
      tenantId: args.tenantId,
    });
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Check if clinic with same name already exists for this tenant
    const existingClinic = await ctx.runQuery(api.clinics.findClinicByName, {
      tenantId: args.tenantId,
      name: args.name.trim(),
    });

    if (existingClinic) {
      throw new Error("A clinic with this name already exists");
    }

    // Create clinic via mutation
    const now = Date.now();
    const clinicId = await ctx.runMutation(api.clinics.createClinic, {
      tenantId: args.tenantId,
      name: args.name.trim(),
      description: args.description?.trim(),
      addressLegacy: args.address, // Use legacy string field for string addresses
      timezone: args.timezone,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      clinicId,
      message: "Clinic created successfully",
    };
  },
});

/**
 * Update a clinic
 * Owner-only action for updating clinic name, description, timezone, and active status
 */
export const updateClinic = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    clinicId: v.id("clinics"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.union(v.string(), v.null())),
    timezone: v.optional(v.union(v.string(), v.null())), // IANA timezone (e.g., "America/New_York"). Set to null to use tenant default.
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    clinicId: Id<"clinics">;
    message: string;
  }> => {
    // Verify owner access via query (actions can't call verifyOwnerAccess directly)
    const authResult = await ctx.runQuery(api.utils.authorization.verifyOwnerAccessQuery, {
      userEmail: args.userEmail,
      tenantId: args.tenantId,
    });
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Get the clinic to update
    const clinic = await ctx.runQuery(api.clinics.getClinic, {
      clinicId: args.clinicId,
    });

    if (!clinic) {
      throw new Error("Clinic not found");
    }

    // Verify clinic belongs to the tenant
    if (clinic.tenantId !== args.tenantId) {
      throw new Error("Clinic does not belong to this tenant");
    }

    // If name is being updated, check for duplicates
    if (args.name && args.name.trim() !== clinic.name) {
      const existingClinic = await ctx.runQuery(api.clinics.findClinicByName, {
        tenantId: args.tenantId,
        name: args.name.trim(),
      });

      if (existingClinic && existingClinic._id !== args.clinicId) {
        throw new Error("A clinic with this name already exists");
      }
    }

    // Update clinic via mutation
    await ctx.runMutation(api.clinics.updateClinic, {
      clinicId: args.clinicId,
      name: args.name !== undefined ? args.name.trim() : undefined,
      description: args.description !== undefined ? args.description.trim() : undefined,
      addressLegacy: args.address, // Use legacy string field for string addresses
      timezone: args.timezone,
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      clinicId: args.clinicId,
      message: "Clinic updated successfully",
    };
  },
});

/**
 * Delete a clinic
 * Owner-only action that prevents deletion if clinic has users assigned
 */
export const deleteClinic = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    clinicId: v.id("clinics"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    clinicId: Id<"clinics">;
    message: string;
  }> => {
    // Verify owner access via query (actions can't call verifyOwnerAccess directly)
    const authResult = await ctx.runQuery(api.utils.authorization.verifyOwnerAccessQuery, {
      userEmail: args.userEmail,
      tenantId: args.tenantId,
    });
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Get the clinic to delete
    const clinic = await ctx.runQuery(api.clinics.getClinic, {
      clinicId: args.clinicId,
    });

    if (!clinic) {
      throw new Error("Clinic not found");
    }

    // Verify clinic belongs to the tenant
    if (clinic.tenantId !== args.tenantId) {
      throw new Error("Clinic does not belong to this tenant");
    }

    // Check if clinic has users assigned
    const usageCounts = await ctx.runQuery(api.clinics.getClinicUsageCounts, {
      tenantId: args.tenantId,
    });

    const usageCount = usageCounts[args.clinicId] || 0;
    if (usageCount > 0) {
      throw new Error(
        `Cannot delete clinic: ${usageCount} user(s) are currently assigned to this clinic`
      );
    }

    // Delete the clinic via mutation
    await ctx.runMutation(api.clinics.deleteClinic, {
      clinicId: args.clinicId,
    });

    return {
      success: true,
      clinicId: args.clinicId,
      message: "Clinic deleted successfully",
    };
  },
});

/**
 * Assign a user to a clinic
 * Owner-only action for assigning users to clinics
 */
export const assignUserToClinic = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    userId: v.id("users"),
    clinicId: v.id("clinics"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    userId: Id<"users">;
    clinicId: Id<"clinics">;
    message: string;
  }> => {
    // Verify owner access via query (actions can't call verifyOwnerAccess directly)
    const authResult = await ctx.runQuery(api.utils.authorization.verifyOwnerAccessQuery, {
      userEmail: args.userEmail,
      tenantId: args.tenantId,
    });
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Get the user to assign
    const user = await ctx.runQuery(api.users.getUserById, {
      userId: args.userId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user belongs to the same tenant
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to this tenant");
    }

    // Get the clinic to assign
    const clinic = await ctx.runQuery(api.clinics.getClinic, {
      clinicId: args.clinicId,
    });

    if (!clinic) {
      throw new Error("Clinic not found");
    }

    // Verify clinic belongs to the tenant
    if (clinic.tenantId !== args.tenantId) {
      throw new Error("Clinic does not belong to this tenant");
    }

    // Check if user is already assigned to this clinic
    const currentClinics = user.clinics ?? [];
    const clinicIdString = args.clinicId as string; // Convert to string for user.clinics array
    
    if (currentClinics.includes(clinicIdString)) {
      // User already assigned - return success (idempotent)
      return {
        success: true,
        userId: args.userId,
        clinicId: args.clinicId,
        message: "User already assigned to this clinic",
      };
    }

    // Store previous clinics state before mutation (for audit log)
    const previousClinics = [...currentClinics];

    // Assign user to clinic via mutation
    // Note: user.clinics array stores clinic IDs as strings
    await ctx.runMutation(api.clinics.assignUserToClinic, {
      userId: args.userId,
      clinicId: clinicIdString,
    });

    // Query fresh user state after mutation to get accurate clinics array
    // This ensures we capture the actual state after the mutation, accounting for any
    // concurrent modifications that may have occurred between the initial query and mutation
    const updatedUser = await ctx.runQuery(api.users.getUserById, {
      userId: args.userId,
    });

    if (!updatedUser) {
      throw new Error("User not found after clinic assignment");
    }

    // Use fresh state for audit log to ensure accuracy
    const newClinics = updatedUser.clinics ?? [];

    // Log the change via audit logging
    await ctx.runMutation(api.auditLogs.create, {
      tenantId: args.tenantId,
      userId: authResult.userId!,
      action: "user_clinic_assigned",
      resource: "users",
      resourceId: args.userId,
      details: {
        targetUserId: args.userId,
        targetUserEmail: user.email,
        clinicId: args.clinicId,
        clinicName: clinic.name,
        previousClinics: previousClinics,
        newClinics: newClinics,
      },
      ipAddress: undefined, // Will be set by API route if available
      userAgent: undefined, // Will be set by API route if available
      timestamp: Date.now(),
    });

    return {
      success: true,
      userId: args.userId,
      clinicId: args.clinicId,
      message: "User assigned to clinic successfully",
    };
  },
});

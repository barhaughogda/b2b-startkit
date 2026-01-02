import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { permissionTreeValidator } from "./validators";

/**
 * Create a custom role
 * 
 * This mutation creates a new custom role with the specified permissions.
 * Used for creating default roles during migration and for owner-created custom roles.
 * 
 * Note: Owner access validation should be done at the API route level (Task 6.2.1).
 * This mutation is a low-level function that assumes authorization has been checked.
 */
export const createCustomRole = mutation({
  args: {
    tenantId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    permissions: permissionTreeValidator,
    isTemplate: v.boolean(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const roleId = await ctx.db.insert("customRoles", {
      tenantId: args.tenantId,
      name: args.name,
      description: args.description,
      permissions: args.permissions,
      isTemplate: args.isTemplate,
      createdAt: args.createdAt ?? now,
      updatedAt: args.updatedAt ?? now,
    });

    return roleId;
  },
});

/**
 * Get custom role by ID
 */
export const getCustomRole = query({
  args: {
    roleId: v.id("customRoles"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roleId);
  },
});

/**
 * Update a custom role
 * 
 * This mutation updates an existing custom role's name, description, and/or template status.
 * Permissions can be updated separately via the permission editor (Task 5.3.1).
 * 
 * Note: Owner access validation should be done at the API route level (Task 6.2.2).
 * This mutation is a low-level function that assumes authorization has been checked.
 */
export const updateCustomRole = mutation({
  args: {
    roleId: v.id("customRoles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    const updates: {
      name?: string;
      description?: string;
      isTemplate?: boolean;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }
    if (args.isTemplate !== undefined) {
      updates.isTemplate = args.isTemplate;
    }

    await ctx.db.patch(args.roleId, updates);
    return args.roleId;
  },
});

/**
 * Get all custom roles for a tenant
 */
export const getCustomRolesByTenant = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customRoles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

/**
 * Get template roles (roles marked as templates)
 */
export const getTemplateRoles = query({
  args: {
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("customRoles")
      .withIndex("by_template", (q) => q.eq("isTemplate", true));

    if (args.tenantId) {
      // Filter by tenant if provided
      const allTemplates = await query.collect();
      return allTemplates.filter((role) => role.tenantId === args.tenantId);
    }

    return await query.collect();
  },
});

/**
 * Find a custom role by name and tenant
 * Useful for checking if a default role already exists during migration
 */
export const findCustomRoleByName = query({
  args: {
    tenantId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const roles = await ctx.db
      .query("customRoles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return roles.find((role) => role.name === args.name);
  },
});

/**
 * Get role usage counts (how many users have each role)
 * Returns a map of roleId -> user count for all roles in a tenant
 */
export const getRoleUsageCounts = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all users for this tenant
    const users = await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Count users per role
    const usageCounts: Record<string, number> = {};
    
    for (const user of users) {
      if (user.customRoleId) {
        const roleId = user.customRoleId;
        usageCounts[roleId] = (usageCounts[roleId] || 0) + 1;
      }
    }

    return usageCounts;
  },
});

/**
 * Update a custom role's permissions
 * 
 * This mutation updates an existing custom role's permissions.
 * Used when updating role permissions via the permission editor.
 * 
 * Note: Owner access validation should be done at the API route level.
 * This mutation is a low-level function that assumes authorization has been checked.
 */
export const updateCustomRolePermissions = mutation({
  args: {
    roleId: v.id("customRoles"),
    permissions: permissionTreeValidator,
  },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    await ctx.db.patch(args.roleId, {
      permissions: args.permissions,
      updatedAt: Date.now(),
    });

    return args.roleId;
  },
});

/**
 * Delete a custom role
 * 
 * This mutation deletes a custom role from the database.
 * 
 * Note: Owner access validation and usage checking should be done at the API route level.
 * This mutation is a low-level function that assumes authorization has been checked.
 */
export const deleteCustomRole = mutation({
  args: {
    roleId: v.id("customRoles"),
  },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    await ctx.db.delete(args.roleId);
    return args.roleId;
  },
});

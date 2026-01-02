import { query, action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { verifyOwnerAccess } from "../utils/authorization";
import { Id, Doc } from "../_generated/dataModel";
import { permissionTreeValidator } from "../validators";

/**
 * Get all custom roles for a tenant with usage counts
 * Owner-only query for role management
 */
export const getCustomRoles = query({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
  },
  handler: async (ctx, args) => {
    // Verify owner access
    const authResult = await verifyOwnerAccess(ctx, args.userEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Get all roles for the tenant
    const roles = await ctx.db
      .query("customRoles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Get usage counts for each role
    const users = await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const usageCounts: Record<string, number> = {};
    for (const user of users) {
      if (user.customRoleId) {
        const roleId = user.customRoleId;
        usageCounts[roleId] = (usageCounts[roleId] || 0) + 1;
      }
    }

    // Add usage count to each role
    const rolesWithUsage = roles.map((role) => ({
      ...role,
      usageCount: usageCounts[role._id] || 0,
    }));

    return rolesWithUsage;
  },
});

/**
 * Create a new custom role
 * Owner-only action for creating roles with permissions
 */
export const createCustomRole = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    name: v.string(),
    description: v.optional(v.string()),
    permissions: permissionTreeValidator,
    isTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    roleId: Id<"customRoles">;
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

    // Check if role with same name already exists for this tenant
    const existingRole = await ctx.runQuery(api.customRoles.findCustomRoleByName, {
      tenantId: args.tenantId,
      name: args.name.trim(),
    });

    if (existingRole) {
      throw new Error("A role with this name already exists");
    }

    // Create role via mutation
    const now = Date.now();
    const roleId = await ctx.runMutation(api.customRoles.createCustomRole, {
      tenantId: args.tenantId,
      name: args.name.trim(),
      description: args.description?.trim(),
      permissions: args.permissions,
      isTemplate: args.isTemplate ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      roleId,
      message: "Role created successfully",
    };
  },
});

/**
 * Update a custom role
 * Owner-only action for updating role name, description, permissions, and template status
 * 
 * When permissions are updated, logs permission changes for all affected users
 * and returns information about affected users.
 */
export const updateCustomRole = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    roleId: v.id("customRoles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    permissions: v.optional(permissionTreeValidator),
    isTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    roleId: Id<"customRoles">;
    message: string;
    affectedUsersCount?: number;
    affectedUserIds?: Id<"users">[];
  }> => {
    // Verify owner access via query (actions can't call verifyOwnerAccess directly)
    const authResult = await ctx.runQuery(api.utils.authorization.verifyOwnerAccessQuery, {
      userEmail: args.userEmail,
      tenantId: args.tenantId,
    });
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Get the role to update
    const role = await ctx.runQuery(api.customRoles.getCustomRole, {
      roleId: args.roleId,
    });

    if (!role) {
      throw new Error("Role not found");
    }

    // Verify role belongs to the tenant
    if (role.tenantId !== args.tenantId) {
      throw new Error("Role does not belong to this tenant");
    }

    // If name is being updated, check for duplicates
    if (args.name && args.name.trim() !== role.name) {
      const existingRole = await ctx.runQuery(api.customRoles.findCustomRoleByName, {
        tenantId: args.tenantId,
        name: args.name.trim(),
      });

      if (existingRole && existingRole._id !== args.roleId) {
        throw new Error("A role with this name already exists");
      }
    }

    // Get affected users BEFORE updating permissions (if permissions are being updated)
    let affectedUsers: Array<{ _id: Id<"users">; email: string }> = [];
    if (args.permissions !== undefined) {
      // Get all users assigned to this role
      const allUsers = await ctx.runQuery(api.users.getUsersByTenant, {
        tenantId: args.tenantId,
      });
      
      affectedUsers = allUsers
        .filter((u: Doc<"users">) => u.customRoleId === args.roleId)
        .map((u: Doc<"users">) => ({ _id: u._id, email: u.email }));
    }

    // Update role fields (name, description, isTemplate)
    if (args.name !== undefined || args.description !== undefined || args.isTemplate !== undefined) {
      await ctx.runMutation(api.customRoles.updateCustomRole, {
        roleId: args.roleId,
        name: args.name !== undefined ? args.name.trim() : undefined,
        description: args.description !== undefined ? args.description.trim() : undefined,
        isTemplate: args.isTemplate,
      });
    }

    // Update permissions separately if provided
    // Track whether permissions were actually updated (not just whether they were provided)
    let permissionsUpdated = false;
    if (args.permissions !== undefined) {
      // Store old permissions before updating (inside this block where we know permissions are being updated)
      const oldPermissions = role.permissions;
      
      // Update the role permissions
      await ctx.runMutation(api.customRoles.updateCustomRolePermissions, {
        roleId: args.roleId,
        permissions: args.permissions,
      });
      permissionsUpdated = true;

      // Log permission changes for each affected user
      // Each user gets a separate audit log entry for HIPAA compliance
      const changedByUserId = authResult.userId!;
      const timestamp = Date.now();

      for (const user of affectedUsers) {
        try {
          await ctx.runMutation(api.auditLogs.create, {
            tenantId: args.tenantId,
            userId: changedByUserId,
            action: "permission_changed",
            resource: "users",
            resourceId: user._id as string, // Convert Id to string for audit log
            details: {
              roleId: args.roleId,
              roleName: role.name,
              reason: "Role permissions updated",
            },
            ipAddress: undefined, // Will be set by API route if available
            userAgent: undefined, // Will be set by API route if available
            timestamp,
            permissionChanges: {
              userId: user._id,
              oldPermissions: oldPermissions,
              newPermissions: args.permissions,
              changedBy: changedByUserId,
            },
          });
        } catch (auditError) {
          // Log error but don't fail the update
          // In production, this should be logged to an error tracking service
          console.error(`Failed to log permission change for user ${user._id}:`, auditError);
        }
      }
    }

    return {
      success: true,
      roleId: args.roleId,
      message: permissionsUpdated && affectedUsers.length > 0
        ? `Role updated successfully. Permissions updated for ${affectedUsers.length} user(s).`
        : "Role updated successfully",
      ...(permissionsUpdated && {
        affectedUsersCount: affectedUsers.length,
        affectedUserIds: affectedUsers.map((u) => u._id),
      }),
    };
  },
});

/**
 * Delete a custom role
 * Owner-only action that prevents deletion if role is in use
 */
export const deleteCustomRole = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    roleId: v.id("customRoles"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    roleId: Id<"customRoles">;
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

    // Get the role to delete
    const role = await ctx.runQuery(api.customRoles.getCustomRole, {
      roleId: args.roleId,
    });

    if (!role) {
      throw new Error("Role not found");
    }

    // Verify role belongs to the tenant
    if (role.tenantId !== args.tenantId) {
      throw new Error("Role does not belong to this tenant");
    }

    // Check if role is in use
    const users = await ctx.runQuery(api.users.getUsersByTenant, {
      tenantId: args.tenantId,
    });

    const usersWithRole = users.filter((u: Doc<"users">) => u.customRoleId === args.roleId);
    if (usersWithRole.length > 0) {
      throw new Error(
        `Cannot delete role: ${usersWithRole.length} user(s) are currently assigned this role`
      );
    }

    // Delete the role
    await ctx.runMutation(api.customRoles.deleteCustomRole, {
      roleId: args.roleId,
    });

    return {
      success: true,
      roleId: args.roleId,
      message: "Role deleted successfully",
    };
  },
});


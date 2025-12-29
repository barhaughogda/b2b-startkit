import { query, action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { verifyOwnerAccess } from "../utils/authorization";
import { Id, Doc } from "../_generated/dataModel";

/**
 * Get clinic users with pagination, filtering, and search
 * Owner-only function for user management
 * 
 * Performance Note: This query collects all clinic users for a tenant into memory before filtering.
 * This approach is acceptable because:
 * - Tenants typically have < 1000 users
 * - Search functionality requires full-text matching across name, email
 * - Convex doesn't support full-text search indexes natively
 * 
 * For tenants with > 5000 users, consider:
 * - Adding composite indexes for role/status filtering
 * - Implementing server-side search with external search service (e.g., Algolia)
 * - Using Convex search functionality when available
 */
export const getClinicUsers = query({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    search: v.optional(v.string()),
    isOwner: v.optional(v.boolean()), // Filter by owner status
  },
  handler: async (ctx, args) => {
    // Verify owner access
    const authResult = await verifyOwnerAccess(ctx, args.userEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    const page = args.page || 1;
    const limit = args.limit || 10;
    const skip = (page - 1) * limit;

    // Start with all clinic users for the tenant
    let usersQuery = ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId));

    // Collect all users first (we'll filter in memory for search)
    let users = await usersQuery.collect();

    // Filter to only clinic_user role (with backward compatibility for admin/provider)
    users = users.filter(
      (u) =>
        (u.role === "clinic_user" ||
          u.role === "admin" ||
          u.role === "provider") &&
        u.isActive !== false
    );

    // Apply status filter
    if (args.status) {
      const isActive = args.status === "active";
      users = users.filter((u) => u.isActive === isActive);
    }

    // Apply owner filter
    if (args.isOwner !== undefined) {
      users = users.filter((u) => (u.isOwner ?? false) === args.isOwner);
    }

    // Apply search filter (name, email)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
      );
    }

    // Calculate pagination
    const total = users.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedUsers = users.slice(skip, skip + limit);

    // Check invitation status for each user
    // A user is considered "invited" if they have a pending invitation (not yet accepted)
    // Users with accepted invitations are already registered, so they should not be marked as "invited"
    const pendingInvitations = await ctx.db
      .query("invitations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Create a set of emails that have pending invitations
    // We match by email since pending invitations don't have acceptedBy yet
    const invitedEmails = new Set(
      pendingInvitations.map((inv) => inv.email.toLowerCase())
    );

    // Fetch custom role names for users who have customRoleId
    const customRoleIds = paginatedUsers
      .map((u) => u.customRoleId)
      .filter((id): id is Id<"customRoles"> => id !== undefined);
    
    const customRolesMap = new Map<Id<"customRoles">, { name: string; description?: string }>();
    for (const roleId of customRoleIds) {
      try {
        const role = await ctx.db.get(roleId);
        if (role) {
          customRolesMap.set(roleId, {
            name: role.name,
            description: role.description,
          });
        }
      } catch (error) {
        // If role not found, skip it silently
        // Error logging handled by audit logger if needed
      }
    }

    // Remove passwordHash from user objects and sanitize sensitive data
    const sanitizedUsers = paginatedUsers.map(({ passwordHash, ...user }) => {
      const customRole = user.customRoleId ? customRolesMap.get(user.customRoleId) : undefined;
      return {
        ...user,
        // Ensure optional fields have defaults
        isOwner: user.isOwner ?? false,
        clinics: user.clinics ?? [],
        // Mark as invited if their email has a pending invitation
        isInvited: invitedEmails.has(user.email.toLowerCase()),
        // Include custom role name if available
        customRoleName: customRole?.name,
        customRoleDescription: customRole?.description,
      };
    });

    return {
      users: sanitizedUsers,
      total,
      page,
      limit,
      totalPages,
    };
  },
});

/**
 * Create a new clinic user
 * Owner-only action for creating users with custom roles and clinics
 */
export const createClinicUser = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    email: v.string(),
    name: v.string(),
    password: v.string(),
    isOwner: v.optional(v.boolean()),
    clinicIds: v.optional(v.array(v.string())), // Array of clinic IDs
    customRoleId: v.optional(v.id("customRoles")), // Optional custom role ID
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    userId?: Id<"users">;
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

    // Check if user already exists
    const existingUser = await ctx.runQuery(api.users.getUserByEmail, {
      email: args.email,
      tenantId: args.tenantId,
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // If custom role is provided, verify it exists and belongs to the tenant
    if (args.customRoleId) {
      const customRole = await ctx.runQuery(api.customRoles.getCustomRole, {
        roleId: args.customRoleId,
      });

      if (!customRole) {
        throw new Error("Custom role not found");
      }

      if (customRole.tenantId !== args.tenantId) {
        throw new Error("Custom role does not belong to this tenant");
      }
    }

    // If clinics are provided, verify they exist and belong to the tenant
    // Note: clinicIds are stored as strings in user.clinics array
    // but we need to convert them to Convex IDs for the query
    if (args.clinicIds && args.clinicIds.length > 0) {
      for (const clinicIdString of args.clinicIds) {
        // Convert string ID to Convex ID
        const clinicId = clinicIdString as Id<"clinics">;
        const clinic = await ctx.runQuery(api.clinics.getClinic, {
          clinicId: clinicId,
        });

        if (!clinic) {
          throw new Error(`Clinic ${clinicIdString} not found`);
        }

        if (clinic.tenantId !== args.tenantId) {
          throw new Error(
            `Clinic ${clinicIdString} does not belong to this tenant`
          );
        }
      }
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(args.password, 10);

    const now = Date.now();

    // Create user with clinic_user role
    // Note: Using type assertion because clinics field exists in schema but TypeScript types may be stale
    const userId = await ctx.runMutation(api.users.createUserMutation, {
      email: args.email.trim(),
      name: args.name.trim(),
      role: "clinic_user",
      passwordHash,
      isActive: true,
      tenantId: args.tenantId,
      isOwner: args.isOwner ?? false,
      clinics: args.clinicIds ?? [],
      customRoleId: args.customRoleId,
      createdAt: now,
      updatedAt: now,
    } as any);

    return {
      success: true,
      userId,
      message: "User created successfully",
    };
  },
});

/**
 * Update a clinic user
 * Owner-only action for updating user details, permissions, and status
 */
export const updateClinicUser = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    isOwner: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    clinicIds: v.optional(v.array(v.string())), // Array of clinic IDs
    customRoleId: v.optional(v.id("customRoles")), // Optional custom role ID
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    userId: Id<"users">;
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

    // Get the user to update
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

    // If email is being updated, check for duplicates
    if (args.email && args.email !== user.email) {
      const existingUser = await ctx.runQuery(api.users.getUserByEmail, {
        email: args.email,
        tenantId: args.tenantId,
      });

      if (existingUser && existingUser._id !== args.userId) {
        throw new Error("Email already exists");
      }
    }

    // If custom role is provided, verify it exists and belongs to the tenant
    if (args.customRoleId) {
      const customRole = await ctx.runQuery(api.customRoles.getCustomRole, {
        roleId: args.customRoleId,
      });

      if (!customRole) {
        throw new Error("Custom role not found");
      }

      if (customRole.tenantId !== args.tenantId) {
        throw new Error("Custom role does not belong to this tenant");
      }
    }

    // If clinics are provided, verify they exist and belong to the tenant
    if (args.clinicIds && args.clinicIds.length > 0) {
      for (const clinicIdString of args.clinicIds) {
        // Convert string ID to Convex ID
        const clinicId = clinicIdString as Id<"clinics">;
        const clinic = await ctx.runQuery(api.clinics.getClinic, {
          clinicId: clinicId,
        });

        if (!clinic) {
          throw new Error(`Clinic ${clinicIdString} not found`);
        }

        if (clinic.tenantId !== args.tenantId) {
          throw new Error(
            `Clinic ${clinicIdString} does not belong to this tenant`
          );
        }
      }
    }

    // Prepare update data
    const updateData: {
      name?: string;
      email?: string;
      passwordHash?: string;
      isOwner?: boolean;
      isActive?: boolean;
      clinics?: string[];
      customRoleId?: Id<"customRoles">;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    // Add fields that are provided
    if (args.name !== undefined) {
      updateData.name = args.name.trim();
    }
    if (args.email !== undefined) {
      updateData.email = args.email.trim();
    }
    if (args.password !== undefined) {
      // Hash new password
      const bcrypt = require("bcryptjs");
      updateData.passwordHash = await bcrypt.hash(args.password, 10);
    }
    if (args.isOwner !== undefined) {
      updateData.isOwner = args.isOwner;
    }
    if (args.isActive !== undefined) {
      updateData.isActive = args.isActive;
    }
    if (args.clinicIds !== undefined) {
      updateData.clinics = args.clinicIds;
    }
    if (args.customRoleId !== undefined) {
      updateData.customRoleId = args.customRoleId;
    }

    // Update user via mutation
    await ctx.runMutation(api.users.updateUserMutation, {
      id: args.userId,
      ...updateData,
    });

    return {
      success: true,
      userId: args.userId,
      message: "User updated successfully",
    };
  },
});

/**
 * Deactivate a clinic user (soft delete)
 * Owner-only action that sets isActive = false
 * Prevents deactivating the last owner
 */
export const deactivateClinicUser = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    userId: Id<"users">;
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

    // Get the user to deactivate
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

    // If user is an owner, check if they're the last owner
    if (user.isOwner) {
      // Get all active owners for this tenant
      const allUsers = await ctx.runQuery(api.users.getUsersByTenant, {
        tenantId: args.tenantId,
      });

      const activeOwners = allUsers.filter(
        (u: Doc<"users">) => u.isOwner && u.isActive !== false && u._id !== args.userId
      );

      if (activeOwners.length === 0) {
        throw new Error(
          "Cannot deactivate the last owner. At least one owner must remain active."
        );
      }
    }

    // Deactivate user (soft delete)
    await ctx.runMutation(api.users.updateUserMutation, {
      id: args.userId,
      isActive: false,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      userId: args.userId,
      message: "User deactivated successfully",
    };
  },
});

/**
 * Assign a custom role to a user
 * Owner-only action for assigning roles to users
 * 
 * This function assigns a custom role to a user, updating their permissions.
 * It also logs the permission change to the audit log.
 * 
 * @param tenantId - Tenant ID
 * @param userEmail - Email of the requesting user (for authorization)
 * @param targetUserId - ID of the user to assign the role to
 * @param customRoleId - ID of the custom role to assign (null to remove role)
 * @returns Success message with user ID
 */
export const assignRoleToUser = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    targetUserId: v.id("users"), // ID of the user to assign the role to
    customRoleId: v.union(v.id("customRoles"), v.null()), // ID of custom role to assign, or null to remove
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    userId: Id<"users">;
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

    // Get the target user
    const targetUser = await ctx.runQuery(api.users.getUserById, {
      userId: args.targetUserId,
    });

    if (!targetUser) {
      throw new Error("User not found");
    }

    // Verify target user belongs to the same tenant
    if (targetUser.tenantId !== args.tenantId) {
      throw new Error("User does not belong to this tenant");
    }

    // If assigning a custom role, verify it exists and belongs to the tenant
    if (args.customRoleId !== null) {
      const customRole = await ctx.runQuery(api.customRoles.getCustomRole, {
        roleId: args.customRoleId,
      });

      if (!customRole) {
        throw new Error("Custom role not found");
      }

      if (customRole.tenantId !== args.tenantId) {
        throw new Error("Custom role does not belong to this tenant");
      }
    }

    // Get old permissions for audit log
    let oldPermissions: any = null;
    let oldCustomRoleId: Id<"customRoles"> | null = null;
    if (targetUser.customRoleId) {
      try {
        const oldCustomRole = await ctx.runQuery(api.customRoles.getCustomRole, {
          roleId: targetUser.customRoleId,
        });
        if (oldCustomRole) {
          oldPermissions = oldCustomRole.permissions;
          oldCustomRoleId = oldCustomRole._id;
        }
      } catch (error) {
        // If old custom role not found, continue without old permissions
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Could not fetch old permissions for custom role ${targetUser.customRoleId}:`, error);
        }
      }
    }

    // Get new permissions for audit log
    let newPermissions: any = null;
    let newCustomRoleId: Id<"customRoles"> | null = null;
    if (args.customRoleId !== null) {
      const newCustomRole = await ctx.runQuery(api.customRoles.getCustomRole, {
        roleId: args.customRoleId,
      });
      if (newCustomRole) {
        newPermissions = newCustomRole.permissions;
        newCustomRoleId = newCustomRole._id;
      }
    }

    // Update user's custom role assignment
    // Pass null directly to clear the field, or an ID to set it
    // updateUserMutation now accepts v.union(v.id("customRoles"), v.null()) for customRoleId
    await ctx.runMutation(api.users.updateUserMutation, {
      id: args.targetUserId,
      customRoleId: args.customRoleId, // null to clear, or ID to set
      updatedAt: Date.now(),
    });

    // Create audit log entry for permission change
    // Note: permissionChanges requires PermissionTree format (not null).
    // We'll log permission changes in details for easier querying, and use
    // permissionChanges field only when we have valid permission trees.
    const auditLogDetails: any = {
      targetUserId: args.targetUserId,
      targetUserEmail: targetUser.email,
      oldCustomRoleId: oldCustomRoleId,
      newCustomRoleId: newCustomRoleId,
    };

    // Log permission changes in details (for easier querying)
    // This allows us to log even when permissions are null
    if (oldPermissions !== null && oldPermissions !== undefined) {
      auditLogDetails.oldPermissions = oldPermissions;
    }
    if (newPermissions !== null && newPermissions !== undefined) {
      auditLogDetails.newPermissions = newPermissions;
    }

    // Create audit log with permissionChanges if we have valid permission trees
    // Note: permissionChanges requires PermissionTree format (validated by permissionTreeValidator),
    // so we only include it when we have actual permission tree objects (not null/undefined).
    // When a user has no role, permissions will be null, so we skip permissionChanges in that case.
    const permissionChanges = (oldPermissions !== null && oldPermissions !== undefined && 
                               newPermissions !== null && newPermissions !== undefined) ? {
      userId: args.targetUserId,
      oldPermissions: oldPermissions, // Valid PermissionTree
      newPermissions: newPermissions, // Valid PermissionTree
      changedBy: authResult.userId!,
    } : undefined;

    await ctx.runMutation(api.auditLogs.create, {
      tenantId: args.tenantId,
      userId: authResult.userId!,
      action: "role_assigned",
      resource: "users",
      resourceId: args.targetUserId,
      details: auditLogDetails,
      ipAddress: undefined, // Will be set by API route if available
      userAgent: undefined, // Will be set by API route if available
      timestamp: Date.now(),
      permissionChanges: permissionChanges,
    });

    return {
      success: true,
      userId: args.targetUserId,
      message: args.customRoleId
        ? "Role assigned successfully"
        : "Role removed successfully",
    };
  },
});


import { query, action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { verifyOwnerAccess, checkPermission as checkPermissionUtil } from "../utils/authorization";
import { Id } from "../_generated/dataModel";
import type { PermissionTree } from "../../src/types";

// Use the centralized verifyOwnerAccessQuery from utils/authorization instead
// This local query is kept for backward compatibility but should use api.utils.authorization.verifyOwnerAccessQuery

/**
 * Generate a full-access permission tree for owners
 * Returns a complete hierarchical permission structure with all permissions enabled
 * and viewScope set to 'all_clinic' for applicable sections.
 * 
 * This is used when returning permissions for owners, who have full access to all features.
 * 
 * @returns Full-access PermissionTree with all sections enabled
 */
function getFullAccessPermissionTree(): PermissionTree {
  return {
    patients: {
      enabled: true,
      viewScope: 'all_clinic',
      features: {
        list: { enabled: true },
        create: true,
        edit: true,
        delete: true,
        view: true,
      },
    },
    appointments: {
      enabled: true,
      viewScope: 'all_clinic',
      features: {
        calendar: true,
        schedule: true,
        create: true,
        edit: true,
        cancel: true,
        view: true,
      },
    },
    messages: {
      enabled: true,
      viewScope: 'all_clinic',
      features: {
        send: true,
        receive: true,
        view: true,
        delete: true,
      },
    },
    medical_records: {
      enabled: true,
      viewScope: 'all_clinic',
      features: {
        encounters: {
          enabled: true,
          create: true,
          edit: true,
          view: true,
          sign: true,
        },
        notes: {
          enabled: true,
          create: true,
          edit: true,
          view: true,
        },
        vitals: true,
        lab_results: true,
        medications: true,
        allergies: true,
      },
    },
    billing: {
      enabled: true,
      viewScope: 'all_clinic',
      features: {
        claims: {
          enabled: true,
          create: true,
          edit: true,
          submit: true,
          view: true,
        },
        payments: {
          enabled: true,
          process: true,
          view: true,
          refund: true,
        },
        invoices: {
          enabled: true,
          create: true,
          edit: true,
          view: true,
        },
        reports: true,
      },
    },
    settings: {
      enabled: true,
      features: {
        users: {
          enabled: true,
          create: true,
          edit: true,
          delete: true,
          view: true,
          invite: true,
        },
        roles: {
          enabled: true,
          create: true,
          edit: true,
          delete: true,
          view: true,
        },
        departments: {
          enabled: true,
          create: true,
          edit: true,
          delete: true,
          view: true,
        },
        practice: {
          enabled: true,
          edit: true,
          view: true,
        },
        branding: {
          enabled: true,
          edit: true,
          view: true,
        },
        security: {
          enabled: true,
          mfa: true,
          password_policy: true,
          session_management: true,
        },
      },
    },
    reports: {
      enabled: true,
      viewScope: 'all_clinic',
      features: {
        clinical: true,
        financial: true,
        custom: true,
        export: true,
      },
    },
    ai_assistant: {
      enabled: true,
      features: {
        voice_commands: true,
        chat: true,
        automation: true,
      },
    },
  } as PermissionTree; // Type assertion: departments exists in validator but TypeScript types may be stale
}

/**
 * Merge role permissions with user-level permissions
 * Currently, the system only uses role permissions, but this function provides
 * a structure for merging if user-level permissions are added in the future.
 * 
 * @param rolePermissions - Permissions from the user's assigned custom role
 * @param userPermissions - User-level permissions (currently not used, but structure supports it)
 * @returns Merged permission tree
 */
function mergePermissions(
  rolePermissions: PermissionTree | null,
  userPermissions: PermissionTree | null
): PermissionTree | null {
  // Currently, only role permissions are used
  // If user-level permissions exist in the future, they would be merged here
  // User-level permissions would typically override role permissions for specific features
  
  if (!rolePermissions && !userPermissions) {
    return null;
  }
  
  if (!rolePermissions) {
    return userPermissions;
  }
  
  if (!userPermissions) {
    return rolePermissions;
  }
  
  // If both exist, merge them (user permissions override role permissions)
  // This is a placeholder for future functionality
  // For now, we return role permissions as the primary source
  return rolePermissions;
}

/**
 * Get user's effective permissions
 * 
 * This query retrieves and returns a user's effective permissions by:
 * 1. Merging permissions from their assigned custom role with any user-level permissions
 * 2. Applying owner override (owners get full access)
 * 3. Returning the complete hierarchical permission tree structure
 * 
 * The query is automatically cached by Convex for performance, making it ideal
 * for frequent permission checks in UI components.
 * 
 * Owner-only function for viewing user permissions (requires owner authorization).
 * 
 * @param tenantId - Tenant ID
 * @param userEmail - Email of the requesting user (for authorization - must be owner)
 * @param targetUserId - ID of the user whose permissions to retrieve
 * @returns User's effective permissions with complete hierarchical structure
 * 
 * @example
 * ```typescript
 * // In a React component (via API route)
 * const response = await fetch(`/api/clinic/permissions?userId=${userId}`);
 * const { data } = await response.json();
 * 
 * // data.permissions contains the full PermissionTree
 * // data.isOwner indicates if user is an owner (full access)
 * // data.effectivePermissions indicates the source: "full_access", "custom", or "no_access"
 * ```
 */
export const getUserPermissions = query({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    targetUserId: v.id("users"), // ID of the user whose permissions to retrieve
  },
  handler: async (ctx, args) => {
    // Verify owner access
    const authResult = await verifyOwnerAccess(ctx, args.userEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Get target user
    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Verify target user belongs to the same tenant
    if (targetUser.tenantId !== args.tenantId) {
      throw new Error("User does not belong to this tenant");
    }

    // Owner override: owners have full access
    // Return full hierarchical permission tree structure for owners
    if (targetUser.isOwner) {
      const fullAccessPermissions = getFullAccessPermissionTree();
      return {
        userId: targetUser._id,
        isOwner: true,
        hasCustomRole: false,
        customRoleId: null,
        customRoleName: null,
        permissions: fullAccessPermissions, // Full hierarchical structure
        effectivePermissions: "full_access", // Indicates owner has full access
      };
    }

    // Get permissions from custom role if user has one
    let rolePermissions: PermissionTree | null = null;
    let customRoleId: Id<"customRoles"> | null = null;
    let customRoleName: string | null = null;

    if (targetUser.customRoleId) {
      try {
        const customRole = await ctx.db.get(targetUser.customRoleId);
        if (customRole) {
          rolePermissions = customRole.permissions as PermissionTree;
          customRoleId = customRole._id;
          customRoleName = customRole.name;
        }
      } catch (error) {
        // If custom role not found or error, permissions will remain null
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Could not fetch permissions for custom role ${targetUser.customRoleId}:`, error);
        }
      }
    }

    // Merge role permissions with user-level permissions
    // Currently, user-level permissions are not used, but the structure supports merging
    const userPermissions: PermissionTree | null = null; // Placeholder for future user-level permissions
    const mergedPermissions = mergePermissions(rolePermissions, userPermissions);

    return {
      userId: targetUser._id,
      isOwner: false,
      hasCustomRole: customRoleId !== null,
      customRoleId,
      customRoleName,
      permissions: mergedPermissions, // Merged hierarchical structure (currently just role permissions)
      effectivePermissions: mergedPermissions ? "custom" : "no_access", // Indicates permission source
    };
  },
});

/**
 * Check if a user has a specific permission in the hierarchical permission tree.
 * 
 * This is a query version of the checkPermission function, optimized for client-side calls.
 * Queries are automatically cached by Convex for performance, making this ideal for
 * frequent permission checks in UI components.
 * 
 * Navigates the permission tree structure: section > feature > component > card > tab
 * Returns detailed result including view scope information.
 * 
 * Owners always have full access (returns hasPermission: true for any permission check).
 * 
 * @param userEmail - Email of the authenticated user (from NextAuth session)
 * @param path - The permission path to check (e.g., "patients.features.create" or "patients.features.list.components.patientCard.tabs.overview")
 * @returns Detailed permission check result with error information if denied, and view scope if applicable
 * 
 * @example
 * ```typescript
 * // In a React component
 * const { data: permissionResult } = useQuery(api.clinic.permissions.checkPermission, {
 *   userEmail: session?.user?.email,
 *   path: 'patients.features.create'
 * });
 * 
 * if (permissionResult?.hasPermission) {
 *   // User has access, also check viewScope if needed
 *   const viewScope = permissionResult.viewScope; // e.g., "department", "all_clinic"
 * }
 * ```
 */
export const checkPermission = query({
  args: {
    userEmail: v.union(v.string(), v.null()), // Can be null for unauthenticated users
    path: v.string(), // Permission path to check
  },
  handler: async (ctx, args) => {
    // Use the existing checkPermission utility function
    // This reuses the logic from authorization.ts while making it available as a query
    const result = await checkPermissionUtil(ctx, args.userEmail || undefined, args.path);
    
    // Return the result (queries are automatically cached by Convex)
    return result;
  },
});

/**
 * Update user's permissions by assigning a custom role
 * Owner-only function for updating user permissions.
 * 
 * Note: This function assigns a custom role to the user. To update the permissions
 * of a custom role itself, use the roles API endpoints.
 * 
 * @param tenantId - Tenant ID
 * @param userEmail - Email of the requesting user (for authorization)
 * @param targetUserId - ID of the user whose permissions to update
 * @param customRoleId - ID of the custom role to assign (null to remove role)
 * @returns Success message
 */
export const updateUserPermissions = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
    targetUserId: v.id("users"), // ID of the user whose permissions to update
    customRoleId: v.union(v.id("customRoles"), v.null()), // ID of custom role to assign, or null to remove
  },
  handler: async (ctx, args) => {
    // Verify owner access via wrapper query (actions can't directly access db)
    const ownerAuthResult = await ctx.runQuery(api.utils.authorization.verifyOwnerAccessQuery, {
      userEmail: args.userEmail,
      tenantId: args.tenantId,
    });
    if (!ownerAuthResult.authorized) {
      throw new Error(ownerAuthResult.error || "Unauthorized");
    }

    // Get target user
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

    // Prevent removing role from owner (owners don't need roles, but we should be explicit)
    if (targetUser.isOwner && args.customRoleId === null) {
      // This is fine - owners don't need roles, but we'll still update the field
      // to keep data consistent
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
    let oldPermissions: PermissionTree | null = null;
    let oldCustomRoleId: Id<"customRoles"> | null = null;
    if (targetUser.customRoleId) {
      try {
        const oldCustomRole = await ctx.runQuery(api.customRoles.getCustomRole, {
          roleId: targetUser.customRoleId,
        });
        if (oldCustomRole) {
          oldPermissions = oldCustomRole.permissions as PermissionTree;
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
    let newPermissions: PermissionTree | null = null;
    let newCustomRoleId: Id<"customRoles"> | null = null;
    if (args.customRoleId !== null) {
      const newCustomRole = await ctx.runQuery(api.customRoles.getCustomRole, {
        roleId: args.customRoleId,
      });
      if (newCustomRole) {
        newPermissions = newCustomRole.permissions as PermissionTree;
        newCustomRoleId = newCustomRole._id;
      }
    }

    // Update user's custom role assignment
    // Pass null directly to clear the field, or an ID to set it
    // updateUserMutation now accepts v.union(v.id("customRoles"), v.null()) for customRoleId
    await ctx.runMutation(api.users.updateUserMutation, {
      id: args.targetUserId,
      customRoleId: args.customRoleId, // null to clear, or ID to set
    });

    // Create audit log entry for permission change
    await ctx.runMutation(api.auditLogs.create, {
      tenantId: args.tenantId,
      userId: ownerAuthResult.userId!,
      action: "permission_changed",
      resource: "users",
      resourceId: args.targetUserId,
      details: {
        targetUserId: args.targetUserId,
        targetUserEmail: targetUser.email,
        oldCustomRoleId: oldCustomRoleId,
        newCustomRoleId: newCustomRoleId,
        oldPermissions: oldPermissions,
        newPermissions: newPermissions,
      },
      ipAddress: undefined, // Will be set by API route
      userAgent: undefined, // Will be set by API route
      timestamp: Date.now(),
    });

    return {
      success: true,
      userId: args.targetUserId,
      message: args.customRoleId
        ? "User permissions updated successfully"
        : "User permissions removed successfully",
    };
  },
});


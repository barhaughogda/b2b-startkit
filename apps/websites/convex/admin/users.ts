import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Get all users with pagination, filtering, and search
 * Admin-only function for user management
 * 
 * Performance Note: This query collects all users for a tenant into memory before filtering.
 * This approach is acceptable because:
 * - Tenants typically have < 1000 users
 * - Search functionality requires full-text matching across name, email, and role
 * - Convex doesn't support full-text search indexes natively
 * 
 * For tenants with > 5000 users, consider:
 * - Adding composite indexes for role/status filtering
 * - Implementing server-side search with external search service (e.g., Algolia)
 * - Using Convex search functionality when available
 */
export const getUsers = query({
  args: {
    tenantId: v.string(),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    role: v.optional(v.union(
      v.literal("admin"),
      v.literal("provider"),
      v.literal("demo"),
      v.literal("patient"),
      v.literal("super_admin")
      // Note: super_admin is included for completeness, but tenant admins won't see
      // superadmin users because superadmins don't belong to tenants (tenantId is null/undefined).
      // The by_tenant index query will naturally exclude superadmin users.
    )),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = args.page || 1;
    const limit = args.limit || 10;
    const skip = (page - 1) * limit;

    // Start with all users for the tenant
    let usersQuery = ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId));

    // Collect all users first (we'll filter in memory for search)
    // See performance note above for rationale
    let users = await usersQuery.collect();

    // Apply role filter
    if (args.role) {
      users = users.filter((u) => u.role === args.role);
    }

    // Apply status filter
    if (args.status) {
      const isActive = args.status === "active";
      users = users.filter((u) => u.isActive === isActive);
    }

    // Apply search filter (name, email, or role)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.role.toLowerCase().includes(searchLower)
      );
    }

    // Calculate pagination
    const total = users.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedUsers = users.slice(skip, skip + limit);

    // Remove passwordHash from user objects
    const sanitizedUsers = paginatedUsers.map(({ passwordHash, ...user }) => user);

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
 * Create a new user (admin action)
 * This will be called via action from API route
 */
export const createUserMutation = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("provider"),
      v.literal("demo"),
      v.literal("patient"),
      v.literal("super_admin")
    ),
    passwordHash: v.string(),
    isActive: v.boolean(),
    tenantId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});

/**
 * Update user (admin mutation)
 */
export const updateUserMutation = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("provider"),
        v.literal("demo"),
        v.literal("patient"),
        v.literal("super_admin")
      )
    ),
    isActive: v.optional(v.boolean()),
    tenantId: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Type-safe patch data - only include fields that are actually provided
    const patchData: {
      name?: string;
      email?: string;
      role?: "admin" | "provider" | "demo" | "patient" | "super_admin";
      isActive?: boolean;
      tenantId?: string;
      passwordHash?: string;
      updatedAt: number;
    } = {
      ...updates,
      updatedAt: Date.now(),
    };

    return await ctx.db.patch(id, patchData);
  },
});

/**
 * Soft delete user (set isActive = false)
 */
export const deleteUserMutation = mutation({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Soft delete: set isActive to false
    return await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get user by ID (for validation)
 */
export const getUserById = query({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * List all users across all tenants with pagination, filtering, and search
 * Superadmin-only function for cross-tenant user management
 * 
 * Performance Note: This query collects all users into memory before filtering.
 * This approach is acceptable because:
 * - Platform typically has < 10,000 users across all tenants
 * - Search functionality requires full-text matching across name, email, and role
 * - Convex doesn't support full-text search indexes natively
 * 
 * For platforms with > 50,000 users, consider:
 * - Adding composite indexes for role/status filtering
 * - Implementing server-side search with external search service (e.g., Algolia)
 * - Using Convex search functionality when available
 */
export const listUsersForSuperadmin = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    role: v.optional(v.union(
      v.literal("admin"),
      v.literal("provider"),
      v.literal("demo"),
      v.literal("patient"),
      v.literal("super_admin")
    )),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    tenantId: v.optional(v.string()),
    search: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal("name"),
      v.literal("email"),
      v.literal("role"),
      v.literal("createdAt"),
      v.literal("lastLogin")
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const page = args.page || 1;
    const limit = args.limit || 20;
    const skip = (page - 1) * limit;

    // Get all users (no tenant filter for superadmin)
    let users = await ctx.db.query("users").collect();

    // Apply tenant filter if provided
    if (args.tenantId) {
      users = users.filter((u) => u.tenantId === args.tenantId);
    }

    // Apply role filter
    if (args.role) {
      users = users.filter((u) => u.role === args.role);
    }

    // Apply status filter
    if (args.status) {
      const isActive = args.status === "active";
      users = users.filter((u) => u.isActive === isActive);
    }

    // Apply search filter (name, email, or role)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.role.toLowerCase().includes(searchLower) ||
          (u.firstName && u.firstName.toLowerCase().includes(searchLower)) ||
          (u.lastName && u.lastName.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    const sortBy = args.sortBy || "createdAt";
    const sortOrder = args.sortOrder || "desc";
    users.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case "name":
          aValue = a.name || "";
          bValue = b.name || "";
          break;
        case "email":
          aValue = a.email || "";
          bValue = b.email || "";
          break;
        case "role":
          aValue = a.role || "";
          bValue = b.role || "";
          break;
        case "createdAt":
          aValue = a.createdAt || 0;
          bValue = b.createdAt || 0;
          break;
        case "lastLogin":
          aValue = a.lastLogin || 0;
          bValue = b.lastLogin || 0;
          break;
        default:
          aValue = a.createdAt || 0;
          bValue = b.createdAt || 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Calculate pagination
    const total = users.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedUsers = users.slice(skip, skip + limit);

    // Get tenant information for each user
    const usersWithTenants = await Promise.all(
      paginatedUsers.map(async (user) => {
        let tenantInfo = null;
        if (user.tenantId) {
          const tenantId = user.tenantId; // Type narrowing for TypeScript
          const tenant = await ctx.db
            .query("tenants")
            .withIndex("by_tenant_id", (q) => q.eq("id", tenantId))
            .first();
          if (tenant) {
            tenantInfo = {
              id: tenant.id,
              name: tenant.name,
              type: tenant.type,
            };
          }
        }

        // Remove passwordHash from user object
        const { passwordHash, ...userWithoutPassword } = user;

        return {
          ...userWithoutPassword,
          tenant: tenantInfo,
        };
      })
    );

    return {
      users: usersWithTenants,
      total,
      page,
      limit,
      totalPages,
    };
  },
});


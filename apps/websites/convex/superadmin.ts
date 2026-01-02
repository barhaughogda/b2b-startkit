import { query } from "./_generated/server";
import { v } from "convex/values";

// Get platform-wide statistics (superadmin only - no tenant filtering)
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000); // For active sessions
    
    // Get tenants with reasonable limit to prevent performance issues
    // For statistics, we need all tenants, but limit to prevent timeouts
    // In production with 10k+ tenants, consider using aggregation queries
    // Note: Ordering not needed for statistics - we're just counting
    const MAX_TENANTS_FOR_STATS = 10000;
    const allTenants = (await ctx.db.query("tenants").collect()).slice(0, MAX_TENANTS_FOR_STATS);
    
    // Get users with reasonable limit to prevent performance issues
    // Note: Ordering not needed for statistics - we're just counting
    const MAX_USERS_FOR_STATS = 50000;
    const allUsers = (await ctx.db.query("users").collect()).slice(0, MAX_USERS_FOR_STATS);
    
    // Calculate tenant statistics
    const activeTenants = allTenants.filter(t => t.status === "active");
    const newTenantsThisMonth = allTenants.filter(t => t.createdAt >= oneMonthAgo);
    
    // Calculate user statistics
    const totalUsers = allUsers.length;
    const activeSessions = allUsers.filter(u => 
      u.lastLogin && u.lastLogin >= oneHourAgo
    ).length;
    
    // Calculate tenant breakdown by subscription plan
    const tenantsByPlan = allTenants.reduce((acc, tenant) => {
      const plan = tenant.subscription.plan;
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate tenant breakdown by status
    const tenantsByStatus = allTenants.reduce((acc, tenant) => {
      acc[tenant.status] = (acc[tenant.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate users by role
    const usersByRole = allUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate new users this month
    const newUsersThisMonth = allUsers.filter(u => u.createdAt >= oneMonthAgo).length;
    
    return {
      tenants: {
        total: allTenants.length,
        active: activeTenants.length,
        newThisMonth: newTenantsThisMonth.length,
        byStatus: tenantsByStatus,
        byPlan: tenantsByPlan,
      },
      users: {
        total: totalUsers,
        activeSessions,
        newThisMonth: newUsersThisMonth,
        byRole: usersByRole,
      },
      performance: {
        // Placeholder for now - will be implemented in later phases
        status: "operational" as const,
        uptime: 99.9, // Placeholder
        averageResponseTime: 120, // Placeholder in ms
      },
      security: {
        // Placeholder for now - will be implemented in later phases
        complianceStatus: "compliant" as const,
        lastSecurityScan: now - (24 * 60 * 60 * 1000), // Placeholder: 24 hours ago
        criticalIssues: 0, // Placeholder
      },
      lastUpdated: now,
    };
  },
});

// Get recent platform activity (superadmin only - no tenant filtering)
export const getRecentActivity = query({
  args: {
    activityType: v.optional(v.union(
      v.literal("all"),
      v.literal("tenant"),
      v.literal("user"),
      v.literal("security"),
      v.literal("system")
    )),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Get audit logs with reasonable limit to prevent performance issues
    // Collect more than needed to account for filtering, but limit to prevent timeouts
    // Note: Convex indexes don't support ordering directly, so we collect and sort in memory
    const MAX_AUDIT_LOGS = 5000;
    let auditLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", sevenDaysAgo))
      .collect();
    
    // Sort by timestamp descending (most recent first) and limit
    auditLogs.sort((a, b) => b.timestamp - a.timestamp);
    auditLogs = auditLogs.slice(0, MAX_AUDIT_LOGS);
    
    // Get recent tenant activities (limited to prevent duplicates with audit logs)
    // Collect all recent tenants and sort in memory (no index for createdAt ordering)
    const recentTenants = await ctx.db
      .query("tenants")
      .filter((q) => q.gte(q.field("createdAt"), sevenDaysAgo))
      .collect();
    
    // Sort by createdAt descending and take most recent
    recentTenants.sort((a, b) => b.createdAt - a.createdAt);
    const topRecentTenants = recentTenants.slice(0, 100);
    
    // Get recent user activities (limited to prevent duplicates with audit logs)
    // Collect all recent users and sort in memory (no index for createdAt ordering)
    const recentUsers = await ctx.db
      .query("users")
      .filter((q) => q.gte(q.field("createdAt"), sevenDaysAgo))
      .collect();
    
    // Sort by createdAt descending and take most recent
    recentUsers.sort((a, b) => b.createdAt - a.createdAt);
    const topRecentUsers = recentUsers.slice(0, 100);
    
    // Build activity feed from audit logs
    const activities: Array<{
      type: "tenant" | "user" | "security" | "system";
      id: string;
      description: string;
      tenantId?: string;
      userId?: string;
      timestamp: number;
      severity?: "low" | "medium" | "high" | "critical";
      icon?: string;
    }> = [];
    
    // Process audit logs
    for (const log of auditLogs) {
      let activityType: "tenant" | "user" | "security" | "system" = "system";
      let description = "";
      let severity: "low" | "medium" | "high" | "critical" = "low";
      
      // Determine activity type and description based on action and resource
      if (log.resource === "tenant") {
        activityType = "tenant";
        if (log.action === "tenant_created") {
          description = `Tenant '${log.details?.name || log.resourceId}' was created`;
        } else if (log.action === "tenant_branding_updated") {
          description = `Tenant '${log.resourceId}' branding was updated`;
        } else if (log.action === "tenant_features_updated") {
          description = `Tenant '${log.resourceId}' features were updated`;
        } else if (log.action === "tenant_settings_updated") {
          description = `Tenant '${log.resourceId}' settings were updated`;
        } else {
          description = `Tenant '${log.resourceId}': ${log.action}`;
        }
      } else if (log.resource === "user" || log.action.includes("user")) {
        activityType = "user";
        if (log.action === "login_success") {
          description = `User logged in`;
        } else if (log.action === "login_failed") {
          activityType = "security";
          description = `Security: Failed login attempt${log.ipAddress ? ` from IP ${log.ipAddress}` : ""}`;
          severity = "medium";
        } else if (log.action === "logout") {
          description = `User logged out`;
        } else if (log.action === "user_created") {
          description = `User '${log.details?.email || log.resourceId}' was created`;
        } else {
          description = `User activity: ${log.action}`;
        }
      } else if (
        log.action.includes("security") ||
        log.action.includes("unauthorized") ||
        log.action.includes("permission") ||
        log.action === "login_failed"
      ) {
        activityType = "security";
        description = `Security: ${log.action}${log.ipAddress ? ` from IP ${log.ipAddress}` : ""}`;
        severity = log.action.includes("unauthorized") || log.action.includes("critical") ? "high" : "medium";
      } else {
        activityType = "system";
        description = `System: ${log.action}`;
      }
      
      activities.push({
        type: activityType,
        id: log._id,
        description,
        tenantId: log.tenantId,
        userId: log.userId,
        timestamp: log.timestamp,
        severity,
      });
    }
    
    // Track which tenant/user IDs we've already added from audit logs to prevent duplicates
    const addedTenantIds = new Set<string>();
    const addedUserIds = new Set<string>();
    
    // Extract tenant/user IDs from audit logs that represent creation events
    for (const log of auditLogs) {
      if (log.action === "tenant_created" && log.resourceId) {
        addedTenantIds.add(log.resourceId);
      }
      if (log.action === "user_created" && log.userId) {
        addedUserIds.add(log.userId);
      }
    }
    
    // Add tenant creation activities (only if not already in audit logs)
    for (const tenant of topRecentTenants) {
      // Check if this tenant creation is already represented in audit logs
      const alreadyInAuditLogs = addedTenantIds.has(tenant.id) || 
                                 auditLogs.some(log => 
                                   log.action === "tenant_created" && 
                                   log.resourceId === tenant.id
                                 );
      
      if (!alreadyInAuditLogs) {
        activities.push({
          type: "tenant",
          id: tenant._id,
          description: `Tenant '${tenant.name}' was created`,
          tenantId: tenant.id,
          timestamp: tenant.createdAt,
        });
      }
    }
    
    // Add user creation activities (only if not already in audit logs)
    for (const user of topRecentUsers) {
      // Check if this user creation is already represented in audit logs
      const alreadyInAuditLogs = addedUserIds.has(user._id) ||
                                 auditLogs.some(log => 
                                   log.action === "user_created" && 
                                   log.userId === user._id
                                 );
      
      if (!alreadyInAuditLogs) {
        activities.push({
          type: "user",
          id: user._id,
          description: `User '${user.email}' was created`,
          tenantId: user.tenantId || undefined,
          userId: user._id,
          timestamp: user.createdAt,
        });
      }
    }
    
    // Filter by activity type if specified
    let filteredActivities = activities;
    if (args.activityType && args.activityType !== "all") {
      filteredActivities = activities.filter(a => a.type === args.activityType);
    }
    
    // Sort by timestamp (most recent first)
    filteredActivities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    const paginatedActivities = filteredActivities.slice(offset, offset + limit);
    
    return {
      activities: paginatedActivities,
      total: filteredActivities.length,
      hasMore: offset + limit < filteredActivities.length,
    };
  },
});


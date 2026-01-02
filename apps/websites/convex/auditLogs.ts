import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { permissionTreeValidator } from "./validators";

// Create audit log entry
export const create = mutation({
  args: {
    tenantId: v.string(),
    userId: v.optional(v.id("users")),
    action: v.string(),
    resource: v.string(),
    resourceId: v.string(),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
    phiAccessed: v.optional(v.object({
      patientId: v.id("patients"), // Patient whose PHI was accessed
      dataElements: v.array(v.string()), // Specific PHI elements accessed
      purpose: v.string() // Purpose for accessing PHI
    })),
    permissionChanges: v.optional(v.object({
      userId: v.id("users"), // User whose permissions were changed
      oldPermissions: permissionTreeValidator, // Previous permission structure (PermissionTree format)
      newPermissions: permissionTreeValidator, // New permission structure (PermissionTree format)
      changedBy: v.id("users") // User who made the permission change
    }))
  },
  handler: async (ctx, args) => {
    const auditLogId = await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      userId: args.userId || undefined,
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      details: args.details,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      timestamp: args.timestamp,
      phiAccessed: args.phiAccessed || undefined,
      permissionChanges: args.permissionChanges || undefined
    });
    
    return auditLogId;
  },
});

// Get audit logs for a tenant
export const getAuditLogs = query({
  args: {
    tenantId: v.string(),
    userId: v.optional(v.id("users")),
    action: v.optional(v.string()),
    resource: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    let logs;
    
    if (args.userId) {
      // Filter by both tenant and user
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_tenant_user", (q) => 
          q.eq("tenantId", args.tenantId).eq("userId", args.userId)
        )
        .collect();
    } else {
      // Filter by tenant only using by_tenant_user index
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
        .collect();
    }
    
    // Apply additional filters
    if (args.action) {
      logs = logs.filter(log => log.action === args.action);
    }
    
    if (args.resource) {
      logs = logs.filter(log => log.resource === args.resource);
    }
    
    if (args.startDate) {
      logs = logs.filter(log => log.timestamp >= args.startDate!);
    }
    
    if (args.endDate) {
      logs = logs.filter(log => log.timestamp <= args.endDate!);
    }
    
    // Sort by timestamp (most recent first)
    logs.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    const paginatedLogs = logs.slice(offset, offset + limit);
    
    return {
      logs: paginatedLogs,
      total: logs.length,
      hasMore: offset + limit < logs.length
    };
  },
});

// Get audit log statistics for a tenant
export const getAuditStats = query({
  args: {
    tenantId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    let logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    
    // Apply date filters
    if (args.startDate) {
      logs = logs.filter(log => log.timestamp >= args.startDate!);
    }
    
    if (args.endDate) {
      logs = logs.filter(log => log.timestamp <= args.endDate!);
    }
    
    // Calculate statistics
    const stats = {
      totalActions: logs.length,
      actionsByType: {} as Record<string, number>,
      resourcesByType: {} as Record<string, number>,
      userActivity: {} as Record<string, number>,
      dailyActivity: {} as Record<string, number>
    };
    
    logs.forEach(log => {
      // Count actions by type
      stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;
      
      // Count resources by type
      stats.resourcesByType[log.resource] = (stats.resourcesByType[log.resource] || 0) + 1;
      
      // Count user activity
      if (log.userId) {
        stats.userActivity[log.userId] = (stats.userActivity[log.userId] || 0) + 1;
      }
      
      // Count daily activity
      const date = new Date(log.timestamp).toISOString().split('T')[0]!;
      stats.dailyActivity[date] = (stats.dailyActivity[date] || 0) + 1;
    });
    
    return stats;
  },
});

// Get recent security events
export const getSecurityEvents = query({
  args: {
    tenantId: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const securityActions = [
      'login_failed',
      'login_success',
      'logout',
      'password_changed',
      'account_locked',
      'permission_denied',
      'unauthorized_access',
      'data_export',
      'data_deletion',
      'user_created',
      'user_deleted',
      'role_changed'
    ];
    
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant_action", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    
    const securityEvents = logs
      .filter(log => securityActions.includes(log.action))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, args.limit || 100);
    
    return securityEvents;
  },
});

// Clean up old audit logs (for data retention)
export const cleanupOldLogs = mutation({
  args: {
    tenantId: v.string(),
    retentionDays: v.number()
  },
  handler: async (ctx, args) => {
    const cutoffDate = Date.now() - (args.retentionDays * 24 * 60 * 60 * 1000);
    
    const oldLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.lt(q.field("timestamp"), cutoffDate))
      .collect();
    
    let deletedCount = 0;
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deletedCount++;
    }
    
    return { deletedCount };
  },
});

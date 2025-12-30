/**
 * Session Management - Concurrent Session Limits & Activity Monitoring
 * 
 * This module provides concurrent session tracking and enforcement for HIPAA compliance
 * and security. It tracks active sessions per user and enforces configurable limits.
 * 
 * Features:
 * - Track active sessions per user
 * - Enforce configurable concurrent session limits
 * - Terminate oldest session when limit exceeded
 * - Clean up expired sessions
 * - Monitor and log session activity
 * - Track significant actions during sessions
 * - Provide session analytics
 * - Maintain audit trail
 */

import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Create a new session for a user
 * This is called during authentication to track the session
 */
export const createSession = mutation({
  args: {
    userId: v.id("users"),
    sessionId: v.string(), // Unique session identifier (e.g., JWT token ID)
    tenantId: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    expiresAt: v.optional(v.number()), // Optional expiration timestamp
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Create session record
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      sessionId: args.sessionId,
      tenantId: args.tenantId,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: now,
      lastActivity: now,
      expiresAt: args.expiresAt,
    });
    
    return sessionId;
  },
});

/**
 * Get all active sessions for a user
 * Returns sessions sorted by creation time (oldest first)
 */
export const getUserSessions = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get all sessions for this user in this tenant
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_tenant", (q) => 
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .collect();
    
    // Filter out expired sessions and sort by creation time (oldest first)
    const activeSessions = sessions
      .filter(session => {
        // Session is active if it hasn't expired (or has no expiration)
        if (session.expiresAt && session.expiresAt < now) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.createdAt - b.createdAt); // Oldest first
    
    return activeSessions;
  },
});

/**
 * Get session by session ID
 */
export const getSessionById = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    const now = Date.now();
    if (session.expiresAt && session.expiresAt < now) {
      return null;
    }
    
    return session;
  },
});

/**
 * Update session last activity timestamp
 * Called on each authenticated request to track activity
 * Optionally logs activity event for detailed tracking
 */
export const updateSessionActivity = mutation({
  args: {
    sessionId: v.string(),
    logActivity: v.optional(v.boolean()), // Whether to log activity event (default: false to avoid excessive logging)
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!session) {
      return false;
    }
    
    // Check if session is expired
    const now = Date.now();
    if (session.expiresAt && session.expiresAt < now) {
      // Session expired - delete it
      await ctx.db.delete(session._id);
      return false;
    }
    
    // Update last activity
    await ctx.db.patch(session._id, {
      lastActivity: now,
    });
    
    // Optionally log activity event (only if explicitly requested to avoid excessive logging)
    if (args.logActivity) {
      await ctx.db.insert("sessionActivity", {
        sessionId: args.sessionId,
        userId: session.userId,
        tenantId: session.tenantId,
        activityType: "activity",
        action: "activity_tracked",
        ipAddress: args.ipAddress || session.ipAddress,
        userAgent: args.userAgent || session.userAgent,
        timestamp: now,
      });
    }
    
    return true;
  },
});

/**
 * Delete a session (called on logout)
 */
export const deleteSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (session) {
      await ctx.db.delete(session._id);
      return true;
    }
    
    return false;
  },
});

/**
 * Delete all sessions for a user (called when user is deactivated or password changed)
 */
export const deleteAllUserSessions = mutation({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_tenant", (q) => 
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .collect();
    
    // Delete all sessions
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
    
    return sessions.length;
  },
});

/**
 * Get concurrent session limit for a tenant
 * Returns default value if not configured
 */
export const getConcurrentSessionLimit = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();
    
    if (!tenant) {
      // Default limit if tenant not found
      return 3;
    }
    
    // Get limit from tenant settings, default to 3
    const maxConcurrentSessions = tenant.settings.sessionTimeout?.maxConcurrentSessions ?? 3;
    
    return maxConcurrentSessions;
  },
});

/**
 * Check if user has exceeded concurrent session limit
 * Returns information about active sessions and whether limit is exceeded
 */
export const checkSessionLimit = action({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args): Promise<{ limit: number; activeCount: number; exceeded: boolean; activeSessions: any[] }> => {
    // Get concurrent session limit for tenant
    const limit: number = await ctx.runQuery(api.sessions.getConcurrentSessionLimit, {
      tenantId: args.tenantId,
    });
    
    // Get active sessions for user
    const activeSessions: any[] = await ctx.runQuery(api.sessions.getUserSessions, {
      userId: args.userId,
      tenantId: args.tenantId,
    });
    
    const activeCount: number = activeSessions.length;
    const exceeded = activeCount >= limit;
    
    return {
      limit,
      activeCount,
      exceeded,
      activeSessions: activeSessions.map((s: any) => ({
        _id: s._id,
        sessionId: s.sessionId,
        createdAt: s.createdAt,
        lastActivity: s.lastActivity,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
      })),
    };
  },
});

/**
 * Enforce session limit by terminating oldest session if limit exceeded
 * Returns the session that was terminated (if any)
 */
export const enforceSessionLimit = action({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; terminatedSession?: any }> => {
    // Check current session status
    const sessionStatus: any = await ctx.runAction(api.sessions.checkSessionLimit, {
      userId: args.userId,
      tenantId: args.tenantId,
    });
    
    // If limit not exceeded, nothing to do
    if (!sessionStatus.exceeded) {
      return {
        success: true,
        terminatedSession: null,
      };
    }
    
    // Limit exceeded - terminate oldest session
    // Sessions are already sorted by creation time (oldest first)
    const oldestSession: any = sessionStatus.activeSessions[0];
    
    if (oldestSession) {
      // Delete the oldest session
      await ctx.runMutation(api.sessions.deleteSession, {
        sessionId: oldestSession.sessionId,
      });
      
      return {
        success: true,
        terminatedSession: {
          sessionId: oldestSession.sessionId,
          createdAt: oldestSession.createdAt,
        },
      };
    }
    
    return {
      success: true,
      terminatedSession: null,
    };
  },
});

/**
 * Clean up expired sessions
 * This can be called periodically to remove expired sessions
 * 
 * Handles two cases:
 * 1. Sessions with expiresAt that have expired (using index query for efficiency)
 * 2. Legacy sessions without expiresAt that are old (30+ days of inactivity)
 */
export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const LEGACY_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days for legacy sessions without expiresAt
    
    let cleanedCount = 0;
    
    // 1. Clean up sessions with expiresAt that have expired
    // Use range query to only fetch expired sessions from the database
    // This avoids loading potentially millions of non-expired sessions
    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .collect();
    
    // Delete expired sessions (all returned sessions are expired by definition)
    for (const session of expiredSessions) {
      // Double-check expiresAt exists (should always be true due to index query)
      if (session.expiresAt && session.expiresAt < now) {
        await ctx.db.delete(session._id);
        cleanedCount++;
      }
    }
    
    // 2. Clean up legacy sessions without expiresAt that are old
    // These are sessions created before the bug fix that don't have expiresAt set
    // We clean them up if they haven't had activity in 30+ days
    // 
    // PERFORMANCE FIX: Process sessions tenant-by-tenant using the by_tenant index
    // to avoid loading ALL sessions into memory at once. This prevents memory exhaustion
    // and performance degradation for systems with millions of sessions.
    const legacyCutoffTime = now - LEGACY_SESSION_MAX_AGE_MS;
    
    // Get all tenants to process their sessions separately
    // This allows us to use the by_tenant index and process in smaller batches
    // instead of loading potentially millions of sessions into memory
    const allTenants = await ctx.db
      .query("tenants")
      .collect();
    
    // Process sessions for each tenant separately to avoid memory issues
    for (const tenant of allTenants) {
      // Get sessions for this tenant using the by_tenant index (efficient index-based query)
      const tenantSessions = await ctx.db
        .query("sessions")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenant.id))
        .collect();
      
      // Filter and delete legacy sessions (no expiresAt and old lastActivity)
      for (const session of tenantSessions) {
        // Only process sessions without expiresAt (legacy sessions)
        if (!session.expiresAt) {
          // Clean up if last activity was more than 30 days ago
          if (session.lastActivity < legacyCutoffTime) {
            await ctx.db.delete(session._id);
            cleanedCount++;
          }
        }
      }
    }
    
    // Note: Sessions with tenantId that doesn't match any existing tenant (orphaned sessions)
    // will be cleaned up in subsequent cleanup runs when their tenantId is processed
    // or when they naturally expire. This is acceptable as orphaned sessions are rare
    // and the performance benefit of avoiding a full table scan outweighs this edge case.
    
    return cleanedCount;
  },
});

// ============================================================================
// Session Activity Monitoring
// ============================================================================

/**
 * Log general session activity (track activity timestamps)
 * Called periodically to track user activity during a session
 */
export const logSessionActivity = mutation({
  args: {
    sessionId: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    const now = Date.now();
    if (session.expiresAt && session.expiresAt < now) {
      return null;
    }
    
    // Update session last activity
    await ctx.db.patch(session._id, {
      lastActivity: now,
    });
    
    // Log activity event
    const activityId = await ctx.db.insert("sessionActivity", {
      sessionId: args.sessionId,
      userId: session.userId,
      tenantId: session.tenantId,
      activityType: "activity",
      action: "activity_tracked",
      ipAddress: args.ipAddress || session.ipAddress,
      userAgent: args.userAgent || session.userAgent,
      timestamp: now,
    });
    
    return activityId;
  },
});

/**
 * Log significant action during a session
 * Used to track important actions like PHI access, permission changes, etc.
 * Optionally links to audit log for immutable audit trail
 */
export const logSignificantAction = mutation({
  args: {
    sessionId: v.string(),
    activityType: v.union(
      v.literal("phi_access"),
      v.literal("permission_change"),
      v.literal("security_event"),
      v.literal("data_export"),
      v.literal("data_deletion"),
      v.literal("settings_change")
    ),
    action: v.string(), // Specific action (e.g., "view_patient", "update_record", "export_data")
    resource: v.optional(v.string()), // Resource type (e.g., "patient", "medicalRecord")
    resourceId: v.optional(v.string()), // ID of the resource accessed
    details: v.optional(v.any()), // Additional details about the activity
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    auditLogId: v.optional(v.id("auditLogs")), // Link to audit log if created
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    const now = Date.now();
    if (session.expiresAt && session.expiresAt < now) {
      return null;
    }
    
    // Update session last activity
    await ctx.db.patch(session._id, {
      lastActivity: now,
    });
    
    // Log significant action
    const activityId = await ctx.db.insert("sessionActivity", {
      sessionId: args.sessionId,
      userId: session.userId,
      tenantId: session.tenantId,
      activityType: args.activityType,
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      details: args.details,
      ipAddress: args.ipAddress || session.ipAddress,
      userAgent: args.userAgent || session.userAgent,
      timestamp: now,
      auditLogId: args.auditLogId,
    });
    
    return activityId;
  },
});

/**
 * Get activity events for a session
 * Returns all activity events for a specific session, sorted by timestamp
 */
export const getSessionActivity = query({
  args: {
    sessionId: v.string(),
    activityType: v.optional(v.union(
      v.literal("activity"),
      v.literal("phi_access"),
      v.literal("permission_change"),
      v.literal("security_event"),
      v.literal("data_export"),
      v.literal("data_deletion"),
      v.literal("settings_change")
    )),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let activities = await ctx.db
      .query("sessionActivity")
      .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    // Filter by activity type if specified
    if (args.activityType) {
      activities = activities.filter(a => a.activityType === args.activityType);
    }
    
    // Filter by date range if specified
    if (args.startDate) {
      activities = activities.filter(a => a.timestamp >= args.startDate!);
    }
    
    if (args.endDate) {
      activities = activities.filter(a => a.timestamp <= args.endDate!);
    }
    
    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply limit if specified
    const limit = args.limit || 100;
    const limitedActivities = activities.slice(0, limit);
    
    return {
      activities: limitedActivities,
      total: activities.length,
      hasMore: activities.length > limit,
    };
  },
});

/**
 * Get session analytics for a user
 * Provides comprehensive analytics about session activity patterns
 */
export const getSessionAnalytics = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get all sessions for user
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_tenant", (q) => 
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .collect();
    
    // Filter by date range if specified
    let filteredSessions = sessions;
    if (args.startDate || args.endDate) {
      filteredSessions = sessions.filter(session => {
        if (args.startDate && session.createdAt < args.startDate) {
          return false;
        }
        if (args.endDate && session.createdAt > args.endDate) {
          return false;
        }
        return true;
      });
    }
    
    // Get activity events for all sessions
    const allActivities: any[] = [];
    for (const session of filteredSessions) {
      const activities = await ctx.db
        .query("sessionActivity")
        .withIndex("by_session_timestamp", (q) => q.eq("sessionId", session.sessionId))
        .collect();
      allActivities.push(...activities);
    }
    
    // Calculate analytics
    const analytics = {
      totalSessions: filteredSessions.length,
      activeSessions: filteredSessions.filter(s => {
        if (s.expiresAt && s.expiresAt < now) {
          return false;
        }
        return true;
      }).length,
      totalActivityEvents: allActivities.length,
      averageSessionDuration: 0,
      totalSessionDuration: 0,
      activityByType: {} as Record<string, number>,
      activityByAction: {} as Record<string, number>,
      activityByHour: {} as Record<number, number>,
      activityByDay: {} as Record<string, number>,
      significantActions: {
        phiAccess: 0,
        permissionChanges: 0,
        securityEvents: 0,
        dataExports: 0,
        dataDeletions: 0,
        settingsChanges: 0,
      },
      mostActiveSessions: [] as Array<{
        sessionId: string;
        activityCount: number;
        duration: number;
        createdAt: number;
      }>,
    };
    
    // Calculate session durations and activity patterns
    for (const session of filteredSessions) {
      const sessionActivities = allActivities.filter(a => a.sessionId === session.sessionId);
      const sessionDuration = session.expiresAt 
        ? Math.min(session.expiresAt - session.createdAt, now - session.createdAt)
        : now - session.createdAt;
      
      analytics.totalSessionDuration += sessionDuration;
      
      // Track most active sessions
      analytics.mostActiveSessions.push({
        sessionId: session.sessionId,
        activityCount: sessionActivities.length,
        duration: sessionDuration,
        createdAt: session.createdAt,
      });
      
      // Analyze activity events
      for (const activity of sessionActivities) {
        // Count by type
        analytics.activityByType[activity.activityType] = 
          (analytics.activityByType[activity.activityType] || 0) + 1;
        
        // Count by action
        analytics.activityByAction[activity.action] = 
          (analytics.activityByAction[activity.action] || 0) + 1;
        
        // Count by hour
        const hour = new Date(activity.timestamp).getHours();
        analytics.activityByHour[hour] = (analytics.activityByHour[hour] || 0) + 1;
        
        // Count by day
        const day = new Date(activity.timestamp).toISOString().split('T')[0]!;
        analytics.activityByDay[day] = (analytics.activityByDay[day] || 0) + 1;
        
        // Count significant actions
        if (activity.activityType === "phi_access") {
          analytics.significantActions.phiAccess++;
        } else if (activity.activityType === "permission_change") {
          analytics.significantActions.permissionChanges++;
        } else if (activity.activityType === "security_event") {
          analytics.significantActions.securityEvents++;
        } else if (activity.activityType === "data_export") {
          analytics.significantActions.dataExports++;
        } else if (activity.activityType === "data_deletion") {
          analytics.significantActions.dataDeletions++;
        } else if (activity.activityType === "settings_change") {
          analytics.significantActions.settingsChanges++;
        }
      }
    }
    
    // Calculate average session duration
    if (filteredSessions.length > 0) {
      analytics.averageSessionDuration = analytics.totalSessionDuration / filteredSessions.length;
    }
    
    // Sort most active sessions by activity count
    analytics.mostActiveSessions.sort((a, b) => b.activityCount - a.activityCount);
    analytics.mostActiveSessions = analytics.mostActiveSessions.slice(0, 10);
    
    return analytics;
  },
});

/**
 * Get activity events for a user across all sessions
 * Useful for user activity monitoring and compliance reporting
 */
export const getUserActivity = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
    activityType: v.optional(v.union(
      v.literal("activity"),
      v.literal("phi_access"),
      v.literal("permission_change"),
      v.literal("security_event"),
      v.literal("data_export"),
      v.literal("data_deletion"),
      v.literal("settings_change")
    )),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let activities = await ctx.db
      .query("sessionActivity")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();
    
    // Filter by activity type if specified
    if (args.activityType) {
      activities = activities.filter(a => a.activityType === args.activityType);
    }
    
    // Filter by date range if specified
    if (args.startDate) {
      activities = activities.filter(a => a.timestamp >= args.startDate!);
    }
    
    if (args.endDate) {
      activities = activities.filter(a => a.timestamp <= args.endDate!);
    }
    
    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply limit if specified
    const limit = args.limit || 100;
    const limitedActivities = activities.slice(0, limit);
    
    return {
      activities: limitedActivities,
      total: activities.length,
      hasMore: activities.length > limit,
    };
  },
});

/**
 * Get significant actions for a tenant
 * Useful for security monitoring and compliance reporting
 */
export const getTenantSignificantActions = query({
  args: {
    tenantId: v.string(),
    activityType: v.optional(v.union(
      v.literal("phi_access"),
      v.literal("permission_change"),
      v.literal("security_event"),
      v.literal("data_export"),
      v.literal("data_deletion"),
      v.literal("settings_change")
    )),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let activities = await ctx.db
      .query("sessionActivity")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    
    // Filter to only significant actions (exclude general "activity" type)
    activities = activities.filter(a => a.activityType !== "activity");
    
    // Filter by activity type if specified
    if (args.activityType) {
      activities = activities.filter(a => a.activityType === args.activityType);
    }
    
    // Filter by date range if specified
    if (args.startDate) {
      activities = activities.filter(a => a.timestamp >= args.startDate!);
    }
    
    if (args.endDate) {
      activities = activities.filter(a => a.timestamp <= args.endDate!);
    }
    
    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply limit if specified
    const limit = args.limit || 100;
    const limitedActivities = activities.slice(0, limit);
    
    return {
      activities: limitedActivities,
      total: activities.length,
      hasMore: activities.length > limit,
    };
  },
});

/**
 * Clean up old session activity records
 * This can be called periodically to remove old activity records for data retention
 * Note: This should be done carefully to maintain audit trail requirements
 */
export const cleanupOldSessionActivity = mutation({
  args: {
    retentionDays: v.number(), // Number of days to retain activity records
    tenantId: v.optional(v.string()), // Optional: clean up for specific tenant only
  },
  handler: async (ctx, args) => {
    const cutoffDate = Date.now() - (args.retentionDays * 24 * 60 * 60 * 1000);
    
    let activities;
    if (args.tenantId) {
      // Clean up for specific tenant
      activities = await ctx.db
        .query("sessionActivity")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId!))
        .filter((q) => q.lt(q.field("timestamp"), cutoffDate))
        .collect();
    } else {
      // Clean up all old activities
      // Note: This is less efficient but necessary if tenantId is not provided
      activities = await ctx.db
        .query("sessionActivity")
        .collect();
      
      activities = activities.filter(a => a.timestamp < cutoffDate);
    }
    
    let cleanedCount = 0;
    for (const activity of activities) {
      await ctx.db.delete(activity._id);
      cleanedCount++;
    }
    
    return { cleanedCount };
  },
});

/**
 * Internal mutation for scheduled cleanup of old session activity records
 * Called by scheduled jobs - ensures only internal actions can trigger cleanup
 */
export const cleanupOldSessionActivityInternal = internalMutation({
  args: {
    tenantId: v.string(),
    retentionDays: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffDate = Date.now() - (args.retentionDays * 24 * 60 * 60 * 1000);
    
    // Clean up for specific tenant
    const activities = await ctx.db
      .query("sessionActivity")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.lt(q.field("timestamp"), cutoffDate))
      .collect();
    
    let cleanedCount = 0;
    for (const activity of activities) {
      await ctx.db.delete(activity._id);
      cleanedCount++;
    }
    
    return { cleanedCount };
  },
});


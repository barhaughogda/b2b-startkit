import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get security events, failed logins, and active sessions for admin dashboard
 * Returns security-related audit log entries with filtering and pagination
 */
export const getSecurityData = query({
  args: {
    tenantId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page || 1;
    const limit = args.limit || 50;
    const offset = (page - 1) * limit;

    // Security action types to filter
    const securityActions = [
      "login_failed",
      "login_success",
      "logout",
      "unauthorized_access",
      "permission_denied",
      "account_locked",
      "data_export",
      "data_deletion",
      "password_changed",
      "role_changed",
      "user_created",
      "user_deleted",
    ];

    // Get all audit logs for this tenant
    let logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter security events
    let securityEvents = logs.filter((log) =>
      securityActions.includes(log.action)
    );

    // Apply date range filters
    if (args.startDate) {
      securityEvents = securityEvents.filter(
        (log) => log.timestamp >= args.startDate!
      );
    }
    if (args.endDate) {
      securityEvents = securityEvents.filter(
        (log) => log.timestamp <= args.endDate!
      );
    }

    // Sort by timestamp (most recent first)
    securityEvents.sort((a, b) => b.timestamp - a.timestamp);

    // Extract failed logins
    const failedLogins = securityEvents.filter(
      (log) => log.action === "login_failed"
    );

    // Extract active sessions (recent login_success events within last 8 hours)
    const now = Date.now();
    const eightHoursAgo = now - 8 * 60 * 60 * 1000;
    const activeSessions = securityEvents.filter(
      (log) =>
        log.action === "login_success" && log.timestamp >= eightHoursAgo
    );

    // Apply pagination to security events
    const paginatedEvents = securityEvents.slice(offset, offset + limit);
    const total = securityEvents.length;
    const hasMore = offset + limit < total;

    return {
      events: paginatedEvents,
      failedLogins,
      activeSessions,
      total,
      page,
      limit,
      hasMore,
    };
  },
});


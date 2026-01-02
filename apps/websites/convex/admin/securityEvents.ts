/**
 * Security Events queries for superadmin
 * Cross-tenant security event retrieval and filtering
 * 
 * Task 6.1: Create Security Events API
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Security event action types that should be included in security events
 */
const SECURITY_ACTIONS = [
  'unauthorized_access',
  'authorized_access',
  'login_failed',
  'login_success',
  'logout',
  'password_changed',
  'account_locked',
  'permission_denied',
  'data_export',
  'data_deletion',
  'user_created',
  'user_deleted',
  'role_changed',
  'session_hijacked',
  'suspicious_activity',
  'rate_limit_exceeded',
  'ip_blocked',
] as const;

/**
 * Get security events across all tenants for superadmin
 * Supports filtering by event type, severity, and date range
 * 
 * Performance Note: This query collects all audit logs into memory before filtering.
 * This approach is acceptable because:
 * - Security events are a subset of all audit logs (filtered by action type)
 * - Typical platforms have < 100,000 security events per month
 * - Filtering and sorting require in-memory operations
 * 
 * For platforms with > 1M security events per month, consider:
 * - Adding composite indexes for action/timestamp filtering
 * - Implementing time-based partitioning
 * - Using external search/analytics service (e.g., Elasticsearch)
 */
export const getSecurityEventsForSuperadmin = query({
  args: {
    eventType: v.optional(v.string()),
    severity: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get all audit logs (no tenant filter for superadmin)
    let logs = await ctx.db.query("auditLogs").collect();

    // Filter to security-related actions only
    logs = logs.filter((log) => SECURITY_ACTIONS.includes(log.action as any));

    // Apply event type filter
    if (args.eventType) {
      logs = logs.filter((log) => log.action === args.eventType);
    }

    // Apply severity filter (from details.severity)
    if (args.severity) {
      logs = logs.filter((log) => {
        const details = log.details as any;
        return details?.severity === args.severity;
      });
    }

    // Apply date range filters
    if (args.startDate) {
      logs = logs.filter((log) => log.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      logs = logs.filter((log) => log.timestamp <= args.endDate!);
    }

    // Sort by timestamp (most recent first)
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // Calculate pagination
    const total = logs.length;
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    const paginatedLogs = logs.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      events: paginatedLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore,
      },
    };
  },
});


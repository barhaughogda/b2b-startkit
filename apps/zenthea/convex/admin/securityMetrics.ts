import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get security-related metrics for admin dashboard
 * Returns security events, failed logins, compliance violations, and threat indicators
 */
export const getSecurityMetrics = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Security action types to filter
    const securityActions = [
      "login_failed",
      "unauthorized_access",
      "permission_denied",
      "account_locked",
      "data_export",
      "data_deletion",
      "password_changed",
      "role_changed",
    ];

    // Get all audit logs for this tenant
    const allLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter security events
    const securityEvents = allLogs.filter((log) =>
      securityActions.includes(log.action)
    );

    // Calculate recent security events (last 24 hours)
    const recentSecurityEvents = securityEvents.filter(
      (event) => event.timestamp >= oneDayAgo
    ).length;

    // Calculate failed login attempts
    const failedLogins = allLogs.filter(
      (log) => log.action === "login_failed"
    );
    const failedLoginsLast24Hours = failedLogins.filter(
      (log) => log.timestamp >= oneDayAgo
    ).length;
    const failedLoginsLast7Days = failedLogins.filter(
      (log) => log.timestamp >= sevenDaysAgo
    ).length;
    const failedLoginsLast30Days = failedLogins.filter(
      (log) => log.timestamp >= thirtyDaysAgo
    ).length;

    // Calculate compliance violations
    const complianceViolations = allLogs.filter(
      (log) =>
        log.action === "unauthorized_access" ||
        log.action === "permission_denied" ||
        log.resource === "patient_data" ||
        log.resource === "phi"
    );
    const complianceViolationsLast24Hours = complianceViolations.filter(
      (log) => log.timestamp >= oneDayAgo
    ).length;
    const complianceViolationsLast7Days = complianceViolations.filter(
      (log) => log.timestamp >= sevenDaysAgo
    ).length;

    // Calculate threat indicators
    // High threat: multiple failed logins from same IP, account lockouts, unauthorized access
    const accountLockouts = allLogs.filter(
      (log) => log.action === "account_locked" && log.timestamp >= oneDayAgo
    ).length;

    // Check for suspicious patterns (multiple failed logins)
    const suspiciousPatterns = failedLoginsLast24Hours > 10;

    // Determine threat level
    let threatLevel: "low" | "medium" | "high" = "low";
    if (
      accountLockouts > 0 ||
      complianceViolationsLast24Hours > 5 ||
      failedLoginsLast24Hours > 20
    ) {
      threatLevel = "high";
    } else if (
      complianceViolationsLast24Hours > 0 ||
      failedLoginsLast24Hours > 10 ||
      recentSecurityEvents > 5
    ) {
      threatLevel = "medium";
    }

    return {
      recentSecurityEvents,
      failedLogins: {
        last24Hours: failedLoginsLast24Hours,
        last7Days: failedLoginsLast7Days,
        last30Days: failedLoginsLast30Days,
        total: failedLogins.length,
      },
      complianceViolations: {
        last24Hours: complianceViolationsLast24Hours,
        last7Days: complianceViolationsLast7Days,
        total: complianceViolations.length,
      },
      threatIndicators: {
        accountLockouts,
        suspiciousPatterns,
        threatLevel,
      },
      lastUpdated: now,
    };
  },
});


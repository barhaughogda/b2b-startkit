import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get compliance-related metrics for admin dashboard
 * Returns HIPAA compliance status, audit log counts, data retention status, and compliance score
 */
export const getComplianceMetrics = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Get all audit logs for this tenant
    const allLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Calculate audit log counts
    const auditLogCount = {
      total: allLogs.length,
      last24Hours: allLogs.filter((log) => log.timestamp >= oneDayAgo).length,
      last7Days: allLogs.filter((log) => log.timestamp >= sevenDaysAgo)
        .length,
      last30Days: allLogs.filter((log) => log.timestamp >= thirtyDaysAgo)
        .length,
    };

    // Check for HIPAA compliance violations
    const complianceViolations = allLogs.filter(
      (log) =>
        log.action === "unauthorized_access" ||
        log.action === "permission_denied" ||
        log.resource === "patient_data" ||
        log.resource === "phi" ||
        log.action === "data_export" ||
        log.action === "data_deletion"
    );

    const recentViolations = complianceViolations.filter(
      (log) => log.timestamp >= oneDayAgo
    ).length;

    // Determine HIPAA compliance status
    // Status is based on actual violations detected, not on activity levels
    // A system can legitimately have zero activity during quiet periods
    let hipaaStatus: "compliant" | "warning" | "non-compliant" = "compliant";

    // Non-compliant: Only based on actual violations (not activity levels)
    if (recentViolations > 5) {
      hipaaStatus = "non-compliant";
    } 
    // Warning: Based on violations or suspicious patterns (sudden activity drop with violations)
    else if (recentViolations > 0) {
      hipaaStatus = "warning";
    }
    // Note: Low or zero activity alone is not a compliance issue

    // Check data retention status (basic check - can be enhanced later)
    // For now, we check if audit logs are being maintained
    const dataRetentionStatus =
      auditLogCount.total > 0 ? "compliant" : "non-compliant";

    // Calculate compliance score (0-100)
    // Base score: 100
    // Deduct points only for actual violations, not for activity levels
    // Zero activity is legitimate and should not be penalized
    let complianceScore = 100;

    // Deduct points for violations
    if (recentViolations > 0) {
      complianceScore -= Math.min(recentViolations * 5, 30); // Max 30 points deduction
    }

    // Note: We do not penalize for low or zero activity
    // A system can legitimately have no activity during quiet periods
    // Compliance is based on violations, not activity levels

    // Ensure score is between 0 and 100
    complianceScore = Math.max(0, Math.min(100, complianceScore));

    // Determine compliance level based on score
    let complianceLevel: "excellent" | "good" | "fair" | "poor" = "excellent";
    if (complianceScore < 60) {
      complianceLevel = "poor";
    } else if (complianceScore < 75) {
      complianceLevel = "fair";
    } else if (complianceScore < 90) {
      complianceLevel = "good";
    }

    return {
      hipaaStatus,
      auditLogCount,
      dataRetentionStatus,
      complianceScore: Math.round(complianceScore),
      complianceLevel,
      violations: {
        total: complianceViolations.length,
        recent: recentViolations,
      },
      lastUpdated: now,
    };
  },
});


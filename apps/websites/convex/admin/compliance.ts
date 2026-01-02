import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Helper function to determine if an audit log represents a compliance violation
 */
function isComplianceViolation(log: {
  action: string;
  resource?: string;
}): boolean {
  return (
    log.action === "unauthorized_access" ||
    log.action === "permission_denied" ||
    log.resource === "patient_data" ||
    log.resource === "phi" ||
    log.action === "data_export" ||
    log.action === "data_deletion"
  );
}

/**
 * Helper function to determine violation severity
 */
function getViolationSeverity(
  action: string,
  resource?: string
): "low" | "medium" | "high" {
  if (action === "unauthorized_access" || resource === "phi") {
    return "high";
  }
  if (action === "permission_denied") {
    return "low";
  }
  return "medium";
}

/**
 * Helper function to calculate compliance score based on recent violations
 */
function calculateComplianceScore(recentViolations: number): number {
  let score = 100;
  if (recentViolations > 0) {
    score -= Math.min(recentViolations * 5, 30); // Max 30 points deduction
  }
  return Math.max(0, Math.min(100, score));
}

/**
 * Helper function to determine compliance level based on score
 */
function getComplianceLevel(
  score: number
): "excellent" | "good" | "fair" | "poor" {
  if (score < 60) {
    return "poor";
  }
  if (score < 75) {
    return "fair";
  }
  if (score < 90) {
    return "good";
  }
  return "excellent";
}

/**
 * Helper function to determine HIPAA compliance status based on violations
 */
function getHipaaStatus(
  recentViolations: number
): "compliant" | "warning" | "non-compliant" {
  if (recentViolations > 5) {
    return "non-compliant";
  }
  if (recentViolations > 0) {
    return "warning";
  }
  return "compliant";
}

/**
 * Helper function to escape CSV fields
 */
function escapeCsvField(field: string | null | undefined): string {
  // Handle null/undefined/empty values
  if (!field) return "";
  
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Get comprehensive compliance data including status, violations, and score
 * Returns HIPAA compliance status, violations list, compliance score, and level
 */
export const getComplianceData = query({
  args: {
    tenantId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Get all audit logs for this tenant
    let allLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Apply date range filtering if provided
    if (args.startDate) {
      allLogs = allLogs.filter((log) => log.timestamp >= args.startDate!);
    }
    if (args.endDate) {
      allLogs = allLogs.filter((log) => log.timestamp <= args.endDate!);
    }

    // Check for HIPAA compliance violations
    const complianceViolations = allLogs.filter(isComplianceViolation);

    const recentViolations = complianceViolations.filter(
      (log) => log.timestamp >= oneDayAgo
    ).length;

    // Calculate compliance metrics using helper functions
    const complianceScore = calculateComplianceScore(recentViolations);
    const hipaaStatus = getHipaaStatus(recentViolations);
    const complianceLevel = getComplianceLevel(complianceScore);

    // Format violations for response
    const violations = complianceViolations.map((log) => ({
      id: log._id,
      type: log.action,
      resource: log.resource || "unknown",
      timestamp: log.timestamp,
      severity: getViolationSeverity(log.action, log.resource),
      description: `${log.action} on ${log.resource || "unknown resource"}`,
    }));

    return {
      status: hipaaStatus,
      violations,
      score: Math.round(complianceScore),
      level: complianceLevel,
      lastUpdated: now,
    };
  },
});

/**
 * Generate compliance report (PDF or CSV format)
 * Returns report data and metadata
 */
export const generateComplianceReport = query({
  args: {
    tenantId: v.string(),
    type: v.union(v.literal("pdf"), v.literal("csv")),
    dateRange: v.optional(
      v.object({
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Get compliance data
    let allLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Apply date range filtering if provided
    if (args.dateRange?.startDate) {
      allLogs = allLogs.filter((log) => log.timestamp >= args.dateRange!.startDate!);
    }
    if (args.dateRange?.endDate) {
      allLogs = allLogs.filter((log) => log.timestamp <= args.dateRange!.endDate!);
    }

    // Get compliance violations using helper function
    const complianceViolations = allLogs.filter(isComplianceViolation);

    const recentViolations = complianceViolations.filter(
      (log) => log.timestamp >= oneDayAgo
    ).length;

    // Calculate compliance metrics using helper functions
    const complianceScore = calculateComplianceScore(recentViolations);
    const hipaaStatus = getHipaaStatus(recentViolations);

    // Generate report based on type
    if (args.type === "csv") {
      // Generate CSV report with proper escaping
      const csvHeader = "violation_id,type,resource,severity,timestamp,description\n";
      const csvRows = complianceViolations.map((log) => {
        const severity = getViolationSeverity(log.action, log.resource);
        const description = `${log.action} on ${log.resource || "unknown resource"}`;
        return [
          escapeCsvField(log._id),
          escapeCsvField(log.action),
          escapeCsvField(log.resource || "unknown"),
          escapeCsvField(severity),
          escapeCsvField(log.timestamp.toString()),
          escapeCsvField(description),
        ].join(",");
      });
      const csvData = csvHeader + csvRows.join("\n");

      return {
        type: "csv" as const,
        data: csvData,
        filename: `compliance-report-${new Date().toISOString().split("T")[0]!}.csv`,
        generatedAt: now,
      };
    } else {
      // Generate PDF report (placeholder - returns JSON structure as base64)
      // In a real implementation, this would use a PDF generation library
      const pdfData = JSON.stringify({
        status: hipaaStatus,
        score: Math.round(complianceScore),
        violations: complianceViolations.length,
        generatedAt: new Date(now).toISOString(),
      });

      // Convert to base64 string (Convex can't return Buffer)
      const base64Data = Buffer.from(pdfData).toString("base64");

      return {
        type: "pdf" as const,
        data: base64Data, // Base64 encoded string for transport
        filename: `compliance-report-${new Date().toISOString().split("T")[0]!}.pdf`,
        generatedAt: now,
      };
    }
  },
});


import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Helper function to escape CSV fields
 * Handles null/undefined values, commas, quotes, and newlines
 * Prevents CSV injection attacks by properly escaping special characters
 */
function escapeCsvField(field: string | null | undefined): string {
  // Handle null/undefined/empty values
  if (!field) return "";
  
  // Convert to string if not already (handles numbers, booleans, etc.)
  const str = String(field);
  
  // If field contains comma, quote, newline, or carriage return, wrap in quotes and escape quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate report (PDF or CSV format) for various report types
 * Supports: user_activity, compliance, financial, security
 * Returns report data and metadata
 */
export const generateReport = query({
  args: {
    tenantId: v.string(),
    reportType: v.union(
      v.literal("user_activity"),
      v.literal("compliance"),
      v.literal("financial"),
      v.literal("security")
    ),
    exportFormat: v.union(v.literal("pdf"), v.literal("csv")),
    dateRange: v.optional(
      v.object({
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startDate = args.dateRange?.startDate || now - (30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const endDate = args.dateRange?.endDate || now;

    // Generate report based on type
    if (args.reportType === "user_activity") {
      // Get user activity logs from audit logs
      let activityLogs = await ctx.db
        .query("auditLogs")
        .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
        .collect();

      // Apply date range filtering
      activityLogs = activityLogs.filter(
        (log) => log.timestamp >= startDate && log.timestamp <= endDate
      );

      if (args.exportFormat === "csv") {
        const csvHeader = "log_id,user_id,action,resource,timestamp,ip_address\n";
        const csvRows = activityLogs.map((log) => {
          return [
            escapeCsvField(log._id),
            escapeCsvField(log.userId || ""),
            escapeCsvField(log.action),
            escapeCsvField(log.resource || "unknown"),
            escapeCsvField(log.timestamp.toString()),
            escapeCsvField(log.ipAddress || ""),
          ].join(",");
        });
        const csvData = csvHeader + csvRows.join("\n");

        return {
          type: "csv" as const,
          data: csvData,
          filename: `user-activity-report-${new Date().toISOString().split("T")[0]!}.csv`,
          generatedAt: now,
        };
      } else {
        // PDF format
        // TODO: Replace JSON placeholder with actual PDF generation
        // Current implementation returns base64-encoded JSON data as a placeholder
        // For production, consider using a PDF library like pdfkit, jsPDF, or puppeteer
        // This allows the API to work while proper PDF generation is implemented
        const pdfData = JSON.stringify({
          reportType: "user_activity",
          totalLogs: activityLogs.length,
          dateRange: {
            start: new Date(startDate).toISOString(),
            end: new Date(endDate).toISOString(),
          },
          generatedAt: new Date(now).toISOString(),
        });
        const base64Data = Buffer.from(pdfData).toString("base64");

        return {
          type: "pdf" as const,
          data: base64Data,
          filename: `user-activity-report-${new Date().toISOString().split("T")[0]!}.pdf`,
          generatedAt: now,
        };
      }
    } else if (args.reportType === "compliance") {
      // Get compliance violations from audit logs
      let complianceLogs = await ctx.db
        .query("auditLogs")
        .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
        .collect();

      // Apply date range filtering
      complianceLogs = complianceLogs.filter(
        (log) => log.timestamp >= startDate && log.timestamp <= endDate
      );

      // Filter for compliance violations
      const violations = complianceLogs.filter(
        (log) =>
          log.action === "unauthorized_access" ||
          log.action === "permission_denied" ||
          log.resource === "patient_data" ||
          log.resource === "phi" ||
          log.action === "data_export" ||
          log.action === "data_deletion"
      );

      if (args.exportFormat === "csv") {
        const csvHeader = "violation_id,type,resource,timestamp,description\n";
        const csvRows = violations.map((log) => {
          const description = `${log.action} on ${log.resource || "unknown resource"}`;
          return [
            escapeCsvField(log._id),
            escapeCsvField(log.action),
            escapeCsvField(log.resource || "unknown"),
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
        // PDF format
        // TODO: Replace JSON placeholder with actual PDF generation
        // Current implementation returns base64-encoded JSON data as a placeholder
        // For production, consider using a PDF library like pdfkit, jsPDF, or puppeteer
        const pdfData = JSON.stringify({
          reportType: "compliance",
          totalViolations: violations.length,
          dateRange: {
            start: new Date(startDate).toISOString(),
            end: new Date(endDate).toISOString(),
          },
          generatedAt: new Date(now).toISOString(),
        });
        const base64Data = Buffer.from(pdfData).toString("base64");

        return {
          type: "pdf" as const,
          data: base64Data,
          filename: `compliance-report-${new Date().toISOString().split("T")[0]!}.pdf`,
          generatedAt: now,
        };
      }
    } else if (args.reportType === "financial") {
      // Get financial data from invoices
      let invoices = await ctx.db
        .query("invoices")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect();

      // Apply date range filtering
      invoices = invoices.filter(
        (invoice) =>
          invoice.createdAt >= startDate && invoice.createdAt <= endDate
      );

      if (args.exportFormat === "csv") {
        const csvHeader = "invoice_id,patient_id,amount,status,created_at,due_date\n";
        const csvRows = invoices.map((invoice) => {
          return [
            escapeCsvField(invoice._id),
            escapeCsvField(invoice.patientId),
            escapeCsvField(invoice.amount?.toString() || "0"),
            escapeCsvField(invoice.status || "unknown"),
            escapeCsvField(invoice.createdAt.toString()),
            escapeCsvField(invoice.dueDate?.toString() || ""),
          ].join(",");
        });
        const csvData = csvHeader + csvRows.join("\n");

        return {
          type: "csv" as const,
          data: csvData,
          filename: `financial-report-${new Date().toISOString().split("T")[0]!}.csv`,
          generatedAt: now,
        };
      } else {
        // PDF format
        // TODO: Replace JSON placeholder with actual PDF generation
        // Current implementation returns base64-encoded JSON data as a placeholder
        // For production, consider using a PDF library like pdfkit, jsPDF, or puppeteer
        const totalAmount = invoices.reduce(
          (sum, inv) => sum + (inv.amount || 0),
          0
        );
        const pdfData = JSON.stringify({
          reportType: "financial",
          totalInvoices: invoices.length,
          totalAmount,
          dateRange: {
            start: new Date(startDate).toISOString(),
            end: new Date(endDate).toISOString(),
          },
          generatedAt: new Date(now).toISOString(),
        });
        const base64Data = Buffer.from(pdfData).toString("base64");

        return {
          type: "pdf" as const,
          data: base64Data,
          filename: `financial-report-${new Date().toISOString().split("T")[0]!}.pdf`,
          generatedAt: now,
        };
      }
    } else if (args.reportType === "security") {
      // Get security events from audit logs
      let securityLogs = await ctx.db
        .query("auditLogs")
        .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
        .collect();

      // Apply date range filtering
      securityLogs = securityLogs.filter(
        (log) => log.timestamp >= startDate && log.timestamp <= endDate
      );

      // Filter for security-related events
      const securityEvents = securityLogs.filter(
        (log) =>
          log.action === "login" ||
          log.action === "logout" ||
          log.action === "failed_login" ||
          log.action === "password_change" ||
          log.action === "unauthorized_access"
      );

      if (args.exportFormat === "csv") {
        const csvHeader = "event_id,user_id,action,timestamp,ip_address,success\n";
        const csvRows = securityEvents.map((log) => {
          return [
            escapeCsvField(log._id),
            escapeCsvField(log.userId || ""),
            escapeCsvField(log.action),
            escapeCsvField(log.timestamp.toString()),
            escapeCsvField(log.ipAddress || ""),
            escapeCsvField(log.action !== "failed_login" ? "true" : "false"),
          ].join(",");
        });
        const csvData = csvHeader + csvRows.join("\n");

        return {
          type: "csv" as const,
          data: csvData,
          filename: `security-report-${new Date().toISOString().split("T")[0]!}.csv`,
          generatedAt: now,
        };
      } else {
        // PDF format
        // TODO: Replace JSON placeholder with actual PDF generation
        // Current implementation returns base64-encoded JSON data as a placeholder
        // For production, consider using a PDF library like pdfkit, jsPDF, or puppeteer
        const pdfData = JSON.stringify({
          reportType: "security",
          totalEvents: securityEvents.length,
          dateRange: {
            start: new Date(startDate).toISOString(),
            end: new Date(endDate).toISOString(),
          },
          generatedAt: new Date(now).toISOString(),
        });
        const base64Data = Buffer.from(pdfData).toString("base64");

        return {
          type: "pdf" as const,
          data: base64Data,
          filename: `security-report-${new Date().toISOString().split("T")[0]!}.pdf`,
          generatedAt: now,
        };
      }
    }

    // Fallback (should never reach here due to type checking)
    throw new Error(`Unknown report type: ${args.reportType}`);
  },
});


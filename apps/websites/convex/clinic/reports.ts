import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import type { AuthorizationResult } from "../utils/authorization";

/**
 * Generate report (PDF or CSV format) for various report types
 * Owner-only action that wraps the admin reports generation
 * Supports: user_activity, compliance, financial, security
 * Returns report data and metadata
 */
export const generateReport = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(), // Email of the requesting user (for authorization)
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
  handler: async (ctx, args): Promise<unknown> => {
    // Verify owner access via query (actions can't call verifyOwnerAccess directly)
    const authResult: AuthorizationResult = await ctx.runQuery(
      api.utils.authorization.verifyOwnerAccessQuery,
      {
        userEmail: args.userEmail,
        tenantId: args.tenantId,
      }
    );
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized - Owner access required");
    }

    // Call the existing admin reports generation function
    // This reuses the existing report generation logic
    const result: unknown = await ctx.runQuery(api.admin.reports.generateReport, {
      tenantId: args.tenantId,
      reportType: args.reportType,
      exportFormat: args.exportFormat,
      dateRange: args.dateRange,
    });

    return result;
  },
});


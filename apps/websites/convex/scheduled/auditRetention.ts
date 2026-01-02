import { cronJobs } from "convex/server";
import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Audit Log Retention Scheduled Jobs
 * 
 * Runs periodic cleanup operations to archive and delete old audit logs
 * based on retention policies configured per tenant.
 * 
 * Schedule:
 * - Daily at 2 AM UTC: Archive old logs (if autoArchive enabled)
 * - Weekly on Sunday at 3 AM UTC: Delete archived logs (if autoDelete enabled)
 * 
 * Security:
 * - Uses internal actions to ensure only scheduled jobs can trigger cleanup
 * - Validates tenant isolation
 * - Respects tenant-specific retention policies
 * - Logs all cleanup operations for audit trail
 * - Dry-run mode available for testing
 * 
 * HIPAA Compliance:
 * - Ensures minimum 6-year retention period (45 CFR § 164.530(j))
 * - Archives logs before deletion for compliance audits
 * - Maintains audit trail of all retention operations
 */

// Schedule archive job to run daily at 2 AM UTC
export const crons = cronJobs();
crons.cron(
  "archive-audit-logs",
  "0 2 * * *", // Daily at 2 AM UTC
  internal.scheduled.auditRetention.archiveAllTenantsLogs
);

// Schedule delete job to run weekly on Sunday at 3 AM UTC
crons.cron(
  "delete-archived-logs",
  "0 3 * * 0", // Weekly on Sunday at 3 AM UTC
  internal.scheduled.auditRetention.deleteAllTenantsArchivedLogs
);

// Schedule session activity cleanup to run daily at 4 AM UTC
crons.cron(
  "cleanup-session-activity",
  "0 4 * * *", // Daily at 4 AM UTC
  internal.scheduled.auditRetention.cleanupOldSessionActivity
);

/**
 * Internal query to get all active tenants
 * Used by scheduled jobs to process retention policies
 */
export const getAllActiveTenants = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.db
      .query("tenants")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return tenants.map((tenant) => ({
      _id: tenant._id,
      id: tenant.id,
    }));
  },
});

/**
 * Internal action to archive old logs for all tenants
 * Called by the scheduled cron job
 */
export const archiveAllTenantsLogs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting audit log archival job...");

    try {
      // Get all active tenants
      const tenants = await ctx.runQuery(internal.scheduled.auditRetention.getAllActiveTenants);

      if (!tenants || tenants.length === 0) {
        console.log("No active tenants found");
        return { tenantsProcessed: 0, totalArchived: 0, errors: 0 };
      }

      console.log(`Found ${tenants.length} active tenant(s)`);

      let tenantsProcessed = 0;
      let totalArchived = 0;
      let errors = 0;

      // Process each tenant
      for (const tenant of tenants) {
        try {
          // Archive logs for this tenant (dry-run disabled for scheduled job)
          const result = await ctx.runMutation(internal.audit.archiveOldLogsInternal, {
            tenantId: tenant.id,
            dryRun: false,
          });

          if (result.archived > 0) {
            console.log(
              `Archived ${result.archived} logs for tenant ${tenant.id}`
            );
            totalArchived += result.archived;
          }

          tenantsProcessed++;
        } catch (error) {
          console.error(
            `Error archiving logs for tenant ${tenant.id}:`,
            error
          );
          errors++;
          // Continue with other tenants even if one fails
        }
      }

      console.log(
        `Audit log archival completed: ${tenantsProcessed} tenants processed, ${totalArchived} logs archived, ${errors} errors`
      );
      return {
        tenantsProcessed,
        totalArchived,
        errors,
      };
    } catch (error) {
      console.error("Error in audit log archival job:", error);
      throw error;
    }
  },
});

/**
 * Internal action to delete archived logs for all tenants
 * Called by the scheduled cron job
 */
export const deleteAllTenantsArchivedLogs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting archived audit log deletion job...");

    try {
      // Get all active tenants
      const tenants = await ctx.runQuery(internal.scheduled.auditRetention.getAllActiveTenants);

      if (!tenants || tenants.length === 0) {
        console.log("No active tenants found");
        return { tenantsProcessed: 0, totalDeleted: 0, errors: 0 };
      }

      console.log(`Found ${tenants.length} active tenant(s)`);

      let tenantsProcessed = 0;
      let totalDeleted = 0;
      let errors = 0;

      // Process each tenant
      for (const tenant of tenants) {
        try {
          // Delete archived logs for this tenant (dry-run disabled for scheduled job)
          const result = await ctx.runMutation(
            internal.audit.deleteArchivedLogsInternal,
            {
              tenantId: tenant.id,
              dryRun: false,
            }
          );

          if (result.deleted > 0) {
            console.log(
              `Deleted ${result.deleted} archived logs for tenant ${tenant.id}`
            );
            totalDeleted += result.deleted;
          } else if (result.message) {
            console.log(
              `Skipped tenant ${tenant.id}: ${result.message}`
            );
          }

          tenantsProcessed++;
        } catch (error) {
          console.error(
            `Error deleting archived logs for tenant ${tenant.id}:`,
            error
          );
          errors++;
          // Continue with other tenants even if one fails
        }
      }

      console.log(
        `Archived audit log deletion completed: ${tenantsProcessed} tenants processed, ${totalDeleted} logs deleted, ${errors} errors`
      );
      return {
        tenantsProcessed,
        totalDeleted,
        errors,
      };
    } catch (error) {
      console.error("Error in archived audit log deletion job:", error);
      throw error;
    }
  },
});

/**
 * Internal action to cleanup old session activity records for all tenants
 * Called by the scheduled cron job
 * Uses default retention period of 90 days for session activity
 */
export const cleanupOldSessionActivity = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting session activity cleanup job...");

    try {
      // Get all active tenants
      const tenants = await ctx.runQuery(internal.scheduled.auditRetention.getAllActiveTenants);

      if (!tenants || tenants.length === 0) {
        console.log("No active tenants found");
        return { tenantsProcessed: 0, totalCleaned: 0, errors: 0 };
      }

      console.log(`Found ${tenants.length} active tenant(s)`);

      let tenantsProcessed = 0;
      let totalCleaned = 0;
      let errors = 0;

      // Default retention period: 90 days for session activity
      const retentionDays = 90;

      // Process each tenant
      for (const tenant of tenants) {
        try {
          // Clean up session activity for this tenant
          const result = await ctx.runMutation(internal.sessions.cleanupOldSessionActivityInternal, {
            tenantId: tenant.id,
            retentionDays: retentionDays,
          });

          if (result.cleanedCount > 0) {
            console.log(
              `Cleaned ${result.cleanedCount} session activity records for tenant ${tenant.id}`
            );
            totalCleaned += result.cleanedCount;
          }

          tenantsProcessed++;
        } catch (error) {
          console.error(
            `Error cleaning session activity for tenant ${tenant.id}:`,
            error
          );
          errors++;
          // Continue with other tenants even if one fails
        }
      }

      console.log(
        `Session activity cleanup completed: ${tenantsProcessed} tenants processed, ${totalCleaned} records cleaned, ${errors} errors`
      );
      return {
        tenantsProcessed,
        totalCleaned,
        errors,
      };
    } catch (error) {
      console.error("Error in session activity cleanup job:", error);
      throw error;
    }
  },
});


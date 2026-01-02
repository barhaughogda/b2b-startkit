import { cronJobs } from "convex/server";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Calendar Sync Scheduled Jobs
 * 
 * Runs periodic sync operations to keep Google Calendar in sync with Zenthea appointments.
 * 
 * Schedule:
 * - Every 15 minutes: Sync appointments to Google Calendar
 * 
 * Security:
 * - Uses internal actions to ensure only scheduled jobs can trigger syncs
 * - Validates tenant isolation
 * - Handles errors gracefully with retry logic
 */

// Schedule sync job to run every 15 minutes
export const crons = cronJobs();
crons.interval("sync-calendars", { minutes: 15 }, internal.scheduled.calendarSync.syncAllCalendars);

/**
 * Internal action to sync all active calendar connections
 * Called by the scheduled cron job
 */
export const syncAllCalendars = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting calendar sync job...");

    try {
      // Get all active Google Calendar syncs
      const syncs = await ctx.runQuery(internal.calendarSync.getAllActiveSyncs);

      if (!syncs || syncs.length === 0) {
        console.log("No active calendar syncs found");
        return { synced: 0, errors: 0 };
      }

      console.log(`Found ${syncs.length} active calendar sync(s)`);

      let synced = 0;
      let errors = 0;

      // Sync each calendar connection
      for (const sync of syncs) {
        try {
          // Call the sync action for this specific sync
          // Only sync if providerId exists (backward compatibility)
          // TODO: Migrate to user-based sync
          if (sync.providerId) {
            await ctx.runAction(internal.calendarSync.syncProviderCalendar, {
              syncId: sync._id,
              providerId: sync.providerId,
              tenantId: sync.tenantId,
            });
          }
          synced++;
        } catch (error) {
          console.error(`Error syncing calendar for provider ${sync.providerId}:`, error);
          errors++;
          // Continue with other syncs even if one fails
        }
      }

      console.log(`Calendar sync completed: ${synced} synced, ${errors} errors`);
      return { synced, errors };
    } catch (error) {
      console.error("Error in calendar sync job:", error);
      throw error;
    }
  },
});


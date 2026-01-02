/**
 * Convex Cron Jobs
 * 
 * Scheduled tasks that run periodically to maintain system health.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Clean up expired slot locks every 5 minutes
 * 
 * Slot locks are temporary holds on appointment time slots that prevent
 * double-booking during the booking process. They automatically expire
 * after 5 minutes, but this cron job ensures orphaned locks are cleaned up.
 */
crons.interval(
  "cleanup-expired-slot-locks",
  { minutes: 5 },
  internal.slotLocks.cleanupExpiredLocks
);

export default crons;

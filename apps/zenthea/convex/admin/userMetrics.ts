import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get user-related metrics for admin dashboard
 * Returns active users, new users, role breakdown, and login statistics
 */
export const getUserMetrics = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Get all users for this tenant
    const users = await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Calculate active users (isActive = true)
    const activeUsers = users.filter((u) => u.isActive).length;

    // Calculate new users (created in last 30 days)
    const newUsers = users.filter(
      (u) => u.createdAt >= thirtyDaysAgo
    ).length;

    // Calculate users by role breakdown
    const usersByRole = users.reduce(
      (acc, user) => {
        const role = user.role || "unknown";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate last login statistics
    const lastLoginStats = {
      last24Hours: users.filter(
        (u) => u.lastLogin && u.lastLogin >= oneDayAgo
      ).length,
      last7Days: users.filter(
        (u) => u.lastLogin && u.lastLogin >= sevenDaysAgo
      ).length,
      last30Days: users.filter(
        (u) => u.lastLogin && u.lastLogin >= thirtyDaysAgo
      ).length,
      neverLoggedIn: users.filter((u) => !u.lastLogin).length,
    };

    // Ensure all roles are represented in the breakdown
    const roleBreakdown = {
      admin: usersByRole.admin || 0,
      provider: usersByRole.provider || 0,
      demo: usersByRole.demo || 0,
      patient: usersByRole.patient || 0,
    };

    return {
      activeUsers,
      totalUsers: users.length,
      newUsers,
      usersByRole: roleBreakdown,
      lastLoginStats,
      lastUpdated: now,
    };
  },
});


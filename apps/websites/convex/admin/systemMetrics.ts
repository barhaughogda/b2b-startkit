import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get system-wide metrics for admin dashboard
 * Returns totals for users, patients, appointments, and system health status
 */
export const getSystemMetrics = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all data in parallel for better performance
    const [users, patients, appointments] = await Promise.all([
      // Get all users for this tenant
      ctx.db
        .query("users")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      
      // Get all patients for this tenant
      ctx.db
        .query("patients")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      
      // Get all appointments for this tenant
      ctx.db
        .query("appointments")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
    ]);

    // Calculate totals
    const totalUsers = users.length;
    const totalPatients = patients.length;
    const totalAppointments = appointments.length;

    // Calculate active users (users with isActive = true)
    const activeUsers = users.filter((u) => u.isActive).length;

    // Calculate system health
    // Health is based on: active users ratio, recent activity, and data consistency
    const activeUserRatio = totalUsers > 0 ? activeUsers / totalUsers : 0;
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Check for recent activity (users who logged in recently)
    const recentActiveUsers = users.filter(
      (u) => u.lastLogin && u.lastLogin >= oneWeekAgo
    ).length;

    // Determine system health status
    let systemHealth: "healthy" | "warning" | "critical" = "healthy";
    if (activeUserRatio < 0.5 || recentActiveUsers === 0) {
      systemHealth = "critical";
    } else if (activeUserRatio < 0.8 || recentActiveUsers < totalUsers * 0.3) {
      systemHealth = "warning";
    }

    return {
      totalUsers,
      totalPatients,
      totalAppointments,
      activeUsers,
      activeUserRatio: Math.round(activeUserRatio * 100),
      recentActiveUsers,
      systemHealth,
      lastUpdated: now,
    };
  },
});


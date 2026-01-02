import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get comprehensive analytics data for admin dashboard
 * Returns patient growth, appointment trends, revenue metrics, user activity, and performance data
 * Supports date range filtering for chart visualization
 */
export const getAnalytics = query({
  args: {
    tenantId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startDate = args.startDate || (now - (30 * 24 * 60 * 60 * 1000)); // Default: 30 days ago
    const endDate = args.endDate || now;

    // Get all data in parallel for better performance
    const [patients, appointments, invoices, users] = await Promise.all([
      // Get patients for date range
      ctx.db
        .query("patients")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .filter((q) =>
          q.and(
            q.gte(q.field("createdAt"), startDate),
            q.lte(q.field("createdAt"), endDate)
          )
        )
        .collect(),

      // Get appointments for date range
      ctx.db
        .query("appointments")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .filter((q) =>
          q.and(
            q.gte(q.field("scheduledAt"), startDate),
            q.lte(q.field("scheduledAt"), endDate)
          )
        )
        .collect(),

      // Get invoices for date range
      ctx.db
        .query("invoices")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .filter((q) =>
          q.and(
            q.gte(q.field("createdAt"), startDate),
            q.lte(q.field("createdAt"), endDate)
          )
        )
        .collect(),

      // Get users for activity tracking
      ctx.db
        .query("users")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
    ]);

    // Calculate daily metrics for patient growth
    const daysDiff = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
    const patientGrowth: Array<{ date: string; count: number; cumulative: number }> = [];
    let cumulativePatients = 0;

    for (let i = 0; i < daysDiff; i++) {
      const dayStart = startDate + (i * 24 * 60 * 60 * 1000);
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);

      const dayPatients = patients.filter(
        (p) => p.createdAt >= dayStart && p.createdAt < dayEnd
      );
      cumulativePatients += dayPatients.length;

      patientGrowth.push({
        date: new Date(dayStart).toISOString().split("T")[0]!,
        count: dayPatients.length,
        cumulative: cumulativePatients,
      });
    }

    // Calculate daily metrics for appointment trends
    const appointmentTrends: Array<{
      date: string;
      scheduled: number;
      completed: number;
      cancelled: number;
    }> = [];

    for (let i = 0; i < daysDiff; i++) {
      const dayStart = startDate + (i * 24 * 60 * 60 * 1000);
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);

      const dayAppointments = appointments.filter(
        (a) => a.scheduledAt >= dayStart && a.scheduledAt < dayEnd
      );

      appointmentTrends.push({
        date: new Date(dayStart).toISOString().split("T")[0]!,
        scheduled: dayAppointments.length,
        completed: dayAppointments.filter((a) => a.status === "completed").length,
        cancelled: dayAppointments.filter((a) => a.status === "cancelled").length,
      });
    }

    // Calculate revenue metrics
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidRevenue = invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.amount, 0);
    const pendingRevenue = invoices
      .filter((inv) => inv.status === "pending")
      .reduce((sum, inv) => sum + inv.amount, 0);
    const overdueRevenue = invoices
      .filter((inv) => inv.status === "overdue")
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Calculate daily revenue
    const dailyRevenue: Array<{ date: string; amount: number }> = [];
    for (let i = 0; i < daysDiff; i++) {
      const dayStart = startDate + (i * 24 * 60 * 60 * 1000);
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);

      const dayInvoices = invoices.filter(
        (inv) => inv.createdAt >= dayStart && inv.createdAt < dayEnd
      );
      const dayAmount = dayInvoices
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + inv.amount, 0);

      dailyRevenue.push({
        date: new Date(dayStart).toISOString().split("T")[0]!,
        amount: dayAmount,
      });
    }

    // Calculate user activity metrics
    const userActivity: Array<{
      date: string;
      activeUsers: number;
      newUsers: number;
      logins: number;
    }> = [];

    for (let i = 0; i < daysDiff; i++) {
      const dayStart = startDate + (i * 24 * 60 * 60 * 1000);
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);

      // Count new users created on this day
      const dayNewUsers = users.filter(
        (u) => u.createdAt >= dayStart && u.createdAt < dayEnd
      ).length;

      // Count active users who logged in on this day (using lastLogin field)
      const dayActiveUsers = users.filter(
        (u) => u.lastLogin && u.lastLogin >= dayStart && u.lastLogin < dayEnd
      ).length;

      // Estimate logins based on active users (each active user likely logged in at least once)
      // This is a reasonable estimate - actual login count would require audit log queries
      const dayLogins = dayActiveUsers > 0 ? Math.max(dayActiveUsers, dayNewUsers) : 0;

      userActivity.push({
        date: new Date(dayStart).toISOString().split("T")[0]!,
        activeUsers: dayActiveUsers,
        newUsers: dayNewUsers,
        logins: dayLogins,
      });
    }

    // Calculate performance metrics (placeholder - would need actual performance tracking)
    const performance = {
      averageResponseTime: 150, // milliseconds - placeholder
      systemUptime: 99.9, // percentage - placeholder
      errorRate: 0.1, // percentage - placeholder
      requestCount: appointments.length + patients.length, // Placeholder
    };

    return {
      patientGrowth,
      appointmentTrends,
      revenue: {
        total: totalRevenue,
        paid: paidRevenue,
        pending: pendingRevenue,
        overdue: overdueRevenue,
        dailyRevenue,
      },
      userActivity,
      performance,
      period: {
        startDate,
        endDate,
      },
    };
  },
});


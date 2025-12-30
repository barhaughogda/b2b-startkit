import { query } from "./_generated/server";
import { v } from "convex/values";

// Get comprehensive dashboard data (real-time)
export const getDashboardData = query({
  args: { 
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Get all data in parallel for better performance
    const [
      patients,
      providers,
      appointments,
      medicalRecords,
      recentPatients,
      recentProviders,
      todaysAppointments,
      upcomingAppointments
    ] = await Promise.all([
      // Get all patients for this tenant
      ctx.db
        .query("patients")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      
      // Get all providers for this tenant
      ctx.db
        .query("providers")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      
      // Get all appointments for this tenant
      ctx.db
        .query("appointments")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      
      // Get all medical records for this tenant
      ctx.db
        .query("medicalRecords")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      
      // Get recent patients (last 7 days)
      ctx.db
        .query("patients")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .filter((q) => q.gte(q.field("createdAt"), oneWeekAgo))
        .order("desc")
        .take(5),
      
      // Get recent providers (last 7 days)
      ctx.db
        .query("providers")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .filter((q) => q.gte(q.field("createdAt"), oneWeekAgo))
        .order("desc")
        .take(5),
      
      // Get today's appointments
      ctx.db
        .query("appointments")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .filter((q) => {
          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);
          return q.and(
            q.gte(q.field("scheduledAt"), startOfDay.getTime()),
            q.lte(q.field("scheduledAt"), endOfDay.getTime())
          );
        })
        .collect(),
      
      // Get upcoming appointments (next 7 days)
      ctx.db
        .query("appointments")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .filter((q) => {
          const nextWeek = now + (7 * 24 * 60 * 60 * 1000);
          return q.and(
            q.gte(q.field("scheduledAt"), now),
            q.lte(q.field("scheduledAt"), nextWeek)
          );
        })
        .order("asc")
        .take(10)
    ]);
    
    // Calculate statistics
    const patientStats = {
      total: patients.length,
      recent: patients.filter(p => p.createdAt >= oneWeekAgo).length,
      withEmail: patients.filter(p => p.email).length,
      withPhone: patients.filter(p => p.phone).length,
      withInsurance: patients.filter(p => p.insurance).length,
    };
    
    const providerStats = {
      total: providers.length,
      recent: providers.filter(p => p.createdAt >= oneWeekAgo).length,
      specialties: Array.from(new Set(providers.map(p => p.specialty))).length,
      specialtyBreakdown: providers.reduce((acc, provider) => {
        acc[provider.specialty] = (acc[provider.specialty] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
    
    const appointmentStats = {
      total: appointments.length,
      today: todaysAppointments.length,
      upcoming: upcomingAppointments.length,
      statusBreakdown: appointments.reduce((acc, appointment) => {
        acc[appointment.status] = (acc[appointment.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      typeBreakdown: appointments.reduce((acc, appointment) => {
        acc[appointment.type] = (acc[appointment.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
    
    const medicalRecordStats = {
      total: medicalRecords.length,
      recent: medicalRecords.filter(r => r.createdAt >= oneWeekAgo).length,
      withMedications: medicalRecords.filter(r => r.recordType === 'medication').length,
      uniqueDiagnoses: Array.from(new Set(medicalRecords.filter(r => r.recordType === 'diagnosis').map(r => r.title))).length,
    };
    
    // Get activity feed (recent changes)
    const activityFeed = [
      ...recentPatients.map(patient => ({
        type: "patient_created" as const,
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName}`,
        timestamp: patient.createdAt,
        data: patient,
      })),
      ...recentProviders.map(provider => ({
        type: "provider_created" as const,
        id: provider._id,
        name: `Dr. ${provider.firstName} ${provider.lastName}`,
        timestamp: provider.createdAt,
        data: provider,
      })),
      ...appointments
        .filter(a => a.createdAt >= oneWeekAgo)
        .map(appointment => ({
          type: "appointment_created" as const,
          id: appointment._id,
          name: `Appointment scheduled`,
          timestamp: appointment.createdAt,
          data: appointment,
        })),
      ...medicalRecords
        .filter(r => r.createdAt >= oneWeekAgo)
        .map(record => ({
          type: "medical_record_created" as const,
          id: record._id,
          name: `Medical record created`,
          timestamp: record.createdAt,
          data: record,
        }))
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
    
    return {
      tenantId: args.tenantId,
      lastUpdated: now,
      stats: {
        patients: patientStats,
        providers: providerStats,
        appointments: appointmentStats,
        medicalRecords: medicalRecordStats,
      },
      recent: {
        patients: recentPatients,
        providers: recentProviders,
        appointments: todaysAppointments,
        upcomingAppointments,
      },
      activityFeed,
      summary: {
        totalPatients: patientStats.total,
        totalProviders: providerStats.total,
        totalAppointments: appointmentStats.total,
        totalMedicalRecords: medicalRecordStats.total,
        todaysAppointments: appointmentStats.today,
        upcomingAppointments: appointmentStats.upcoming,
      }
    };
  },
});

// Get real-time notifications (alerts and updates)
export const getNotifications = query({
  args: { 
    tenantId: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const notifications = [];
    
    // Get today's appointments
    const todaysAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        return q.and(
          q.gte(q.field("scheduledAt"), startOfDay.getTime()),
          q.lte(q.field("scheduledAt"), endOfDay.getTime())
        );
      })
      .collect();
    
    // Get overdue appointments (scheduled in the past but not completed)
    const overdueAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => 
        q.and(
          q.lt(q.field("scheduledAt"), now),
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();
    
    // Get recent activity
    const recentActivity = await ctx.db
      .query("patients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.gte(q.field("createdAt"), oneDayAgo))
      .collect();
    
    // Build notifications
    if (todaysAppointments.length > 0) {
      notifications.push({
        type: "info" as const,
        title: "Today's Appointments",
        message: `${todaysAppointments.length} appointment(s) scheduled for today`,
        timestamp: now,
        data: { count: todaysAppointments.length, appointments: todaysAppointments },
      });
    }
    
    if (overdueAppointments.length > 0) {
      notifications.push({
        type: "warning" as const,
        title: "Overdue Appointments",
        message: `${overdueAppointments.length} appointment(s) are overdue`,
        timestamp: now,
        data: { count: overdueAppointments.length, appointments: overdueAppointments },
      });
    }
    
    if (recentActivity.length > 0) {
      notifications.push({
        type: "success" as const,
        title: "Recent Activity",
        message: `${recentActivity.length} new patient(s) registered today`,
        timestamp: now,
        data: { count: recentActivity.length, patients: recentActivity },
      });
    }
    
    return {
      tenantId: args.tenantId,
      notifications,
      lastChecked: now,
    };
  },
});

// Get real-time analytics data
export const getAnalytics = query({
  args: { 
    tenantId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startDate = args.startDate || (now - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
    const endDate = args.endDate || now;
    
    // Get data for the specified date range
    const [appointments, patients, medicalRecords] = await Promise.all([
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
      
      ctx.db
        .query("medicalRecords")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .filter((q) => 
          q.and(
            q.gte(q.field("createdAt"), startDate),
            q.lte(q.field("createdAt"), endDate)
          )
        )
        .collect(),
    ]);
    
    // Calculate daily metrics
    const dailyMetrics = [];
    const daysDiff = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
    
    for (let i = 0; i < daysDiff; i++) {
      const dayStart = startDate + (i * 24 * 60 * 60 * 1000);
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);
      
      const dayAppointments = appointments.filter(a => 
        a.scheduledAt >= dayStart && a.scheduledAt < dayEnd
      );
      const dayPatients = patients.filter(p => 
        p.createdAt >= dayStart && p.createdAt < dayEnd
      );
      const dayRecords = medicalRecords.filter(r => 
        r.createdAt >= dayStart && r.createdAt < dayEnd
      );
      
      dailyMetrics.push({
        date: new Date(dayStart).toISOString().split('T')[0]!,
        appointments: dayAppointments.length,
        newPatients: dayPatients.length,
        medicalRecords: dayRecords.length,
        completedAppointments: dayAppointments.filter(a => a.status === 'completed').length,
      });
    }
    
    return {
      tenantId: args.tenantId,
      period: { startDate, endDate },
      dailyMetrics,
      totals: {
        appointments: appointments.length,
        newPatients: patients.length,
        medicalRecords: medicalRecords.length,
        completedAppointments: appointments.filter(a => a.status === 'completed').length,
      },
      trends: {
        averageAppointmentsPerDay: appointments.length / daysDiff,
        averageNewPatientsPerDay: patients.length / daysDiff,
        completionRate: appointments.length > 0 
          ? (appointments.filter(a => a.status === 'completed').length / appointments.length) * 100 
          : 0,
      }
    };
  },
});

// Get provider capacity metrics (for settings)
export const getProviderCapacityMetrics = query({
  args: {
    tenantId: v.string(),
    daysAhead: v.optional(v.number()), // Default 30 days
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const daysAhead = args.daysAhead || 30;
    const endDate = now + (daysAhead * 24 * 60 * 60 * 1000);

    // Get all providers
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Get all appointments in the time range
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) =>
        q.and(
          q.gte(q.field("scheduledAt"), now),
          q.lte(q.field("scheduledAt"), endDate)
        )
      )
      .collect();

    // Get provider availability
    const availability = await ctx.db
      .query("providerAvailability")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Calculate capacity metrics per provider
    const providerMetrics = providers.map((provider) => {
      const providerAppointments = appointments.filter(
        (apt) => apt.providerId === provider._id
      );
      const providerAvailability = availability.filter(
        (avail) => avail.providerId === provider._id && avail.isRecurring
      );

      // Calculate available slots (simplified - would need more complex logic)
      const availableSlots = providerAvailability.length * 8; // Rough estimate
      const bookedSlots = providerAppointments.filter(
        (apt) => apt.status !== "cancelled"
      ).length;
      const utilization = availableSlots > 0 
        ? (bookedSlots / availableSlots) * 100 
        : 0;

      return {
        providerId: provider._id,
        providerName: `${provider.firstName} ${provider.lastName}`,
        availableSlots,
        bookedSlots,
        utilization: Math.round(utilization),
        workloadStatus: utilization > 90 ? "high" : utilization > 70 ? "medium" : "low",
        availableSlotsRemaining: Math.max(0, availableSlots - bookedSlots),
      };
    });

    return {
      tenantId: args.tenantId,
      period: { start: now, end: endDate },
      providerMetrics,
      summary: {
        totalProviders: providers.length,
        totalAvailableSlots: providerMetrics.reduce((sum, m) => sum + m.availableSlots, 0),
        totalBookedSlots: providerMetrics.reduce((sum, m) => sum + m.bookedSlots, 0),
        averageUtilization: providerMetrics.length > 0
          ? Math.round(providerMetrics.reduce((sum, m) => sum + m.utilization, 0) / providerMetrics.length)
          : 0,
      },
    };
  },
});

// Get provider availability status (for settings)
export const getProviderAvailabilityStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date(now);
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const currentDay = dayNames[dayOfWeek];

    // Get all providers
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Get availability for today
    const todayAvailability = await ctx.db
      .query("providerAvailability")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) =>
        q.or(
          q.and(
            q.eq(q.field("isRecurring"), true),
            q.eq(q.field("dayOfWeek"), currentDay)
          ),
          q.and(
            q.eq(q.field("isRecurring"), false),
            q.gte(q.field("overrideDate"), now - 24 * 60 * 60 * 1000),
            q.lte(q.field("overrideDate"), now + 24 * 60 * 60 * 1000)
          )
        )
      )
      .collect();

    const providerStatus = providers.map((provider) => {
      const hasAvailability = todayAvailability.some(
        (avail) => avail.providerId === provider._id
      );

      return {
        providerId: provider._id,
        providerName: `${provider.firstName} ${provider.lastName}`,
        isAvailable: hasAvailability,
        status: hasAvailability ? "available" : "unavailable",
      };
    });

    return {
      tenantId: args.tenantId,
      date: now,
      providerStatus,
      summary: {
        totalProviders: providers.length,
        availableCount: providerStatus.filter((p) => p.isAvailable).length,
        unavailableCount: providerStatus.filter((p) => !p.isAvailable).length,
      },
    };
  },
});

// Get appointment conflicts (for settings)
export const getAppointmentConflicts = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get all appointments
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.gte(q.field("scheduledAt"), now))
      .collect();

    const conflicts = [];

    // Check for overlapping appointments with same provider
    for (let i = 0; i < appointments.length; i++) {
      for (let j = i + 1; j < appointments.length; j++) {
        const apt1 = appointments[i];
        const apt2 = appointments[j];
        
        if (!apt1 || !apt2) continue;

        // Same provider
        if (apt1.providerId === apt2.providerId) {
          // Check if appointments overlap (assuming 30 min default duration)
          const duration = 30 * 60 * 1000; // 30 minutes in ms
          const apt1End = apt1.scheduledAt + duration;
          const apt2End = apt2.scheduledAt + duration;

          if (
            (apt1.scheduledAt >= apt2.scheduledAt && apt1.scheduledAt < apt2End) ||
            (apt2.scheduledAt >= apt1.scheduledAt && apt2.scheduledAt < apt1End)
          ) {
            conflicts.push({
              type: "overlapping",
              appointment1Id: apt1._id,
              appointment2Id: apt2._id,
              providerId: apt1.providerId,
              scheduledAt: apt1.scheduledAt,
              severity: "high",
            });
          }
        }
      }
    }

    return {
      tenantId: args.tenantId,
      conflicts,
      summary: {
        totalConflicts: conflicts.length,
        highSeverity: conflicts.filter((c) => c.severity === "high").length,
      },
    };
  },
});

// Get clinic rating (aggregate from all provider testimonials)
export const getClinicRating = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all published testimonials for this tenant
    const testimonials = await ctx.db
      .query("providerTestimonials")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    if (testimonials.length === 0) {
      return {
        tenantId: args.tenantId,
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalRating = testimonials.reduce((sum, t) => sum + t.rating, 0);
    const averageRating = totalRating / testimonials.length;

    const ratingDistribution = testimonials.reduce(
      (acc, t) => {
        acc[t.rating] = (acc[t.rating] || 0) + 1;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
    );

    return {
      tenantId: args.tenantId,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: testimonials.length,
      ratingDistribution,
    };
  },
});

// Get provider ratings (individual provider ratings)
export const getProviderRatings = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all providers
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Get all published testimonials
    const testimonials = await ctx.db
      .query("providerTestimonials")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();

    // Get provider profiles to link testimonials
    const providerProfiles = await ctx.db
      .query("providerProfiles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const providerRatings = providers.map((provider) => {
      // Find provider profile
      const profile = providerProfiles.find(
        (p) => p.providerId === provider._id
      );

      if (!profile) {
        return {
          providerId: provider._id,
          providerName: `${provider.firstName} ${provider.lastName}`,
          averageRating: 0,
          totalRatings: 0,
        };
      }

      // Get testimonials for this provider
      const providerTestimonials = testimonials.filter(
        (t) => t.providerProfileId === profile._id
      );

      if (providerTestimonials.length === 0) {
        return {
          providerId: provider._id,
          providerName: `${provider.firstName} ${provider.lastName}`,
          averageRating: 0,
          totalRatings: 0,
        };
      }

      const totalRating = providerTestimonials.reduce(
        (sum, t) => sum + t.rating,
        0
      );
      const averageRating = totalRating / providerTestimonials.length;

      return {
        providerId: provider._id,
        providerName: `${provider.firstName} ${provider.lastName}`,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: providerTestimonials.length,
      };
    });

    // Sort by rating (highest first)
    providerRatings.sort((a, b) => b.averageRating - a.averageRating);

    return {
      tenantId: args.tenantId,
      providerRatings,
      summary: {
        totalProviders: providers.length,
        providersWithRatings: providerRatings.filter((p) => p.totalRatings > 0).length,
        topRatedProvider: providerRatings[0] || null,
      },
    };
  },
});

// Get billing alerts (for settings)
export const getBillingAlerts = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get all invoices
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Calculate metrics
    const overdueInvoices = invoices.filter(
      (inv) => inv.status === "overdue"
    );
    const pendingInvoices = invoices.filter(
      (inv) => inv.status === "pending" && inv.dueDate < now
    );
    const outstandingBalance = invoices
      .filter((inv) => inv.status === "pending" || inv.status === "overdue")
      .reduce((sum, inv) => sum + inv.amount, 0);

    const recentPayments = invoices
      .filter(
        (inv) =>
          inv.status === "paid" && inv.paidDate && inv.paidDate >= thirtyDaysAgo
      )
      .reduce((sum, inv) => sum + inv.amount, 0);

    return {
      tenantId: args.tenantId,
      alerts: {
        overdueCount: overdueInvoices.length,
        pendingCount: pendingInvoices.length,
        outstandingBalance: outstandingBalance / 100, // Convert cents to dollars
        recentPayments: recentPayments / 100,
      },
      summary: {
        totalInvoices: invoices.length,
        totalOutstanding: outstandingBalance / 100,
        requiresAttention: overdueInvoices.length + pendingInvoices.length > 0,
      },
    };
  },
});

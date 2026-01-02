import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Booking Requests - Mutations and Queries
 * 
 * Handles public booking requests from tenant landing pages.
 * These are different from direct appointments - they're requests
 * that need to be reviewed and confirmed by clinic staff.
 * 
 * @deprecated 
 * ATTENTION: This mutation handles PHI (Patient Health Information).
 * We are migrating booking and intake flows to AWS for enhanced HIPAA compliance.
 * New implementations should use the AWS-hosted booking system (Option A).
 */

// Create a new booking request (public - no auth required)
// SECURITY: Accepts slug instead of tenantId to prevent tenant isolation bypass
export const createBookingRequest = mutation({
  args: {
    tenantSlug: v.string(), // Changed from tenantId to slug for security
    clinicId: v.optional(v.string()),
    providerId: v.optional(v.id("publicProviderProfiles")),
    appointmentTypeId: v.optional(v.string()),
    patientName: v.string(),
    patientEmail: v.string(),
    patientPhone: v.optional(v.string()),
    patientDateOfBirth: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    insuranceMemberId: v.optional(v.string()),
    preferredDates: v.array(v.string()),
    preferredTimeOfDay: v.optional(v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("any")
    )),
    notes: v.optional(v.string()),
    source: v.optional(v.union(
      v.literal("landing_page"),
      v.literal("direct_link"),
      v.literal("referral"),
      v.literal("phone"),
      v.literal("other")
    )),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Validate slug format before lookup to prevent injection attacks
    // Slug must be lowercase letters, numbers, hyphens, start with letter, 3-50 chars
    const slugRegex = /^[a-z][a-z0-9-]{2,49}$/;
    if (!slugRegex.test(args.tenantSlug)) {
      throw new Error("Invalid tenant identifier");
    }

    // SECURITY: Look up tenant by slug (from URL) instead of accepting tenantId from user input
    // This ensures tenant isolation - users can only create bookings for the tenant they're viewing
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.tenantSlug))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Extract tenantId from verified tenant lookup
    const tenantId = tenant.id;

    if (tenant.status !== "active") {
      throw new Error("This clinic is not currently accepting online bookings");
    }

    const bookingMode = tenant.bookingSettings?.mode ?? "disabled";
    if (bookingMode === "disabled") {
      throw new Error("Online booking is not available for this clinic");
    }

    // Validate required fields based on tenant settings
    if (tenant.bookingSettings?.requirePhone && !args.patientPhone) {
      throw new Error("Phone number is required");
    }

    if (tenant.bookingSettings?.requireDateOfBirth && !args.patientDateOfBirth) {
      throw new Error("Date of birth is required");
    }

    if (tenant.bookingSettings?.requireInsurance && (!args.insuranceProvider || !args.insuranceMemberId)) {
      throw new Error("Insurance information is required");
    }

    // Validate preferred dates are in the future and within allowed range
    const now = new Date();
    const today = now.toISOString().split('T')[0]!;
    const advanceBookingDays = tenant.bookingSettings?.advanceBookingDays ?? 30;
    const maxDate = new Date(now.getTime() + advanceBookingDays * 24 * 60 * 60 * 1000);
    const maxDateStr = maxDate.toISOString().split('T')[0]!;

    for (const date of args.preferredDates) {
      if (date < today) {
        throw new Error("Preferred dates must be in the future");
      }
      if (date > maxDateStr) {
        throw new Error(`Appointments can only be booked up to ${advanceBookingDays} days in advance`);
      }
    }

    // Verify provider exists and accepts bookings (if specified)
    if (args.providerId) {
      const provider = await ctx.db.get(args.providerId);
      if (!provider || !provider.isPublished || provider.tenantId !== tenantId) {
        throw new Error("Selected provider is not available");
      }
      if (provider.bookingEnabled === false) {
        throw new Error("Selected provider is not accepting online bookings");
      }
    }

    const timestamp = Date.now();

    // SECURITY: Sanitize and validate input first
    const sanitizedEmail = args.patientEmail.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      throw new Error("Invalid email address");
    }

    // SECURITY: Rate limiting - check for recent booking requests from same email
    // Prevent spam/abuse by limiting requests per email per tenant
    const oneHourAgo = Date.now() - 3600000; // 1 hour in milliseconds
    const recentRequests = await ctx.db
      .query("bookingRequests")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .filter((q) => 
        q.and(
          q.eq(q.field("patientEmail"), sanitizedEmail),
          q.gte(q.field("createdAt"), oneHourAgo)
        )
      )
      .collect();

    if (recentRequests.length >= 5) {
      // Calculate wait time until oldest request expires (better UX)
      const sortedRequests = [...recentRequests].sort((a, b) => a.createdAt - b.createdAt);
      const oldestRequest = sortedRequests[0];
      
      if (!oldestRequest) {
        throw new Error("Too many booking requests. Please try again later.");
      }

      const waitTimeMs = oldestRequest.createdAt + 3600000 - Date.now();
      const waitTimeMinutes = Math.ceil(waitTimeMs / 60000);
      
      if (waitTimeMinutes > 0) {
        throw new Error(`Too many booking requests. Please try again in ${waitTimeMinutes} minute${waitTimeMinutes !== 1 ? 's' : ''}.`);
      } else {
        throw new Error("Too many booking requests. Please try again later.");
      }
    }

    // Sanitize phone number if provided
    const sanitizedPhone = args.patientPhone 
      ? args.patientPhone.replace(/[^\d+()-]/g, '').trim() 
      : undefined;

    // Sanitize name (remove HTML tags and limit length)
    // Defensive check for null/undefined (though Convex validation should catch this)
    const sanitizedName = (args.patientName || '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .substring(0, 200);

    // Validate name contains at least one character after sanitization
    if (!sanitizedName || sanitizedName.length === 0) {
      throw new Error("Name is required");
    }

    const requestId = await ctx.db.insert("bookingRequests", {
      tenantId: tenantId,
      clinicId: args.clinicId,
      providerId: args.providerId,
      appointmentTypeId: args.appointmentTypeId,
      patientName: sanitizedName,
      patientEmail: sanitizedEmail,
      patientPhone: sanitizedPhone,
      patientDateOfBirth: args.patientDateOfBirth,
      insuranceProvider: args.insuranceProvider,
      insuranceMemberId: args.insuranceMemberId,
      preferredDates: args.preferredDates,
      preferredTimeOfDay: args.preferredTimeOfDay,
      notes: args.notes ? args.notes.replace(/<[^>]*>/g, '').trim().substring(0, 2000) : undefined,
      status: "pending",
      source: args.source ?? "landing_page",
      sourceUrl: args.sourceUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      success: true,
      requestId,
      message: tenant.bookingSettings?.confirmationMessage ?? 
        "Your booking request has been submitted. We will contact you shortly to confirm your appointment.",
    };
  },
});

// Get booking requests for a tenant (authenticated - clinic staff)
export const getBookingRequests = query({
  args: {
    tenantId: v.string(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("contacted"),
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("declined"),
      v.literal("cancelled"),
      v.literal("no_show")
    )),
    limit: v.optional(v.number()),
    clinicId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query;
    
    if (args.status) {
      const status = args.status; // Capture for type narrowing
      query = ctx.db
        .query("bookingRequests")
        .withIndex("by_tenant_status", (q) => 
          q.eq("tenantId", args.tenantId).eq("status", status)
        );
    } else {
      query = ctx.db
        .query("bookingRequests")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId));
    }

    let requests = await query.collect();

    // Filter by clinic if specified
    if (args.clinicId) {
      requests = requests.filter(r => r.clinicId === args.clinicId);
    }

    // Sort by created date (newest first)
    requests.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    if (args.limit && args.limit > 0) {
      requests = requests.slice(0, args.limit);
    }

    return requests;
  },
});

// Type-safe update structure for booking requests
type BookingRequestUpdate = {
  status: "pending" | "contacted" | "scheduled" | "confirmed" | "declined" | "cancelled" | "no_show";
  updatedAt: number;
  responseNotes?: string;
  assignedTo?: Id<"users">;
  scheduledAppointmentId?: Id<"appointments">;
  lastContactedAt?: number;
};

// Update booking request status (authenticated - clinic staff)
export const updateBookingRequestStatus = mutation({
  args: {
    requestId: v.id("bookingRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("contacted"),
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("declined"),
      v.literal("cancelled"),
      v.literal("no_show")
    ),
    responseNotes: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    scheduledAppointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Booking request not found");
    }

    // Type-safe updates object
    const updates: BookingRequestUpdate = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.responseNotes !== undefined) {
      // Sanitize response notes
      updates.responseNotes = args.responseNotes.replace(/<[^>]*>/g, '').trim().substring(0, 2000);
    }

    if (args.assignedTo !== undefined) {
      updates.assignedTo = args.assignedTo;
    }

    if (args.scheduledAppointmentId !== undefined) {
      updates.scheduledAppointmentId = args.scheduledAppointmentId;
    }

    if (args.status === "contacted") {
      updates.lastContactedAt = Date.now();
    }

    await ctx.db.patch(args.requestId, updates);

    return { success: true };
  },
});

// Get booking request counts by status (for dashboard)
export const getBookingRequestCounts = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("bookingRequests")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const counts: Record<string, number> = {
      pending: 0,
      contacted: 0,
      scheduled: 0,
      confirmed: 0,
      declined: 0,
      cancelled: 0,
      no_show: 0,
      total: requests.length,
    };

    for (const request of requests) {
      const status = request.status as keyof typeof counts;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    }

    return counts;
  },
});

// Get single booking request details
export const getBookingRequest = query({
  args: {
    requestId: v.id("bookingRequests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }

    // Get provider name if specified
    let providerName = null;
    if (request.providerId) {
      const provider = await ctx.db.get(request.providerId);
      providerName = provider?.displayName;
    }

    return {
      ...request,
      providerName,
    };
  },
});


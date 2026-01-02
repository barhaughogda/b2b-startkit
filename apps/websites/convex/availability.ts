import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { createHIPAAAuditLogger } from "./auditLogger";
import {
  getDayOfWeekInTimezone,
  getDateStringInTimezone,
  generateTimeSlotsForDay,
  getNextDaysInTimezone,
} from "./lib/clinicTime";

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/**
 * Internal helper to get effective opening hours for a clinic on a specific date.
 * Handles the inheritance chain: clinic override -> company override -> clinic recurring -> company recurring
 */
export const getEffectiveOpeningHoursForDate = internalQuery({
  args: {
    tenantId: v.string(),
    clinicId: v.id('clinics'),
    dateString: v.string(), // YYYY-MM-DD format in schedule's timezone
    dayOfWeek: v.string(), // 'monday' | 'tuesday' | etc.
  },
  handler: async (ctx, args): Promise<{ startTime: string; endTime: string; isClosed: boolean } | null> => {
    const dayOfWeek = args.dayOfWeek as DayOfWeek;

    // 1. Check for clinic-level date override
    const clinicOverride = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_override_date', (q) => 
        q.eq('tenantId', args.tenantId).eq('overrideDate', args.dateString)
      )
      .filter((q) => q.eq(q.field('clinicId'), args.clinicId))
      .first();

    if (clinicOverride) {
      if (clinicOverride.isClosed) {
        return { startTime: '00:00', endTime: '00:00', isClosed: true };
      }
      return {
        startTime: clinicOverride.startTime,
        endTime: clinicOverride.endTime,
        isClosed: false,
      };
    }

    // 2. Check for company-level date override
    const companyOverride = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_override_date', (q) => 
        q.eq('tenantId', args.tenantId).eq('overrideDate', args.dateString)
      )
      .filter((q) => q.eq(q.field('clinicId'), undefined))
      .first();

    if (companyOverride) {
      if (companyOverride.isClosed) {
        return { startTime: '00:00', endTime: '00:00', isClosed: true };
      }
      return {
        startTime: companyOverride.startTime,
        endTime: companyOverride.endTime,
        isClosed: false,
      };
    }

    // 3. Check for clinic-level recurring schedule
    const clinicRecurring = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic_day', (q) => 
        q.eq('tenantId', args.tenantId).eq('clinicId', args.clinicId).eq('dayOfWeek', dayOfWeek)
      )
      .filter((q) => q.eq(q.field('isRecurring'), true))
      .first();

    if (clinicRecurring) {
      if (clinicRecurring.isClosed) {
        return { startTime: '00:00', endTime: '00:00', isClosed: true };
      }
      return {
        startTime: clinicRecurring.startTime,
        endTime: clinicRecurring.endTime,
        isClosed: false,
      };
    }

    // 4. Check for company-level recurring schedule
    const companyRecurring = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic_day', (q) => 
        q.eq('tenantId', args.tenantId).eq('clinicId', undefined).eq('dayOfWeek', dayOfWeek)
      )
      .filter((q) => q.eq(q.field('isRecurring'), true))
      .first();

    if (companyRecurring) {
      if (companyRecurring.isClosed) {
        return { startTime: '00:00', endTime: '00:00', isClosed: true };
      }
      return {
        startTime: companyRecurring.startTime,
        endTime: companyRecurring.endTime,
        isClosed: false,
      };
    }

    // No opening hours defined - return null (unrestricted)
    return null;
  },
});

/**
 * Helper function to intersect two time windows.
 * Returns the overlapping window, or null if no overlap.
 */
function intersectTimeWindows(
  window1: { startTime: string; endTime: string },
  window2: { startTime: string; endTime: string }
): { startTime: string; endTime: string } | null {
  // Parse times to minutes
  const parseTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };

  const start1 = parseTime(window1.startTime);
  const end1 = parseTime(window1.endTime);
  const start2 = parseTime(window2.startTime);
  const end2 = parseTime(window2.endTime);

  // Find intersection
  const intersectStart = Math.max(start1, start2);
  const intersectEnd = Math.min(end1, end2);

  // Check if there's an actual intersection
  if (intersectStart >= intersectEnd) {
    return null;
  }

  // Convert back to time strings
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return {
    startTime: formatTime(intersectStart),
    endTime: formatTime(intersectEnd),
  };
}

// Set recurring weekly availability schedule
export const setRecurringAvailability = mutation({
  args: {
    providerId: v.id("providers"),
    locationId: v.optional(v.id("locations")), // Optional - null means applies to all locations
    dayOfWeek: v.union(
      v.literal("monday"),
      v.literal("tuesday"),
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday")
    ),
    startTime: v.string(), // Time in HH:mm format (24-hour)
    endTime: v.string(), // Time in HH:mm format (24-hour)
    tenantId: v.string(),
    userId: v.optional(v.id("users")), // User who set the availability (for audit logging)
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Validate that provider exists and belongs to tenant
    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }
    if (provider.tenantId !== args.tenantId) {
      throw new Error("Provider does not belong to the specified tenant");
    }

    // Validate location if provided
    if (args.locationId) {
      const location = await ctx.db.get(args.locationId);
      if (!location) {
        throw new Error("Location not found");
      }
      if (location.tenantId !== args.tenantId) {
        throw new Error("Location does not belong to the specified tenant");
      }
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(args.startTime)) {
      throw new Error("Invalid start time format. Use HH:mm (24-hour format)");
    }
    if (!timeRegex.test(args.endTime)) {
      throw new Error("Invalid end time format. Use HH:mm (24-hour format)");
    }

    // Validate that end time is after start time
    const [startHours, startMinutes] = args.startTime.split(':').map(Number);
    const [endHours, endMinutes] = args.endTime.split(':').map(Number);
    const startTotalMinutes = (startHours ?? 0) * 60 + (startMinutes ?? 0);
    const endTotalMinutes = (endHours ?? 0) * 60 + (endMinutes ?? 0);

    if (endTotalMinutes <= startTotalMinutes) {
      throw new Error("End time must be after start time");
    }

    // Check if recurring availability already exists for this day/location
    const existing = await ctx.db
      .query("providerAvailability")
      .withIndex("by_provider_day", (q) => 
        q.eq("providerId", args.providerId).eq("dayOfWeek", args.dayOfWeek)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("isRecurring"), true),
          q.eq(q.field("tenantId"), args.tenantId),
          args.locationId 
            ? q.eq(q.field("locationId"), args.locationId)
            : q.eq(q.field("locationId"), undefined)
        )
      )
      .first();

    try {
      const now = Date.now();
      let availabilityId: Id<"providerAvailability">;
      
      if (existing) {
        // Update existing recurring availability
        await ctx.db.patch(existing._id, {
          startTime: args.startTime,
          endTime: args.endTime,
          locationId: args.locationId,
          updatedAt: now,
        });
        availabilityId = existing._id;
      } else {
        // Create new recurring availability
        availabilityId = await ctx.db.insert("providerAvailability", {
          providerId: args.providerId,
          locationId: args.locationId,
          dayOfWeek: args.dayOfWeek,
          startTime: args.startTime,
          endTime: args.endTime,
          isRecurring: true,
          tenantId: args.tenantId,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logAvailabilityChange({
        tenantId: args.tenantId,
        userId: args.userId,
        providerId: args.providerId,
        action: existing ? "availability_updated" : "availability_set",
        locationId: args.locationId,
        dayOfWeek: args.dayOfWeek,
        startTime: args.startTime,
        endTime: args.endTime,
      });

      return availabilityId;
    } catch (error) {
      throw new Error(`Failed to set recurring availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Add date-specific availability override
export const addAvailabilityOverride = mutation({
  args: {
    providerId: v.id("providers"),
    locationId: v.optional(v.id("locations")),
    overrideDate: v.number(), // Timestamp for the specific date
    startTime: v.optional(v.string()), // If not provided, provider is unavailable
    endTime: v.optional(v.string()), // If not provided, provider is unavailable
    tenantId: v.string(),
    userId: v.optional(v.id("users")), // User who added the override (for audit logging)
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Validate that provider exists and belongs to tenant
    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }
    if (provider.tenantId !== args.tenantId) {
      throw new Error("Provider does not belong to the specified tenant");
    }

    // Validate location if provided
    if (args.locationId) {
      const location = await ctx.db.get(args.locationId);
      if (!location) {
        throw new Error("Location not found");
      }
      if (location.tenantId !== args.tenantId) {
        throw new Error("Location does not belong to the specified tenant");
      }
    }

    // Validate override date (must be in the future or today)
    const now = Date.now();
    const overrideDateStart = new Date(args.overrideDate);
    overrideDateStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    if (overrideDateStart.getTime() < todayStart.getTime()) {
      throw new Error("Override date must be today or in the future");
    }

    // If times are provided, validate them
    if (args.startTime && args.endTime) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(args.startTime)) {
        throw new Error("Invalid start time format. Use HH:mm (24-hour format)");
      }
      if (!timeRegex.test(args.endTime)) {
        throw new Error("Invalid end time format. Use HH:mm (24-hour format)");
      }

      const [startHours, startMinutes] = args.startTime.split(':').map(Number);
      const [endHours, endMinutes] = args.endTime.split(':').map(Number);
      const startTotalMinutes = (startHours ?? 0) * 60 + (startMinutes ?? 0);
      const endTotalMinutes = (endHours ?? 0) * 60 + (endMinutes ?? 0);

      if (endTotalMinutes <= startTotalMinutes) {
        throw new Error("End time must be after start time");
      }
    }

    // Check if override already exists for this date/location
    const existing = await ctx.db
      .query("providerAvailability")
      .withIndex("by_override_date", (q) => q.eq("overrideDate", args.overrideDate))
      .filter((q) => 
        q.and(
          q.eq(q.field("providerId"), args.providerId),
          q.eq(q.field("isRecurring"), false),
          q.eq(q.field("tenantId"), args.tenantId),
          args.locationId 
            ? q.eq(q.field("locationId"), args.locationId)
            : q.eq(q.field("locationId"), undefined)
        )
      )
      .first();

    if (existing) {
      throw new Error("Availability override already exists for this date and location");
    }

    try {
      const createdAt = Date.now();
      const overrideId = await ctx.db.insert("providerAvailability", {
        providerId: args.providerId,
        locationId: args.locationId,
        dayOfWeek: "monday", // Required field, but not used for overrides
        startTime: args.startTime || "00:00",
        endTime: args.endTime || "00:00",
        isRecurring: false,
        overrideDate: args.overrideDate,
        tenantId: args.tenantId,
        createdAt,
        updatedAt: createdAt,
      });

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logAvailabilityChange({
        tenantId: args.tenantId,
        userId: args.userId,
        providerId: args.providerId,
        action: "availability_override_added",
        locationId: args.locationId,
        overrideDate: args.overrideDate,
        startTime: args.startTime || "00:00",
        endTime: args.endTime || "00:00",
        details: {
          isUnavailable: !args.startTime || !args.endTime || (args.startTime === "00:00" && args.endTime === "00:00"),
        },
      });

      return overrideId;
    } catch (error) {
      throw new Error(`Failed to add availability override: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Remove availability override
export const removeAvailabilityOverride = mutation({
  args: {
    id: v.id("providerAvailability"),
    tenantId: v.string(),
    userId: v.optional(v.id("users")), // User who removed the override (for audit logging)
  },
  handler: async (ctx, args) => {
    // Check if availability record exists
    const availability = await ctx.db.get(args.id);
    if (!availability) {
      throw new Error("Availability record not found");
    }
    if (availability.tenantId !== args.tenantId) {
      throw new Error("Availability record does not belong to the specified tenant");
    }
    if (availability.isRecurring) {
      throw new Error("Cannot remove recurring availability. Use setRecurringAvailability to update it.");
    }

    // Log audit event before deletion
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logAvailabilityChange({
      tenantId: args.tenantId,
      userId: args.userId,
      providerId: availability.providerId || undefined, // Optional - may be undefined for user-based availability
      action: "availability_override_removed",
      locationId: availability.locationId,
      overrideDate: availability.overrideDate,
      startTime: availability.startTime,
      endTime: availability.endTime,
    });

    try {
      return await ctx.db.delete(args.id);
    } catch (error) {
      throw new Error(`Failed to remove availability override: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Get provider availability for a date range
export const getProviderAvailability = query({
  args: {
    providerId: v.id("providers"),
    startDate: v.number(), // Timestamp
    endDate: v.number(), // Timestamp
    locationId: v.optional(v.id("locations")),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all recurring availability for this provider
    const recurringAvailability = await ctx.db
      .query("providerAvailability")
      .withIndex("by_provider_recurring", (q) => 
        q.eq("providerId", args.providerId).eq("isRecurring", true)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          args.locationId 
            ? q.eq(q.field("locationId"), args.locationId)
            : q.or(
                q.eq(q.field("locationId"), undefined),
                q.neq(q.field("locationId"), undefined) // Include both null and non-null
              )
        )
      )
      .collect();

    // Get all overrides in the date range
    const overrides = await ctx.db
      .query("providerAvailability")
      .withIndex("by_override_date", (q) => 
        q.gte("overrideDate", args.startDate).lte("overrideDate", args.endDate)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("providerId"), args.providerId),
          q.eq(q.field("isRecurring"), false),
          q.eq(q.field("tenantId"), args.tenantId),
          args.locationId 
            ? q.eq(q.field("locationId"), args.locationId)
            : q.or(
                q.eq(q.field("locationId"), undefined),
                q.neq(q.field("locationId"), undefined)
              )
        )
      )
      .collect();

    return {
      recurring: recurringAvailability,
      overrides: overrides,
    };
  },
});

// Check if provider is available at a specific time
export const checkAvailability = query({
  args: {
    providerId: v.id("providers"),
    dateTime: v.number(), // Timestamp
    locationId: v.optional(v.id("locations")),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const date = new Date(args.dateTime);
    const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    // Map day names correctly
    const dayMap: Record<string, "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"> = {
      "mon": "monday",
      "tue": "tuesday",
      "wed": "wednesday",
      "thu": "thursday",
      "fri": "friday",
      "sat": "saturday",
      "sun": "sunday",
    };
    
    const dayShortName = date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const dayName = dayMap[dayShortName] || "monday";

    // Check for date-specific override first
    const overrideDateStart = new Date(args.dateTime);
    overrideDateStart.setHours(0, 0, 0, 0);
    const overrideTimestamp = overrideDateStart.getTime();

    const override = await ctx.db
      .query("providerAvailability")
      .withIndex("by_override_date", (q) => q.eq("overrideDate", overrideTimestamp))
      .filter((q) => 
        q.and(
          q.eq(q.field("providerId"), args.providerId),
          q.eq(q.field("isRecurring"), false),
          q.eq(q.field("tenantId"), args.tenantId),
          args.locationId 
            ? q.eq(q.field("locationId"), args.locationId)
            : q.or(
                q.eq(q.field("locationId"), undefined),
                q.neq(q.field("locationId"), undefined)
              )
        )
      )
      .first();

    // If override exists, use it (if startTime and endTime are both "00:00", provider is unavailable)
    if (override) {
      if (override.startTime === "00:00" && override.endTime === "00:00") {
        return { available: false, reason: "Override marks provider as unavailable" };
      }
      // Check if time falls within override window
      const [startHours, startMinutes] = override.startTime.split(':').map(Number);
      const [endHours, endMinutes] = override.endTime.split(':').map(Number);
      const [checkHours, checkMinutes] = timeString.split(':').map(Number);
      const startTotalMinutes = (startHours ?? 0) * 60 + (startMinutes ?? 0);
      const endTotalMinutes = (endHours ?? 0) * 60 + (endMinutes ?? 0);
      const checkTotalMinutes = (checkHours ?? 0) * 60 + (checkMinutes ?? 0);

      if (checkTotalMinutes >= startTotalMinutes && checkTotalMinutes < endTotalMinutes) {
        return { available: true };
      } else {
        return { available: false, reason: "Outside override availability window" };
      }
    }

    // Check recurring availability
    const recurring = await ctx.db
      .query("providerAvailability")
      .withIndex("by_provider_day", (q) => 
        q.eq("providerId", args.providerId).eq("dayOfWeek", dayName)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("isRecurring"), true),
          q.eq(q.field("tenantId"), args.tenantId),
          args.locationId 
            ? q.eq(q.field("locationId"), args.locationId)
            : q.or(
                q.eq(q.field("locationId"), undefined),
                q.neq(q.field("locationId"), undefined)
              )
        )
      )
      .first();

    if (!recurring) {
      return { available: false, reason: "No recurring availability set for this day" };
    }

    // Check if time falls within recurring window
    const [startHours, startMinutes] = recurring.startTime.split(':').map(Number);
    const [endHours, endMinutes] = recurring.endTime.split(':').map(Number);
    const [checkHours, checkMinutes] = timeString.split(':').map(Number);
    const startTotalMinutes = (startHours ?? 0) * 60 + (startMinutes ?? 0);
    const endTotalMinutes = (endHours ?? 0) * 60 + (endMinutes ?? 0);
    const checkTotalMinutes = (checkHours ?? 0) * 60 + (checkMinutes ?? 0);

    if (checkTotalMinutes >= startTotalMinutes && checkTotalMinutes < endTotalMinutes) {
      return { available: true };
    } else {
      return { available: false, reason: "Outside recurring availability window" };
    }
  },
});

// Get available time slots for a date range
export const getAvailableTimeSlots = query({
  args: {
    providerId: v.id("providers"),
    startDate: v.number(), // Timestamp
    endDate: v.number(), // Timestamp
    slotDuration: v.number(), // Duration in minutes (default: 30)
    locationId: v.optional(v.id("locations")),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const slotDuration = args.slotDuration || 30;
    const slots: Array<{ dateTime: number; available: boolean }> = [];

    // Get existing appointments for this provider in the date range
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_provider_date", (q) => 
        q.eq("providerId", args.providerId).gte("scheduledAt", args.startDate).lte("scheduledAt", args.endDate)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();

    // Get availability for this date range
    // Get all recurring availability for this provider
    const recurringAvailability = await ctx.db
      .query("providerAvailability")
      .withIndex("by_provider_recurring", (q) => 
        q.eq("providerId", args.providerId).eq("isRecurring", true)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          args.locationId 
            ? q.eq(q.field("locationId"), args.locationId)
            : q.or(
                q.eq(q.field("locationId"), undefined),
                q.neq(q.field("locationId"), undefined)
              )
        )
      )
      .collect();

    // Get all overrides in the date range
    const overrides = await ctx.db
      .query("providerAvailability")
      .withIndex("by_override_date", (q) => 
        q.gte("overrideDate", args.startDate).lte("overrideDate", args.endDate)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("providerId"), args.providerId),
          q.eq(q.field("isRecurring"), false),
          q.eq(q.field("tenantId"), args.tenantId),
          args.locationId 
            ? q.eq(q.field("locationId"), args.locationId)
            : q.or(
                q.eq(q.field("locationId"), undefined),
                q.neq(q.field("locationId"), undefined)
              )
        )
      )
      .collect();

    const availability = {
      recurring: recurringAvailability,
      overrides: overrides,
    };

    // Generate time slots
    let currentDate = new Date(args.startDate);
    const endDate = new Date(args.endDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as 
        "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

      // Check for override first
      const overrideDateStart = new Date(currentDate);
      overrideDateStart.setHours(0, 0, 0, 0);
      const overrideTimestamp = overrideDateStart.getTime();
      const override = availability.overrides.find(
        (o) => o.overrideDate === overrideTimestamp
      );

      let dayAvailability: { startTime: string; endTime: string } | null = null;

      if (override) {
        // Use override if it's not marked as unavailable
        if (override.startTime !== "00:00" || override.endTime !== "00:00") {
          dayAvailability = { startTime: override.startTime, endTime: override.endTime };
        }
      } else {
        // Use recurring availability
        const recurring = availability.recurring.find(
          (r) => r.dayOfWeek === dayOfWeek
        );
        if (recurring) {
          dayAvailability = { startTime: recurring.startTime, endTime: recurring.endTime };
        }
      }

      if (dayAvailability) {
        // Generate slots for this day
        const [startHours, startMinutes] = dayAvailability.startTime.split(':').map(Number);
        const [endHours, endMinutes] = dayAvailability.endTime.split(':').map(Number);
        const startTotalMinutes = (startHours ?? 0) * 60 + (startMinutes ?? 0);
        const endTotalMinutes = (endHours ?? 0) * 60 + (endMinutes ?? 0);

        let currentSlotMinutes = startTotalMinutes;
        while (currentSlotMinutes + slotDuration <= endTotalMinutes) {
          const slotDate = new Date(currentDate);
          slotDate.setHours(Math.floor(currentSlotMinutes / 60), currentSlotMinutes % 60, 0, 0);
          const slotTimestamp = slotDate.getTime();

          // Check if this slot conflicts with an existing appointment
          const hasConflict = appointments.some((apt) => {
            const aptStart = apt.scheduledAt;
            const aptEnd = aptStart + (apt.duration * 60 * 1000);
            return slotTimestamp >= aptStart && slotTimestamp < aptEnd;
          });

          slots.push({
            dateTime: slotTimestamp,
            available: !hasConflict,
          });

          currentSlotMinutes += slotDuration;
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }

    return slots;
  },
});

// ============================================================================
// USER-BASED AVAILABILITY FUNCTIONS (for clinic/user-centric calendar)
// ============================================================================

// Get user availability for a date range (user-based, not provider-based)
export const getUserAvailability = query({
  args: {
    userId: v.id("users"),
    startDate: v.number(), // Timestamp
    endDate: v.number(), // Timestamp
    locationId: v.optional(v.id("locations")),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Get all recurring availability for this user
    const recurringAvailability = await ctx.db
      .query("providerAvailability")
      .withIndex("by_user_recurring", (q) => 
        q.eq("userId", args.userId).eq("isRecurring", true)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          args.locationId 
            ? q.eq(q.field("locationId"), args.locationId)
            : q.or(
                q.eq(q.field("locationId"), undefined),
                q.neq(q.field("locationId"), undefined)
              )
        )
      )
      .collect();

    // Get all overrides in the date range
    const overrides = await ctx.db
      .query("providerAvailability")
      .withIndex("by_override_date", (q) => 
        q.gte("overrideDate", args.startDate).lte("overrideDate", args.endDate)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("isRecurring"), false),
          q.eq(q.field("tenantId"), args.tenantId),
          args.locationId 
            ? q.eq(q.field("locationId"), args.locationId)
            : q.or(
                q.eq(q.field("locationId"), undefined),
                q.neq(q.field("locationId"), undefined)
              )
        )
      )
      .collect();

    return {
      recurring: recurringAvailability,
      overrides: overrides,
    };
  },
});

// Set recurring weekly availability schedule for a user
export const setUserRecurringAvailability = mutation({
  args: {
    userId: v.id("users"),
    locationId: v.optional(v.id("locations")),
    dayOfWeek: v.union(
      v.literal("monday"),
      v.literal("tuesday"),
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday")
    ),
    startTime: v.string(),
    endTime: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Validate that user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Validate location if provided
    if (args.locationId) {
      const location = await ctx.db.get(args.locationId);
      if (!location) {
        throw new Error("Location not found");
      }
      if (location.tenantId !== args.tenantId) {
        throw new Error("Location does not belong to the specified tenant");
      }
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(args.startTime)) {
      throw new Error("Invalid start time format. Use HH:mm (24-hour format)");
    }
    if (!timeRegex.test(args.endTime)) {
      throw new Error("Invalid end time format. Use HH:mm (24-hour format)");
    }

    // Validate that end time is after start time
    const [startHours, startMinutes] = args.startTime.split(':').map(Number);
    const [endHours, endMinutes] = args.endTime.split(':').map(Number);
    const startTotalMinutes = (startHours ?? 0) * 60 + (startMinutes ?? 0);
    const endTotalMinutes = (endHours ?? 0) * 60 + (endMinutes ?? 0);

    if (endTotalMinutes <= startTotalMinutes) {
      throw new Error("End time must be after start time");
    }

    // Check if recurring availability already exists for this day/location
    const existing = await ctx.db
      .query("providerAvailability")
      .withIndex("by_user_day", (q) => 
        q.eq("userId", args.userId).eq("dayOfWeek", args.dayOfWeek)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("isRecurring"), true),
          q.eq(q.field("tenantId"), args.tenantId),
          args.locationId 
            ? q.eq(q.field("locationId"), args.locationId)
            : q.eq(q.field("locationId"), undefined)
        )
      )
      .first();

    try {
      const now = Date.now();
      let availabilityId: Id<"providerAvailability">;
      
      if (existing) {
        // Update existing recurring availability
        await ctx.db.patch(existing._id, {
          startTime: args.startTime,
          endTime: args.endTime,
          locationId: args.locationId,
          updatedAt: now,
        });
        availabilityId = existing._id;
      } else {
        // Create new recurring availability
        availabilityId = await ctx.db.insert("providerAvailability", {
          userId: args.userId,
          locationId: args.locationId,
          dayOfWeek: args.dayOfWeek,
          startTime: args.startTime,
          endTime: args.endTime,
          isRecurring: true,
          tenantId: args.tenantId,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logAvailabilityChange({
        tenantId: args.tenantId,
        userId: args.userId,
        providerId: undefined, // User-based availability - no providerId
        action: existing ? "availability_updated" : "availability_set",
        locationId: args.locationId,
        dayOfWeek: args.dayOfWeek,
        startTime: args.startTime,
        endTime: args.endTime,
      });

      return { success: true, id: availabilityId };
    } catch (error) {
      throw new Error(
        `Failed to ${existing ? 'update' : 'set'} availability: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  },
});

// Add date-specific override for a user
export const addUserAvailabilityOverride = mutation({
  args: {
    userId: v.id("users"),
    locationId: v.optional(v.id("locations")),
    overrideDate: v.number(), // Timestamp
    startTime: v.string(), // "00:00" means unavailable, otherwise HH:mm format
    endTime: v.string(), // "00:00" means unavailable, otherwise HH:mm format
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Validate that user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Validate location if provided
    if (args.locationId) {
      const location = await ctx.db.get(args.locationId);
      if (!location) {
        throw new Error("Location not found");
      }
      if (location.tenantId !== args.tenantId) {
        throw new Error("Location does not belong to the specified tenant");
      }
    }

    // Validate time format (HH:mm) - allow "00:00" for unavailable
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(args.startTime)) {
      throw new Error("Invalid start time format. Use HH:mm (24-hour format)");
    }
    if (!timeRegex.test(args.endTime)) {
      throw new Error("Invalid end time format. Use HH:mm (24-hour format)");
    }

    // If not unavailable, validate that end time is after start time
    if (args.startTime !== "00:00" || args.endTime !== "00:00") {
      const [startHours, startMinutes] = args.startTime.split(':').map(Number);
      const [endHours, endMinutes] = args.endTime.split(':').map(Number);
      const startTotalMinutes = (startHours ?? 0) * 60 + (startMinutes ?? 0);
      const endTotalMinutes = (endHours ?? 0) * 60 + (endMinutes ?? 0);

      if (endTotalMinutes <= startTotalMinutes) {
        throw new Error("End time must be after start time");
      }
    }

    // Check if override already exists for this date
    const existing = await ctx.db
      .query("providerAvailability")
      .withIndex("by_override_date", (q) => q.eq("overrideDate", args.overrideDate))
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("isRecurring"), false),
          q.eq(q.field("tenantId"), args.tenantId),
          args.locationId 
            ? q.eq(q.field("locationId"), args.locationId)
            : q.eq(q.field("locationId"), undefined)
        )
      )
      .first();

    try {
      const now = Date.now();
      let availabilityId: Id<"providerAvailability">;
      
      if (existing) {
        // Update existing override
        await ctx.db.patch(existing._id, {
          startTime: args.startTime,
          endTime: args.endTime,
          locationId: args.locationId,
          updatedAt: now,
        });
        availabilityId = existing._id;
      } else {
        // Create new override
        availabilityId = await ctx.db.insert("providerAvailability", {
          userId: args.userId,
          locationId: args.locationId,
          dayOfWeek: "monday", // Required field but not used for overrides
          startTime: args.startTime,
          endTime: args.endTime,
          isRecurring: false,
          overrideDate: args.overrideDate,
          tenantId: args.tenantId,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logAvailabilityChange({
        tenantId: args.tenantId,
        userId: args.userId,
        providerId: undefined, // User-based availability - no providerId
        action: existing ? "availability_updated" : "availability_override_added",
        locationId: args.locationId,
        overrideDate: args.overrideDate,
        startTime: args.startTime,
        endTime: args.endTime,
      });

      return { success: true, id: availabilityId };
    } catch (error) {
      throw new Error(
        `Failed to ${existing ? 'update' : 'add'} override: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  },
});

// Remove availability override for a user
export const removeUserAvailabilityOverride = mutation({
  args: {
    id: v.id("providerAvailability"),
    tenantId: v.string(),
    userId: v.id("users"), // User making the change (for audit)
  },
  handler: async (ctx, args) => {
    // Validate tenant ID
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Get the availability record
    const availability = await ctx.db.get(args.id);
    if (!availability) {
      throw new Error("Availability override not found");
    }

    // Verify tenant match
    if (availability.tenantId !== args.tenantId) {
      throw new Error("Availability override does not belong to the specified tenant");
    }

    // Verify it's a user-based availability (not provider-based)
    if (!availability.userId) {
      throw new Error("This availability override is not user-based");
    }

    // Verify user match
    if (availability.userId !== args.userId) {
      throw new Error("You can only remove your own availability overrides");
    }

    try {
      // Delete the override
      await ctx.db.delete(args.id);

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logAvailabilityChange({
        tenantId: args.tenantId,
        userId: args.userId,
        providerId: undefined, // User-based availability - no providerId
        action: "availability_override_removed",
        locationId: availability.locationId,
        overrideDate: availability.overrideDate,
      });

      return { success: true };
    } catch (error) {
      throw new Error(
        `Failed to remove override: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
});

// ============================================================================
// CLINIC-BASED AVAILABILITY FUNCTIONS
// ============================================================================

/**
 * Set recurring weekly availability schedule for a user at a specific clinic
 * Times are interpreted in the clinic's timezone
 */
export const setUserClinicAvailability = mutation({
  args: {
    userId: v.id("users"),
    clinicId: v.id("clinics"),
    dayOfWeek: v.union(
      v.literal("monday"),
      v.literal("tuesday"),
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday")
    ),
    startTime: v.string(), // Time in HH:mm format (24-hour), interpreted in clinic timezone
    endTime: v.string(), // Time in HH:mm format (24-hour), interpreted in clinic timezone
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Validate that user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Validate clinic exists and belongs to tenant
    const clinic = await ctx.db.get(args.clinicId);
    if (!clinic) {
      throw new Error("Clinic not found");
    }
    if (clinic.tenantId !== args.tenantId) {
      throw new Error("Clinic does not belong to the specified tenant");
    }

    // Verify user is assigned to this clinic
    const userClinics = user.clinics ?? [];
    if (!userClinics.includes(args.clinicId)) {
      throw new Error("User is not assigned to this clinic");
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(args.startTime)) {
      throw new Error("Invalid start time format. Use HH:mm (24-hour format)");
    }
    if (!timeRegex.test(args.endTime)) {
      throw new Error("Invalid end time format. Use HH:mm (24-hour format)");
    }

    // Validate that end time is after start time
    const [startHours, startMinutes] = args.startTime.split(':').map(Number);
    const [endHours, endMinutes] = args.endTime.split(':').map(Number);
    const startTotalMinutes = (startHours ?? 0) * 60 + (startMinutes ?? 0);
    const endTotalMinutes = (endHours ?? 0) * 60 + (endMinutes ?? 0);

    if (endTotalMinutes <= startTotalMinutes) {
      throw new Error("End time must be after start time");
    }

    // Check if recurring availability already exists for this day/clinic
    const existing = await ctx.db
      .query("providerAvailability")
      .withIndex("by_user_clinic", (q) => 
        q.eq("userId", args.userId).eq("clinicId", args.clinicId)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("dayOfWeek"), args.dayOfWeek),
          q.eq(q.field("isRecurring"), true),
          q.eq(q.field("tenantId"), args.tenantId)
        )
      )
      .first();

    try {
      const now = Date.now();
      let availabilityId: Id<"providerAvailability">;
      
      if (existing) {
        // Update existing recurring availability
        await ctx.db.patch(existing._id, {
          startTime: args.startTime,
          endTime: args.endTime,
          updatedAt: now,
        });
        availabilityId = existing._id;
      } else {
        // Create new recurring availability
        availabilityId = await ctx.db.insert("providerAvailability", {
          userId: args.userId,
          clinicId: args.clinicId,
          dayOfWeek: args.dayOfWeek,
          startTime: args.startTime,
          endTime: args.endTime,
          isRecurring: true,
          tenantId: args.tenantId,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logAvailabilityChange({
        tenantId: args.tenantId,
        userId: args.userId,
        providerId: undefined,
        action: existing ? "availability_updated" : "availability_set",
        locationId: undefined,
        dayOfWeek: args.dayOfWeek,
        startTime: args.startTime,
        endTime: args.endTime,
        details: { clinicId: args.clinicId, clinicName: clinic.name },
      });

      return availabilityId;
    } catch (error) {
      throw new Error(`Failed to set clinic availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

/**
 * Remove recurring availability for a specific day at a clinic
 */
export const removeUserClinicAvailability = mutation({
  args: {
    userId: v.id("users"),
    clinicId: v.id("clinics"),
    dayOfWeek: v.union(
      v.literal("monday"),
      v.literal("tuesday"),
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday")
    ),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Find the existing availability
    const existing = await ctx.db
      .query("providerAvailability")
      .withIndex("by_user_clinic", (q) => 
        q.eq("userId", args.userId).eq("clinicId", args.clinicId)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("dayOfWeek"), args.dayOfWeek),
          q.eq(q.field("isRecurring"), true),
          q.eq(q.field("tenantId"), args.tenantId)
        )
      )
      .first();

    if (!existing) {
      throw new Error("No availability found for this day");
    }

    try {
      await ctx.db.delete(existing._id);

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logAvailabilityChange({
        tenantId: args.tenantId,
        userId: args.userId,
        providerId: undefined,
        action: "availability_removed",
        locationId: undefined,
        dayOfWeek: args.dayOfWeek,
        details: { clinicId: args.clinicId },
      });

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to remove availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

/**
 * Add a date-specific override for a user at a clinic
 * Used for vacations, special hours, etc.
 */
export const addUserClinicAvailabilityOverride = mutation({
  args: {
    userId: v.id("users"),
    clinicId: v.id("clinics"),
    overrideDate: v.number(), // Timestamp (start of day)
    startTime: v.optional(v.string()), // If not provided, provider is unavailable
    endTime: v.optional(v.string()), // If not provided, provider is unavailable
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Validate user and clinic
    const user = await ctx.db.get(args.userId);
    if (!user || user.tenantId !== args.tenantId) {
      throw new Error("User not found or unauthorized");
    }

    const clinic = await ctx.db.get(args.clinicId);
    if (!clinic || clinic.tenantId !== args.tenantId) {
      throw new Error("Clinic not found or unauthorized");
    }

    // If times are provided, validate them
    if (args.startTime && args.endTime) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(args.startTime) || !timeRegex.test(args.endTime)) {
        throw new Error("Invalid time format. Use HH:mm (24-hour format)");
      }

      const [startHours, startMinutes] = args.startTime.split(':').map(Number);
      const [endHours, endMinutes] = args.endTime.split(':').map(Number);
      if ((endHours ?? 0) * 60 + (endMinutes ?? 0) <= (startHours ?? 0) * 60 + (startMinutes ?? 0)) {
        throw new Error("End time must be after start time");
      }
    }

    // Check if override already exists
    const existing = await ctx.db
      .query("providerAvailability")
      .withIndex("by_override_date", (q) => q.eq("overrideDate", args.overrideDate))
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("clinicId"), args.clinicId),
          q.eq(q.field("isRecurring"), false),
          q.eq(q.field("tenantId"), args.tenantId)
        )
      )
      .first();

    const now = Date.now();
    const startTime = args.startTime || "00:00";
    const endTime = args.endTime || "00:00";

    try {
      let availabilityId: Id<"providerAvailability">;

      if (existing) {
        // Update existing override
        await ctx.db.patch(existing._id, {
          startTime,
          endTime,
          updatedAt: now,
        });
        availabilityId = existing._id;
      } else {
        // Create new override
        availabilityId = await ctx.db.insert("providerAvailability", {
          userId: args.userId,
          clinicId: args.clinicId,
          dayOfWeek: "monday", // Required but not used for overrides
          startTime,
          endTime,
          isRecurring: false,
          overrideDate: args.overrideDate,
          tenantId: args.tenantId,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Log audit event
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logAvailabilityChange({
        tenantId: args.tenantId,
        userId: args.userId,
        providerId: undefined,
        action: existing ? "availability_updated" : "availability_override_added",
        locationId: undefined,
        overrideDate: args.overrideDate,
        startTime,
        endTime,
        details: {
          clinicId: args.clinicId,
          clinicName: clinic.name,
          isUnavailable: startTime === "00:00" && endTime === "00:00",
        },
      });

      return { success: true, id: availabilityId };
    } catch (error) {
      throw new Error(`Failed to set override: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

/**
 * Remove a date-specific override for a user at a clinic
 */
export const removeUserClinicAvailabilityOverride = mutation({
  args: {
    id: v.id("providerAvailability"),
    tenantId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const availability = await ctx.db.get(args.id);
    if (!availability) {
      throw new Error("Override not found");
    }
    if (availability.tenantId !== args.tenantId) {
      throw new Error("Unauthorized");
    }
    if (availability.userId !== args.userId) {
      throw new Error("You can only remove your own overrides");
    }
    if (availability.isRecurring) {
      throw new Error("Cannot remove recurring availability with this function");
    }

    try {
      await ctx.db.delete(args.id);

      const logger = createHIPAAAuditLogger(ctx);
      await logger.logAvailabilityChange({
        tenantId: args.tenantId,
        userId: args.userId,
        providerId: undefined,
        action: "availability_override_removed",
        locationId: undefined,
        overrideDate: availability.overrideDate,
        details: { clinicId: availability.clinicId },
      });

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to remove override: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

/**
 * Get user availability for a specific clinic
 */
export const getUserClinicAvailability = query({
  args: {
    userId: v.id("users"),
    clinicId: v.id("clinics"),
    startDate: v.number(),
    endDate: v.number(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get recurring availability for this clinic
    const recurring = await ctx.db
      .query("providerAvailability")
      .withIndex("by_user_clinic", (q) => 
        q.eq("userId", args.userId).eq("clinicId", args.clinicId)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("isRecurring"), true),
          q.eq(q.field("tenantId"), args.tenantId)
        )
      )
      .collect();

    // Get overrides in date range
    const overrides = await ctx.db
      .query("providerAvailability")
      .withIndex("by_override_date", (q) => 
        q.gte("overrideDate", args.startDate).lte("overrideDate", args.endDate)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("clinicId"), args.clinicId),
          q.eq(q.field("isRecurring"), false),
          q.eq(q.field("tenantId"), args.tenantId)
        )
      )
      .collect();

    return {
      recurring,
      overrides,
    };
  },
});

/**
 * Get available time slots for a user at a specific clinic
 * Uses clinic timezone for correct slot generation and subtracts booked appointments
 * Now also respects clinic opening hours (intersects provider availability with opening hours)
 */
export const getClinicAvailableTimeSlots = query({
  args: {
    userId: v.id("users"),
    clinicId: v.id("clinics"),
    startDate: v.number(), // UTC timestamp
    endDate: v.number(), // UTC timestamp
    slotDuration: v.number(), // Duration in minutes (default: 30)
    tenantId: v.string(),
    patientId: v.optional(v.id("patients")), // Optional: for patient-side conflict checking
    sessionId: v.optional(v.string()), // Optional: browser session ID to exclude own locks
  },
  handler: async (ctx, args) => {
    const slotDuration = args.slotDuration || 30;
    
    // Get clinic details including timezone
    const clinic = await ctx.db.get(args.clinicId);
    if (!clinic || clinic.tenantId !== args.tenantId) {
      return [];
    }
    
    // Get the user (provider) for personal timezone override
    const user = await ctx.db.get(args.userId);
    
    // Timezone hierarchy (user's vision):
    // 1. Provider's personal timezone (for remote work scenarios)
    // 2. Clinic timezone
    // 3. Tenant (company) default timezone
    let timezone = user?.timezone; // Provider's personal timezone first
    if (!timezone) {
      timezone = clinic.timezone; // Then clinic timezone
    }
    if (!timezone) {
      // Fall back to tenant timezone
      const tenant = await ctx.db
        .query("tenants")
        .withIndex("by_tenant_id", (q) => q.eq("id", clinic.tenantId))
        .first();
      timezone = tenant?.settings?.timezone || 'UTC';
    }

    // Get user's recurring availability for this clinic
    const recurring = await ctx.db
      .query("providerAvailability")
      .withIndex("by_user_clinic", (q) => 
        q.eq("userId", args.userId).eq("clinicId", args.clinicId)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("isRecurring"), true),
          q.eq(q.field("tenantId"), args.tenantId)
        )
      )
      .collect();

    // Debug logging
    console.log('[getClinicAvailableTimeSlots] Debug:', {
      userId: args.userId,
      clinicId: args.clinicId,
      tenantId: args.tenantId,
      timezone,
      recurringAvailabilityCount: recurring.length,
      recurringAvailability: recurring.map(r => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime })),
    });

    // Get overrides in the date range
    const overrides = await ctx.db
      .query("providerAvailability")
      .withIndex("by_override_date", (q) => 
        q.gte("overrideDate", args.startDate).lte("overrideDate", args.endDate)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("clinicId"), args.clinicId),
          q.eq(q.field("isRecurring"), false),
          q.eq(q.field("tenantId"), args.tenantId)
        )
      )
      .collect();

    // Get existing appointments for this user (provider) at this clinic
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId).gte("scheduledAt", args.startDate).lte("scheduledAt", args.endDate)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();

    // If patientId is provided, also fetch patient's appointments to prevent patient double-booking
    let patientAppointments: typeof appointments = [];
    if (args.patientId) {
      const patientId = args.patientId; // Store in const for type narrowing
      patientAppointments = await ctx.db
        .query("appointments")
        .withIndex("by_patient_date", (q) => 
          q.eq("patientId", patientId)
            .gte("scheduledAt", args.startDate)
            .lte("scheduledAt", args.endDate)
        )
        .filter((q) => 
          q.and(
            q.eq(q.field("tenantId"), args.tenantId),
            q.neq(q.field("status"), "cancelled")
          )
        )
        .collect();
    }

    // Fetch active slot locks to prevent double-booking race conditions
    const now = Date.now();
    const slotLocks = await ctx.db
      .query("slotLocks")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("slotStart"), args.startDate),
          q.lte(q.field("slotStart"), args.endDate),
          q.gt(q.field("expiresAt"), now) // Only non-expired locks
        )
      )
      .collect();
    
    // Filter out own session's locks if sessionId provided
    const activeLocks = args.sessionId 
      ? slotLocks.filter(lock => lock.sessionId !== args.sessionId)
      : slotLocks;

    // Get clinic and company opening hours for the date range
    // Fetch all relevant opening hours upfront
    const clinicOpeningHours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic', (q) => 
        q.eq('tenantId', args.tenantId).eq('clinicId', args.clinicId)
      )
      .collect();

    const companyOpeningHours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic', (q) => 
        q.eq('tenantId', args.tenantId).eq('clinicId', undefined)
      )
      .collect();

    // Build maps for efficient lookup (use date strings as keys for overrides)
    const clinicRecurringHours = new Map<string, { startTime: string; endTime: string; isClosed?: boolean }>();
    const clinicOverrideHours = new Map<string, { startTime: string; endTime: string; isClosed?: boolean }>();
    const companyRecurringHours = new Map<string, { startTime: string; endTime: string; isClosed?: boolean }>();
    const companyOverrideHours = new Map<string, { startTime: string; endTime: string; isClosed?: boolean }>();

    for (const hours of clinicOpeningHours) {
      if (hours.isRecurring && hours.dayOfWeek) {
        clinicRecurringHours.set(hours.dayOfWeek, { 
          startTime: hours.startTime, 
          endTime: hours.endTime, 
          isClosed: hours.isClosed 
        });
      } else if (!hours.isRecurring && hours.overrideDate) {
        // overrideDate is already a YYYY-MM-DD string
        clinicOverrideHours.set(hours.overrideDate, { 
          startTime: hours.startTime, 
          endTime: hours.endTime, 
          isClosed: hours.isClosed 
        });
      }
    }

    for (const hours of companyOpeningHours) {
      if (hours.isRecurring && hours.dayOfWeek) {
        companyRecurringHours.set(hours.dayOfWeek, { 
          startTime: hours.startTime, 
          endTime: hours.endTime, 
          isClosed: hours.isClosed 
        });
      } else if (!hours.isRecurring && hours.overrideDate) {
        // overrideDate is already a YYYY-MM-DD string
        companyOverrideHours.set(hours.overrideDate, { 
          startTime: hours.startTime, 
          endTime: hours.endTime, 
          isClosed: hours.isClosed 
        });
      }
    }

    // Helper to get effective opening hours for a date
    const getOpeningHoursForDay = (dateString: string, dayOfWeek: string): { startTime: string; endTime: string } | 'closed' | null => {
      // 1. Clinic override for this date
      const clinicOverride = clinicOverrideHours.get(dateString);
      if (clinicOverride) {
        if (clinicOverride.isClosed) return 'closed';
        return { startTime: clinicOverride.startTime, endTime: clinicOverride.endTime };
      }

      // 2. Company override for this date
      const companyOverride = companyOverrideHours.get(dateString);
      if (companyOverride) {
        if (companyOverride.isClosed) return 'closed';
        return { startTime: companyOverride.startTime, endTime: companyOverride.endTime };
      }

      // 3. Clinic recurring for this day
      const clinicRecurring = clinicRecurringHours.get(dayOfWeek);
      if (clinicRecurring) {
        if (clinicRecurring.isClosed) return 'closed';
        return { startTime: clinicRecurring.startTime, endTime: clinicRecurring.endTime };
      }

      // 4. Company recurring for this day
      const companyRecurring = companyRecurringHours.get(dayOfWeek);
      if (companyRecurring) {
        if (companyRecurring.isClosed) return 'closed';
        return { startTime: companyRecurring.startTime, endTime: companyRecurring.endTime };
      }

      // No opening hours defined - return null (unrestricted)
      return null;
    };

    // Build recurring availability map by day
    const recurringMap = new Map<string, { startTime: string; endTime: string }>();
    for (const avail of recurring) {
      recurringMap.set(avail.dayOfWeek, {
        startTime: avail.startTime,
        endTime: avail.endTime,
      });
    }

    // Build override map by date string
    const overrideMap = new Map<string, { startTime: string; endTime: string } | 'unavailable'>();
    for (const override of overrides) {
      if (override.overrideDate) {
        const dateStr = getDateStringInTimezone(override.overrideDate, timezone);
        if (override.startTime === '00:00' && override.endTime === '00:00') {
          overrideMap.set(dateStr, 'unavailable');
        } else {
          overrideMap.set(dateStr, {
            startTime: override.startTime,
            endTime: override.endTime,
          });
        }
      }
    }

    // Generate slots for each day in the range
    const slots: Array<{ dateTime: number; available: boolean }> = [];
    
    // Calculate number of days in range
    const msPerDay = 24 * 60 * 60 * 1000;
    const numDays = Math.ceil((args.endDate - args.startDate) / msPerDay) + 1;
    
    // Get days in clinic timezone
    const days = getNextDaysInTimezone(args.startDate, numDays, timezone);
    
    for (const day of days) {
      // Skip if midnight is past the end date
      if (day.midnightUTC > args.endDate) continue;
      
      // Get opening hours for this day
      const openingHours = getOpeningHoursForDay(day.dateString, day.dayOfWeek);
      
      // If clinic is closed on this day, skip
      if (openingHours === 'closed') {
        continue;
      }
      
      // Check for provider override first
      const override = overrideMap.get(day.dateString);
      
      let providerAvailability: { startTime: string; endTime: string } | null = null;
      
      if (override === 'unavailable') {
        // Provider marked as unavailable - no slots
        continue;
      } else if (override) {
        // Use override times
        providerAvailability = override;
      } else {
        // Use recurring schedule
        const recurring = recurringMap.get(day.dayOfWeek);
        if (recurring) {
          providerAvailability = recurring;
        }
      }
      
      // Determine effective availability (intersection of provider and opening hours)
      let dayAvailability: { startTime: string; endTime: string } | null = null;
      
      if (providerAvailability && openingHours) {
        // Intersect provider availability with opening hours
        dayAvailability = intersectTimeWindows(providerAvailability, openingHours);
      } else if (providerAvailability) {
        // Only provider availability (no opening hours restriction)
        dayAvailability = providerAvailability;
      } else if (openingHours) {
        // No provider availability - no slots even if clinic is open
        continue;
      }
      
      if (!dayAvailability) {
        // No availability for this day
        continue;
      }
      
      // Generate time slots for this day
      const daySlots = generateTimeSlotsForDay(
        day.midnightUTC,
        dayAvailability.startTime,
        dayAvailability.endTime,
        slotDuration,
        timezone
      );
      
      // Check each slot against appointments
      for (const slot of daySlots) {
        // Skip slots before start date
        if (slot.startTimestamp < args.startDate) continue;
        // Skip slots after end date
        if (slot.startTimestamp > args.endDate) continue;
        
        // Check for provider appointment conflicts (using correct overlap logic)
        const hasProviderConflict = appointments.some((apt) => {
          const aptStart = apt.scheduledAt;
          const aptEnd = aptStart + (apt.duration * 60 * 1000);
          // Overlap: slot.start < apt.end AND slot.end > apt.start
          return slot.startTimestamp < aptEnd && slot.endTimestamp > aptStart;
        });

        // Check for patient appointment conflicts (if patientId is provided)
        const hasPatientConflict = patientAppointments.some((apt) => {
          const aptStart = apt.scheduledAt;
          const aptEnd = aptStart + (apt.duration * 60 * 1000);
          // Overlap: slot.start < apt.end AND slot.end > apt.start
          return slot.startTimestamp < aptEnd && slot.endTimestamp > aptStart;
        });
        
        // Check for active slot locks (prevents double-booking during booking process)
        const hasSlotLock = activeLocks.some((lock) => {
          // Lock overlaps if: lock.start < slot.end AND lock.end > slot.start
          return lock.slotStart < slot.endTimestamp && lock.slotEnd > slot.startTimestamp;
        });
        
        slots.push({
          dateTime: slot.startTimestamp,
          available: !hasProviderConflict && !hasPatientConflict && !hasSlotLock,
        });
      }
    }
    
    return slots;
  },
});

/**
 * Get user availability windows for a date range across all their clinics
 * Returns availability windows (not discrete slots) for calendar visualization
 * Each window includes the clinic info for display
 */
export const getUserClinicAvailabilityWindows = query({
  args: {
    userId: v.id("users"),
    startDate: v.number(), // UTC timestamp
    endDate: v.number(), // UTC timestamp
    tenantId: v.string(),
    clinicIds: v.optional(v.array(v.id("clinics"))), // Optional: filter to specific clinics
  },
  handler: async (ctx, args) => {
    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { windows: [], clinics: [] };
    }
    if (user.tenantId !== args.tenantId) {
      return { windows: [], clinics: [] };
    }

    // Get user's assigned clinics
    const userClinicIds = user.clinics ?? [];
    if (userClinicIds.length === 0) {
      return { windows: [], clinics: [] };
    }

    // Filter to requested clinics if specified
    const targetClinicIds = args.clinicIds
      ? userClinicIds.filter(id => args.clinicIds!.includes(id as Id<"clinics">))
      : userClinicIds;

    if (targetClinicIds.length === 0) {
      return { windows: [], clinics: [] };
    }

    // Fetch clinic details
    const clinicsData: Array<{
      id: string;
      name: string;
      timezone: string;
      type?: string;
    }> = [];

    const clinicTimezones = new Map<string, string>();

    for (const clinicId of targetClinicIds) {
      const clinic = await ctx.db.get(clinicId as Id<"clinics">);
      if (clinic && clinic.tenantId === args.tenantId && clinic.isActive) {
        // Get effective timezone
        let timezone = clinic.timezone;
        if (!timezone) {
          const tenant = await ctx.db
            .query("tenants")
            .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
            .first();
          timezone = tenant?.settings?.timezone || 'UTC';
        }
        
        clinicsData.push({
          id: clinic._id,
          name: clinic.name,
          timezone,
          type: clinic.type,
        });
        clinicTimezones.set(clinic._id, timezone);
      }
    }

    // Get recurring availability across all clinics
    const allRecurring = await ctx.db
      .query("providerAvailability")
      .withIndex("by_user_tenant", (q) => 
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .filter((q) => q.eq(q.field("isRecurring"), true))
      .collect();

    // Filter to target clinics
    const recurringByClinic = new Map<string, typeof allRecurring>();
    for (const avail of allRecurring) {
      if (avail.clinicId && targetClinicIds.includes(avail.clinicId as string)) {
        const existing = recurringByClinic.get(avail.clinicId) || [];
        existing.push(avail);
        recurringByClinic.set(avail.clinicId, existing);
      }
    }

    // Get overrides in the date range
    const allOverrides = await ctx.db
      .query("providerAvailability")
      .withIndex("by_override_date", (q) => 
        q.gte("overrideDate", args.startDate).lte("overrideDate", args.endDate)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("isRecurring"), false),
          q.eq(q.field("tenantId"), args.tenantId)
        )
      )
      .collect();

    // Group overrides by clinic and date
    const overridesByClinicDate = new Map<string, Map<string, typeof allOverrides[0]>>();
    for (const override of allOverrides) {
      if (override.clinicId && override.overrideDate && targetClinicIds.includes(override.clinicId as string)) {
        const timezone = clinicTimezones.get(override.clinicId) || 'UTC';
        const dateStr = getDateStringInTimezone(override.overrideDate, timezone);
        
        if (!overridesByClinicDate.has(override.clinicId)) {
          overridesByClinicDate.set(override.clinicId, new Map());
        }
        overridesByClinicDate.get(override.clinicId)!.set(dateStr, override);
      }
    }

    // Generate availability windows for each day in the range
    const windows: Array<{
      clinicId: string;
      clinicName: string;
      date: string; // YYYY-MM-DD in clinic timezone
      dayOfWeek: string;
      startTime: string; // HH:mm in clinic timezone
      endTime: string; // HH:mm in clinic timezone
      startTimestamp: number; // UTC timestamp
      endTimestamp: number; // UTC timestamp
      isOverride: boolean;
    }> = [];

    // Calculate number of days in range
    const msPerDay = 24 * 60 * 60 * 1000;
    const numDays = Math.ceil((args.endDate - args.startDate) / msPerDay) + 1;

    // Fetch opening hours for all relevant clinics
    const allOpeningHours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant', (q) => q.eq('tenantId', args.tenantId))
      .collect();

    // Store raw opening hours data for processing per clinic
    const openingHoursRawByClinic = new Map<string | undefined, {
      recurring: Array<{ dayOfWeek: string; startTime: string; endTime: string; isClosed?: boolean }>;
      overrides: Array<{ overrideDate: string; startTime: string; endTime: string; isClosed?: boolean }>;
    }>();

    for (const hours of allOpeningHours) {
      const clinicKey = hours.clinicId ?? undefined;
      if (!openingHoursRawByClinic.has(clinicKey)) {
        openingHoursRawByClinic.set(clinicKey, { recurring: [], overrides: [] });
      }
      const data = openingHoursRawByClinic.get(clinicKey)!;
      if (hours.isRecurring && hours.dayOfWeek) {
        data.recurring.push({ 
          dayOfWeek: hours.dayOfWeek,
          startTime: hours.startTime, 
          endTime: hours.endTime, 
          isClosed: hours.isClosed 
        });
      } else if (!hours.isRecurring && hours.overrideDate) {
        data.overrides.push({ 
          overrideDate: hours.overrideDate,
          startTime: hours.startTime, 
          endTime: hours.endTime, 
          isClosed: hours.isClosed 
        });
      }
    }

    // Process each clinic
    for (const clinicData of clinicsData) {
      const clinicId = clinicData.id;
      const timezone = clinicData.timezone;
      const recurring = recurringByClinic.get(clinicId) || [];
      const overrides = overridesByClinicDate.get(clinicId) || new Map();

      // Get opening hours data for this clinic and company
      const clinicOpeningHoursRaw = openingHoursRawByClinic.get(clinicId as Id<'clinics'>) || { recurring: [], overrides: [] };
      const companyOpeningHoursRaw = openingHoursRawByClinic.get(undefined) || { recurring: [], overrides: [] };

      // Build maps with timezone-converted date strings for overrides
      const clinicRecurringHoursMap = new Map<string, { startTime: string; endTime: string; isClosed?: boolean }>();
      const clinicOverrideHoursMap = new Map<string, { startTime: string; endTime: string; isClosed?: boolean }>();
      const companyRecurringHoursMap = new Map<string, { startTime: string; endTime: string; isClosed?: boolean }>();
      const companyOverrideHoursMap = new Map<string, { startTime: string; endTime: string; isClosed?: boolean }>();

      for (const r of clinicOpeningHoursRaw.recurring) {
        clinicRecurringHoursMap.set(r.dayOfWeek, { startTime: r.startTime, endTime: r.endTime, isClosed: r.isClosed });
      }
      for (const o of clinicOpeningHoursRaw.overrides) {
        // overrideDate is already a YYYY-MM-DD string
        clinicOverrideHoursMap.set(o.overrideDate, { startTime: o.startTime, endTime: o.endTime, isClosed: o.isClosed });
      }
      for (const r of companyOpeningHoursRaw.recurring) {
        companyRecurringHoursMap.set(r.dayOfWeek, { startTime: r.startTime, endTime: r.endTime, isClosed: r.isClosed });
      }
      for (const o of companyOpeningHoursRaw.overrides) {
        // overrideDate is already a YYYY-MM-DD string
        companyOverrideHoursMap.set(o.overrideDate, { startTime: o.startTime, endTime: o.endTime, isClosed: o.isClosed });
      }

      // Helper to get effective opening hours for a date
      const getOpeningHoursForDay = (dateString: string, dayOfWeek: string): { startTime: string; endTime: string } | 'closed' | null => {
        // 1. Clinic override
        const clinicOverride = clinicOverrideHoursMap.get(dateString);
        if (clinicOverride) {
          if (clinicOverride.isClosed) return 'closed';
          return { startTime: clinicOverride.startTime, endTime: clinicOverride.endTime };
        }
        // 2. Company override
        const companyOverride = companyOverrideHoursMap.get(dateString);
        if (companyOverride) {
          if (companyOverride.isClosed) return 'closed';
          return { startTime: companyOverride.startTime, endTime: companyOverride.endTime };
        }
        // 3. Clinic recurring
        const clinicRecurring = clinicRecurringHoursMap.get(dayOfWeek);
        if (clinicRecurring) {
          if (clinicRecurring.isClosed) return 'closed';
          return { startTime: clinicRecurring.startTime, endTime: clinicRecurring.endTime };
        }
        // 4. Company recurring
        const companyRecurring = companyRecurringHoursMap.get(dayOfWeek);
        if (companyRecurring) {
          if (companyRecurring.isClosed) return 'closed';
          return { startTime: companyRecurring.startTime, endTime: companyRecurring.endTime };
        }
        return null;
      };

      // Build recurring map by day
      const recurringMap = new Map<string, { startTime: string; endTime: string }>();
      for (const avail of recurring) {
        recurringMap.set(avail.dayOfWeek, {
          startTime: avail.startTime,
          endTime: avail.endTime,
        });
      }

      // Get days in clinic timezone
      const days = getNextDaysInTimezone(args.startDate, numDays, timezone);

      for (const day of days) {
        // Skip if past end date
        if (day.midnightUTC > args.endDate) continue;

        // Check opening hours for this day
        const openingHours = getOpeningHoursForDay(day.dateString, day.dayOfWeek);
        if (openingHours === 'closed') {
          continue; // Clinic is closed on this day
        }

        // Check for provider override
        const override = overrides.get(day.dateString);

        let providerAvailability: { startTime: string; endTime: string } | null = null;
        let isOverride = false;

        if (override) {
          // Check if unavailable
          if (override.startTime === '00:00' && override.endTime === '00:00') {
            // Provider unavailable - skip this day for this clinic
            continue;
          }
          providerAvailability = {
            startTime: override.startTime,
            endTime: override.endTime,
          };
          isOverride = true;
        } else {
          // Use recurring schedule
          const rec = recurringMap.get(day.dayOfWeek);
          if (rec) {
            providerAvailability = rec;
          }
        }

        if (!providerAvailability) {
          // No provider availability for this day at this clinic
          continue;
        }

        // Intersect provider availability with opening hours
        let dayAvailability: { startTime: string; endTime: string } | null = null;
        if (openingHours) {
          dayAvailability = intersectTimeWindows(providerAvailability, openingHours);
        } else {
          // No opening hours restriction
          dayAvailability = providerAvailability;
        }

        if (!dayAvailability) {
          // No overlap between provider availability and opening hours
          continue;
        }

        // Calculate UTC timestamps for the window
        const [startHour, startMin] = dayAvailability.startTime.split(':').map(Number);
        const [endHour, endMin] = dayAvailability.endTime.split(':').map(Number);
        
        // Convert local times to UTC timestamps using the day's midnight
        const startTimestamp = day.midnightUTC + ((startHour ?? 0) * 60 + (startMin ?? 0)) * 60 * 1000;
        const endTimestamp = day.midnightUTC + ((endHour ?? 0) * 60 + (endMin ?? 0)) * 60 * 1000;

        windows.push({
          clinicId,
          clinicName: clinicData.name,
          date: day.dateString,
          dayOfWeek: day.dayOfWeek,
          startTime: dayAvailability.startTime,
          endTime: dayAvailability.endTime,
          startTimestamp,
          endTimestamp,
          isOverride,
        });
      }
    }

    // Sort windows by start timestamp
    windows.sort((a, b) => a.startTimestamp - b.startTimestamp);

    return {
      windows,
      clinics: clinicsData,
    };
  },
});

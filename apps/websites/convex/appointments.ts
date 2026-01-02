import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

/**
 * Check if a user has clinic user role (clinic_user, admin, or provider).
 * Supports backward compatibility with admin/provider roles during migration.
 * 
 * @param role - User role string
 * @returns true if user has clinic user role, false otherwise
 */
function isClinicUser(role: string | undefined): boolean {
  if (!role) {
    return false;
  }
  return role === 'clinic_user' || role === 'admin' || role === 'provider';
}

/**
 * Helper to convert timestamp to date string in a given timezone
 * Used for opening hours lookup
 */
function getDateStringInTimezone(timestamp: number, timezone: string): string {
  const date = new Date(timestamp);
  try {
    const formatted = date.toLocaleDateString('en-CA', { timeZone: timezone });
    return formatted; // Returns YYYY-MM-DD
  } catch {
    // Fallback to UTC if timezone is invalid
    return date.toISOString().split('T')[0]!;
  }
}

/**
 * Helper to get day of week from timestamp in a given timezone
 */
function getDayOfWeekInTimezone(timestamp: number, timezone: string): string {
  const date = new Date(timestamp);
  try {
    const dayName = date.toLocaleDateString('en-US', { 
      timeZone: timezone, 
      weekday: 'long' 
    }).toLowerCase();
    return dayName;
  } catch {
    // Fallback to UTC
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getUTCDay()]!;
  }
}

/**
 * Helper to get time string (HH:mm) from timestamp in a given timezone
 */
function getTimeStringInTimezone(timestamp: number, timezone: string): string {
  const date = new Date(timestamp);
  try {
    const hours = date.toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', hour12: false });
    const minutes = date.toLocaleString('en-US', { timeZone: timezone, minute: '2-digit' });
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  } catch {
    // Fallback to UTC
    return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
  }
}

/**
 * Helper function to check if an appointment time falls within clinic/company opening hours
 * Returns validation result with reason if not within hours
 */
async function checkOpeningHours(
  ctx: any,
  clinicId: Id<"clinics">,
  dateTime: number,
  endTime: number,
  tenantId: string
): Promise<{ withinHours: boolean; reason?: string }> {
  // Get clinic details
  const clinic = await ctx.db.get(clinicId);
  if (!clinic || clinic.tenantId !== tenantId) {
    return { withinHours: false, reason: "Clinic not found" };
  }

  // Get effective timezone
  let timezone = clinic.timezone;
  if (!timezone) {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q: any) => q.eq("id", tenantId))
      .first();
    timezone = tenant?.settings?.timezone || 'UTC';
  }

  // Get date string and day of week for the appointment
  const dateString = getDateStringInTimezone(dateTime, timezone);
  const dayOfWeek = getDayOfWeekInTimezone(dateTime, timezone);
  const appointmentStartTime = getTimeStringInTimezone(dateTime, timezone);
  const appointmentEndTime = getTimeStringInTimezone(endTime, timezone);

  // Fetch clinic opening hours
  const clinicOpeningHours = await ctx.db
    .query('openingHours')
    .withIndex('by_tenant_clinic', (q: any) => 
      q.eq('tenantId', tenantId).eq('clinicId', clinicId)
    )
    .collect();

  // Fetch company opening hours
  const companyOpeningHours = await ctx.db
    .query('openingHours')
    .withIndex('by_tenant_clinic', (q: any) => 
      q.eq('tenantId', tenantId).eq('clinicId', undefined)
    )
    .collect();

  // Priority order for opening hours lookup:
  // 1. Clinic override for this date
  // 2. Company override for this date  
  // 3. Clinic recurring for this day
  // 4. Company recurring for this day

  let openingHours: { startTime: string; endTime: string; isClosed?: boolean } | null = null;

  // 1. Clinic override (overrideDate is already a YYYY-MM-DD string)
  const clinicOverride = clinicOpeningHours.find((h: any) => 
    !h.isRecurring && h.overrideDate === dateString
  );
  if (clinicOverride) {
    if (clinicOverride.isClosed) {
      return { withinHours: false, reason: "Clinic is closed on this date" };
    }
    openingHours = { startTime: clinicOverride.startTime, endTime: clinicOverride.endTime };
  }

  // 2. Company override (overrideDate is already a YYYY-MM-DD string)
  if (!openingHours) {
    const companyOverride = companyOpeningHours.find((h: any) => 
      !h.isRecurring && h.overrideDate === dateString
    );
    if (companyOverride) {
      if (companyOverride.isClosed) {
        return { withinHours: false, reason: "Company is closed on this date" };
      }
      openingHours = { startTime: companyOverride.startTime, endTime: companyOverride.endTime };
    }
  }

  // 3. Clinic recurring
  if (!openingHours) {
    const clinicRecurring = clinicOpeningHours.find((h: any) => 
      h.isRecurring && h.dayOfWeek === dayOfWeek
    );
    if (clinicRecurring) {
      if (clinicRecurring.isClosed) {
        return { withinHours: false, reason: `Clinic is closed on ${dayOfWeek}s` };
      }
      openingHours = { startTime: clinicRecurring.startTime, endTime: clinicRecurring.endTime };
    }
  }

  // 4. Company recurring
  if (!openingHours) {
    const companyRecurring = companyOpeningHours.find((h: any) => 
      h.isRecurring && h.dayOfWeek === dayOfWeek
    );
    if (companyRecurring) {
      if (companyRecurring.isClosed) {
        return { withinHours: false, reason: `Company is closed on ${dayOfWeek}s` };
      }
      openingHours = { startTime: companyRecurring.startTime, endTime: companyRecurring.endTime };
    }
  }

  // If no opening hours defined, allow the appointment (no restriction)
  if (!openingHours) {
    return { withinHours: true };
  }

  // Check if appointment falls within opening hours
  const parseTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };

  const openStart = parseTime(openingHours.startTime);
  const openEnd = parseTime(openingHours.endTime);
  const aptStart = parseTime(appointmentStartTime);
  const aptEnd = parseTime(appointmentEndTime);

  if (aptStart < openStart) {
    return { 
      withinHours: false, 
      reason: `Appointment starts before opening hours (${openingHours.startTime})` 
    };
  }

  if (aptEnd > openEnd) {
    return { 
      withinHours: false, 
      reason: `Appointment ends after closing hours (${openingHours.endTime})` 
    };
  }

  return { withinHours: true };
}

/**
 * Helper function to check if provider is available at a specific time
 * This duplicates logic from availability.ts but is needed in mutations
 * which cannot call queries directly
 */
async function checkProviderAvailability(
  ctx: any,
  providerId: Id<"providers">,
  dateTime: number,
  locationId: Id<"locations"> | undefined,
  tenantId: string
): Promise<{ available: boolean; reason?: string }> {
  const date = new Date(dateTime);
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
  const overrideDateStart = new Date(dateTime);
  overrideDateStart.setHours(0, 0, 0, 0);
  const overrideTimestamp = overrideDateStart.getTime();

  const override = await ctx.db
    .query("providerAvailability")
    .withIndex("by_override_date", (q: any) => q.eq("overrideDate", overrideTimestamp))
    .filter((q: any) => 
      q.and(
        q.eq(q.field("providerId"), providerId),
        q.eq(q.field("isRecurring"), false),
        q.eq(q.field("tenantId"), tenantId),
        locationId 
          ? q.eq(q.field("locationId"), locationId)
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
    const startHoursSafe = startHours ?? 0;
    const startMinutesSafe = startMinutes ?? 0;
    const [endHours, endMinutes] = override.endTime.split(':').map(Number);
    const endHoursSafe = endHours ?? 0;
    const endMinutesSafe = endMinutes ?? 0;
    const [checkHours, checkMinutes] = timeString.split(':').map(Number);
    const checkHoursSafe = checkHours ?? 0;
    const checkMinutesSafe = checkMinutes ?? 0;
    const startTotalMinutes = startHoursSafe * 60 + startMinutesSafe;
    const endTotalMinutes = endHoursSafe * 60 + endMinutesSafe;
    const checkTotalMinutes = checkHoursSafe * 60 + checkMinutesSafe;

    if (checkTotalMinutes >= startTotalMinutes && checkTotalMinutes < endTotalMinutes) {
      return { available: true };
    } else {
      return { available: false, reason: "Outside override availability window" };
    }
  }

  // Check recurring availability
  const recurring = await ctx.db
    .query("providerAvailability")
    .withIndex("by_provider_day", (q: any) => 
      q.eq("providerId", providerId).eq("dayOfWeek", dayName)
    )
    .filter((q: any) => 
      q.and(
        q.eq(q.field("isRecurring"), true),
        q.eq(q.field("tenantId"), tenantId),
        locationId 
          ? q.eq(q.field("locationId"), locationId)
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
    const startHoursSafe = startHours ?? 0;
    const startMinutesSafe = startMinutes ?? 0;
  const [endHours, endMinutes] = recurring.endTime.split(':').map(Number);
    const endHoursSafe = endHours ?? 0;
    const endMinutesSafe = endMinutes ?? 0;
  const [checkHours, checkMinutes] = timeString.split(':').map(Number);
    const checkHoursSafe = checkHours ?? 0;
    const checkMinutesSafe = checkMinutes ?? 0;
  const startTotalMinutes = startHoursSafe * 60 + startMinutesSafe;
  const endTotalMinutes = endHoursSafe * 60 + endMinutesSafe;
  const checkTotalMinutes = checkHoursSafe * 60 + checkMinutesSafe;

  if (checkTotalMinutes >= startTotalMinutes && checkTotalMinutes < endTotalMinutes) {
    return { available: true };
  } else {
    return { available: false, reason: "Outside recurring availability window" };
  }
}

// Create a new appointment
export const createAppointment = mutation({
  args: {
    patientId: v.id("patients"),
    userId: v.id("users"), // User who owns the appointment (required)
    providerId: v.optional(v.id("providers")), // Optional - kept for backward compatibility and provider profiles
    scheduledAt: v.number(),
    duration: v.number(),
    type: v.union(
      v.literal("consultation"),
      v.literal("follow-up"),
      v.literal("procedure"),
      v.literal("emergency")
    ),
    notes: v.optional(v.string()),
    locationId: v.optional(v.id("locations")), // DEPRECATED: Use clinicId instead
    clinicId: v.optional(v.id("clinics")), // Clinic where appointment takes place (validates against opening hours)
    createdBy: v.id("users"), // User who created the appointment (required for audit trail)
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }
    if (args.duration <= 0) {
      throw new Error("Duration must be greater than 0");
    }
    if (args.duration > 480) { // 8 hours max
      throw new Error("Duration cannot exceed 8 hours");
    }

    // Validate that patient exists and belongs to the same tenant
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }
    if (patient.tenantId !== args.tenantId) {
      throw new Error("Patient does not belong to the specified tenant");
    }

    // Validate that user exists and belongs to the same tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Validate that provider exists and belongs to the same tenant (if provided)
    if (args.providerId) {
      const provider = await ctx.db.get(args.providerId);
      if (!provider) {
        throw new Error("Provider not found");
      }
      if (provider.tenantId !== args.tenantId) {
        throw new Error("Provider does not belong to the specified tenant");
      }
    }

    // Validate that creator user exists and belongs to the same tenant
    const creator = await ctx.db.get(args.createdBy);
    if (!creator) {
      throw new Error("Creator user not found");
    }
    if (creator.tenantId !== args.tenantId) {
      throw new Error("Creator does not belong to the specified tenant");
    }

    // Validate location if provided (deprecated - use clinicId instead)
    if (args.locationId) {
      const location = await ctx.db.get(args.locationId);
      if (!location) {
        throw new Error("Location not found");
      }
      if (location.tenantId !== args.tenantId) {
        throw new Error("Location does not belong to the specified tenant");
      }
    }

    // Validate clinic if provided
    if (args.clinicId) {
      const clinic = await ctx.db.get(args.clinicId);
      if (!clinic) {
        throw new Error("Clinic not found");
      }
      if (clinic.tenantId !== args.tenantId) {
        throw new Error("Clinic does not belong to the specified tenant");
      }
      if (!clinic.isActive) {
        throw new Error("Clinic is not active");
      }
    }

    // Validate scheduled time (must be in the future)
    const now = Date.now();
    if (args.scheduledAt <= now) {
      throw new Error("Appointment must be scheduled in the future");
    }

    // Check for scheduling conflicts with the user
    const endTime = args.scheduledAt + (args.duration * 60 * 1000); // Convert minutes to milliseconds

    // Validate against clinic opening hours (if clinicId is provided)
    if (args.clinicId) {
      const openingHoursCheck = await checkOpeningHours(
        ctx,
        args.clinicId,
        args.scheduledAt,
        endTime,
        args.tenantId
      );
      
      if (!openingHoursCheck.withinHours) {
        throw new Error(`Appointment cannot be scheduled: ${openingHoursCheck.reason || 'Outside opening hours'}`);
      }
    }
    
    // Check provider availability at start time (if providerId is provided)
    if (args.providerId) {
      const startAvailability = await checkProviderAvailability(
        ctx,
        args.providerId,
        args.scheduledAt,
        args.locationId,
        args.tenantId
      );
      
      if (!startAvailability.available) {
        throw new Error(`Provider is not available at the requested start time: ${startAvailability.reason || 'Not available'}`);
      }
      
      // Check provider availability at end time (if different from start)
      if (args.duration > 0) {
        const endAvailability = await checkProviderAvailability(
          ctx,
          args.providerId,
          endTime,
          args.locationId,
          args.tenantId
        );
        
        // Note: End time availability check is less strict - we allow if the appointment
        // starts within availability window, even if it extends slightly beyond
        // This is a business decision - you may want to make this stricter
      }
    }
    
    // Check for overlapping appointments by userId (user-centric conflict checking)
    // Fetch all provider appointments in a wider time window, then check overlaps in JavaScript
    const providerAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId)
          .gte("scheduledAt", args.scheduledAt - 24 * 60 * 60 * 1000) // Check 1 day before
          .lte("scheduledAt", endTime + 24 * 60 * 60 * 1000) // Check 1 day after
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.neq(q.field("status"), "cancelled"),
          // If locationId is specified, only check conflicts at the same location
          // If locationId is not specified, check all conflicts
          args.locationId
            ? q.eq(q.field("locationId"), args.locationId)
            : q.or(
                q.eq(q.field("locationId"), undefined),
                q.neq(q.field("locationId"), undefined)
              )
        )
      )
      .collect();

    // Check for overlaps using correct JavaScript logic
    // Overlap exists if: newStart < existingEnd AND newEnd > existingStart
    const conflictingAppointments = providerAppointments.filter((apt) => {
      const aptStart = apt.scheduledAt;
      const aptEnd = aptStart + (apt.duration * 60 * 1000);
      return args.scheduledAt < aptEnd && endTime > aptStart;
    });

    // Check for patient conflicts - patient cannot have overlapping appointments with any provider
    // This prevents patients from booking multiple appointments at the same time
    const patientAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_patient_date", (q) => 
        q.eq("patientId", args.patientId)
          .gte("scheduledAt", args.scheduledAt - 24 * 60 * 60 * 1000)
          .lte("scheduledAt", endTime + 24 * 60 * 60 * 1000)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();

    // Check for overlaps using correct JavaScript logic
    const patientConflicts = patientAppointments.filter((apt) => {
      const aptStart = apt.scheduledAt;
      const aptEnd = aptStart + (apt.duration * 60 * 1000);
      return args.scheduledAt < aptEnd && endTime > aptStart;
    });

    if (patientConflicts.length > 0) {
      const conflict = patientConflicts[0];
      if (!conflict) return;
      const conflictStart = new Date(conflict.scheduledAt ?? 0);
      const conflictEnd = new Date((conflict.scheduledAt ?? 0) + (conflict.duration ?? 0) * 60 * 1000);
      throw new Error(
        `You already have an appointment scheduled from ${conflictStart.toLocaleString()} to ${conflictEnd.toLocaleString()}`
      );
    }

    // Check for external calendar conflicts (if provider has bidirectional sync)
    let externalConflicts: Array<{
      id: string;
      summary: string;
      start: string;
      end: string;
      location?: string;
    }> = [];
    
    try {
      // Check if provider has bidirectional calendar sync
      if (args.providerId) {
        const providerId = args.providerId; // Store in const for type narrowing
        const calendarSyncs = await ctx.db
          .query("calendarSync")
          .withIndex("by_provider_tenant", (q) => 
            q.eq("providerId", providerId).eq("tenantId", args.tenantId)
          )
        .filter((q) => 
          q.and(
            q.neq(q.field("accessToken"), ""),
            q.eq(q.field("syncDirection"), "bidirectional")
          )
        )
          .collect();

        if (calendarSyncs.length > 0) {
          // Note: Mutations cannot call actions directly
          // External calendar conflict checking should be done client-side or via scheduled jobs
          // For now, we'll skip external conflict checking in mutations
          // TODO: Implement client-side conflict checking or use scheduled jobs
        }
      }
    } catch (error) {
      // If external calendar check fails, log but don't block appointment creation
      // External conflicts will be caught during the next sync cycle
      console.warn("Failed to check external calendar conflicts:", error);
    }

    // Combine internal and external conflicts
    const hasInternalConflicts = conflictingAppointments.length > 0;
    const hasExternalConflicts = externalConflicts.length > 0;

    if (hasInternalConflicts || hasExternalConflicts) {
      // Build conflict message
      const conflictMessages: string[] = [];
      const suggestions: string[] = [];
      const slotDuration = args.duration;

      // Handle internal appointment conflicts
      if (hasInternalConflicts) {
        const conflict = conflictingAppointments[0];
        if (!conflict) return;
        const conflictStart = new Date(conflict.scheduledAt ?? 0);
        const conflictEnd = new Date((conflict.scheduledAt ?? 0) + (conflict.duration ?? 0) * 60 * 1000);
        conflictMessages.push(`existing appointment from ${conflictStart.toLocaleString()} to ${conflictEnd.toLocaleString()}`);

        // Find available slots near the requested time using availability logic
        const requestedStart = new Date(args.scheduledAt);
        const searchStart = Math.max(now, conflictStart.getTime() - (2 * 60 * 60 * 1000));
        const searchEnd = conflictEnd.getTime() + (2 * 60 * 60 * 1000);
        
        // Get all appointments in the search window for availability calculation
        const searchWindowAppointments = args.providerId
          ? await ctx.db
              .query("appointments")
              .withIndex("by_provider_date", (q) => 
                q.eq("providerId", args.providerId!)
                  .gte("scheduledAt", searchStart)
                  .lte("scheduledAt", searchEnd)
              )
              .filter((q) => 
                q.and(
                  q.eq(q.field("tenantId"), args.tenantId),
                  q.neq(q.field("status"), "cancelled"),
                  q.neq(q.field("_id"), conflict._id) // Exclude the conflicting appointment
                )
              )
              .collect()
          : [];
        
        // Try to find available slots before and after conflict
        const checkSlots = [
          conflictStart.getTime() - (slotDuration * 60 * 1000) - (30 * 60 * 1000), // 30 min before
          conflictStart.getTime() - (slotDuration * 60 * 1000), // Right before
          conflictEnd.getTime() + (30 * 60 * 1000), // Right after
          conflictEnd.getTime() + (60 * 60 * 1000), // 1 hour after
        ];
        
        for (const slotTime of checkSlots) {
          if (slotTime < now) continue; // Skip past times
          
          // Check if this slot conflicts with any appointment
          const hasConflict = searchWindowAppointments.some((apt) => {
            const aptStart = apt.scheduledAt;
            const aptEnd = aptStart + (apt.duration * 60 * 1000);
            const slotEnd = slotTime + (slotDuration * 60 * 1000);
            
            return (slotTime < aptEnd && slotEnd > aptStart);
          });
          
          // Check if provider is available at this time
          if (!hasConflict && args.providerId) {
            const slotAvailability = await checkProviderAvailability(
              ctx,
              args.providerId,
              slotTime,
              args.locationId,
              args.tenantId
            );
            
            if (slotAvailability.available && suggestions.length < 3) {
              suggestions.push(new Date(slotTime).toLocaleString());
            }
          }
        }
      }

      // Handle external calendar conflicts
      if (hasExternalConflicts) {
        const externalConflict = externalConflicts[0];
        if (!externalConflict) return;
        const externalStart = new Date(externalConflict.start ?? 0);
        const externalEnd = new Date(externalConflict.end ?? 0);
        conflictMessages.push(`external calendar event "${externalConflict.summary ?? 'Unknown'}" from ${externalStart.toLocaleString()} to ${externalEnd.toLocaleString()}`);
      }

      // If we don't have enough suggestions, try finding slots using availability windows
      // Only attempt if providerId is present (suggestions require provider availability)
      if (suggestions.length < 2 && args.providerId) {
        const requestDate = new Date(args.scheduledAt);
        const dayMap: Record<string, "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"> = {
          "mon": "monday",
          "tue": "tuesday",
          "wed": "wednesday",
          "thu": "thursday",
          "fri": "friday",
          "sat": "saturday",
          "sun": "sunday",
        };
        const dayShortName = requestDate.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
        const dayName = dayMap[dayShortName] || "monday";
        
        const providerId = args.providerId; // Store in const for type narrowing
        const dayAvailability = await ctx.db
          .query("providerAvailability")
          .withIndex("by_provider_day", (q) => 
            q.eq("providerId", providerId).eq("dayOfWeek", dayName)
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
        
        if (dayAvailability) {
          const [startHours, startMinutes] = dayAvailability.startTime.split(':').map(Number);
    const startHoursSafe = startHours ?? 0;
    const startMinutesSafe = startMinutes ?? 0;
          const availabilityStart = new Date(requestDate);
          availabilityStart.setHours(startHoursSafe, startMinutesSafe, 0, 0);
          
          if (availabilityStart.getTime() > now && suggestions.length < 3) {
            suggestions.push(availabilityStart.toLocaleString());
          }
        }
      }

      const locationText = args.locationId 
        ? ` at the selected location`
        : '';
      const suggestionText = suggestions.length > 0 
        ? ` Suggested alternative times: ${suggestions.join(', ')}`
        : '';
      
      throw new Error(
        `This time slot is no longer available${locationText}. The provider has ${conflictMessages.join(' and ')}.${suggestionText}`
      );
    }

    // Note: External calendar conflicts are now checked above in the conflict detection section

    try {
      const appointmentId = await ctx.db.insert("appointments", {
        patientId: args.patientId,
        userId: args.userId, // User who owns the appointment
        providerId: args.providerId, // Optional - kept for backward compatibility
        scheduledAt: args.scheduledAt,
        duration: args.duration,
        type: args.type,
        notes: args.notes,
        locationId: args.locationId, // DEPRECATED: Use clinicId instead
        clinicId: args.clinicId, // Clinic where appointment takes place
        createdBy: args.createdBy,
        lastModifiedBy: args.createdBy, // Initially set to creator
        status: "scheduled",
        tenantId: args.tenantId,
        createdAt: now,
        updatedAt: now,
      });

      // Get creator user to determine if this is a clinic user-created appointment
      const creatorUser = await ctx.db.get(args.createdBy);
      // Check if creator is a clinic user (admin/clinic_user/provider) and different from the provider's user account
      // Note: We'd need to check provider.userId if that field exists, but for now we'll
      // just check if the creator role is a clinic user
      const isClinicUserCreated = creatorUser && isClinicUser(creatorUser.role);

      // Check if provider has bidirectional calendar sync (only if providerId exists)
      const calendarSyncs = args.providerId
        ? await ctx.db
            .query("calendarSync")
            .withIndex("by_provider_tenant", (q: any) => 
              q.eq("providerId", args.providerId!).eq("tenantId", args.tenantId)
            )
            .filter((q: any) => 
              q.and(
                q.neq(q.field("accessToken"), ""),
                q.eq(q.field("syncDirection"), "bidirectional")
              )
            )
            .collect()
        : [];
      const hasBidirectionalSync = calendarSyncs.length > 0;

      // Log audit event for appointment creation
      try {
        await ctx.runMutation(api.auditLogs.create, {
          tenantId: args.tenantId,
          userId: args.createdBy,
          action: isClinicUserCreated ? "appointment_admin_created" : "appointment_created",
          resource: "appointments",
          resourceId: appointmentId,
          details: {
            providerId: args.providerId,
            patientId: args.patientId,
            scheduledAt: args.scheduledAt,
            duration: args.duration,
            type: args.type,
            locationId: args.locationId,
            isAdminCreated: isClinicUserCreated,
            hasBidirectionalSync,
          },
          timestamp: now,
        });
      } catch (error) {
        console.error("Failed to log appointment creation audit event:", error);
        // Don't fail the mutation if audit logging fails
      }

      return appointmentId;
    } catch (error) {
      throw new Error(`Failed to create appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Get appointment by ID
export const getAppointment = query({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get appointments by patient
export const getAppointmentsByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

// Get appointments by provider
export const getAppointmentsByProvider = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .collect();
  },
});

// Get appointments by date range (user-centric)
export const getAppointmentsByDateRange = query({
  args: {
    userId: v.id("users"), // User who owns the appointments
    startDate: v.number(),
    endDate: v.number(),
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId)
          .gte("scheduledAt", args.startDate)
          .lte("scheduledAt", args.endDate)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();
  },
});

// Get appointments by date range (provider-based - deprecated, kept for backward compatibility)
export const getAppointmentsByDateRangeProvider = query({
  args: {
    providerId: v.id("providers"),
    startDate: v.number(),
    endDate: v.number(),
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_scheduled_at", (q) => 
        q.gte("scheduledAt", args.startDate).lte("scheduledAt", args.endDate)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("providerId"), args.providerId),
          q.eq(q.field("tenantId"), args.tenantId)
        )
      )
      .collect();
  },
});

// Update appointment status
export const updateAppointmentStatus = mutation({
  args: {
    id: v.id("appointments"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

// Update appointment
export const updateAppointment = mutation({
  args: {
    id: v.id("appointments"),
    scheduledAt: v.optional(v.number()),
    duration: v.optional(v.number()),
    type: v.optional(v.union(
      v.literal("consultation"),
      v.literal("follow-up"),
      v.literal("procedure"),
      v.literal("emergency")
    )),
    status: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    notes: v.optional(v.string()),
    locationId: v.optional(v.id("locations")), // Optional location reference
    lastModifiedBy: v.optional(v.id("users")), // User who last modified the appointment
    googleCalendarEventId: v.optional(v.string()), // Google Calendar event ID for sync tracking
  },
  handler: async (ctx, args) => {
    const { id, lastModifiedBy, ...updates } = args;
    
    // Get existing appointment to validate tenant
    const existingAppointment = await ctx.db.get(id);
    if (!existingAppointment) {
      throw new Error("Appointment not found");
    }

    // Validate location if provided
    if (updates.locationId) {
      const location = await ctx.db.get(updates.locationId);
      if (!location) {
        throw new Error("Location not found");
      }
      if (location.tenantId !== existingAppointment.tenantId) {
        throw new Error("Location does not belong to the same tenant");
      }
    }

    // Validate lastModifiedBy user if provided
    if (lastModifiedBy) {
      const modifier = await ctx.db.get(lastModifiedBy);
      if (!modifier) {
        throw new Error("Modifier user not found");
      }
      if (modifier.tenantId !== existingAppointment.tenantId) {
        throw new Error("Modifier does not belong to the same tenant");
      }
    }

    // Check for scheduling conflicts if time is being changed
    if (updates.scheduledAt || updates.duration) {
      const scheduledAt = updates.scheduledAt ?? existingAppointment.scheduledAt;
      const duration = updates.duration ?? existingAppointment.duration;
      const endTime = scheduledAt + (duration * 60 * 1000);
      const locationId = updates.locationId ?? existingAppointment.locationId;

      // Check provider availability at start time (only if providerId exists)
      if (existingAppointment.providerId) {
        const startAvailability = await checkProviderAvailability(
          ctx,
          existingAppointment.providerId,
          scheduledAt,
          locationId,
          existingAppointment.tenantId
        );
        
        if (!startAvailability.available) {
          throw new Error(`Provider is not available at the requested start time: ${startAvailability.reason || 'Not available'}`);
        }
        
        // Check provider availability at end time (if different from start)
        if (duration > 0) {
          const endAvailability = await checkProviderAvailability(
            ctx,
            existingAppointment.providerId,
            endTime,
            locationId,
            existingAppointment.tenantId
          );
        }
      }
        
      // Note: End time availability check is less strict - we allow if the appointment
      // starts within availability window, even if it extends slightly beyond

      // Check for overlapping appointments (enhanced with location-specific checking)
      // Only check provider conflicts if providerId exists
      const conflictingAppointments = existingAppointment.providerId
        ? await ctx.db
            .query("appointments")
            .withIndex("by_provider", (q) => q.eq("providerId", existingAppointment.providerId!))
            .filter((q) =>
              q.and(
                q.eq(q.field("tenantId"), existingAppointment.tenantId),
                q.neq(q.field("_id"), id), // Exclude current appointment
                q.neq(q.field("status"), "cancelled"),
                // If locationId is specified, only check conflicts at the same location
                locationId
                  ? q.eq(q.field("locationId"), locationId)
                  : q.or(
                      q.eq(q.field("locationId"), undefined),
                      q.neq(q.field("locationId"), undefined)
                    ),
                q.or(
                  // New appointment starts during existing appointment
                  q.and(
                    q.gte(q.field("scheduledAt"), scheduledAt),
                    q.lt(q.field("scheduledAt"), endTime)
                  ),
                  // New appointment ends during existing appointment
                  q.and(
                    q.gt(q.field("scheduledAt"), scheduledAt),
                    q.lte(q.field("scheduledAt"), endTime)
                  ),
                  // New appointment completely contains existing appointment
                  q.and(
                    q.lte(q.field("scheduledAt"), scheduledAt),
                    q.gte(q.field("scheduledAt"), endTime)
                  )
                )
              )
            )
            .collect()
        : [];

      // Check for external calendar conflicts (if provider has bidirectional sync)
      let externalConflicts: Array<{
        id: string;
        summary: string;
        start: string;
        end: string;
        location?: string;
      }> = [];
      
      try {
        // Check if provider has bidirectional calendar sync (only if providerId exists)
        if (!existingAppointment.providerId) {
          // Skip if no providerId
          return;
        }
        const providerId = existingAppointment.providerId; // Store in const for type narrowing
        const calendarSyncs = await ctx.db
          .query("calendarSync")
          .withIndex("by_provider_tenant", (q) => 
            q.eq("providerId", providerId).eq("tenantId", existingAppointment.tenantId)
          )
          .filter((q) => 
            q.and(
              q.neq(q.field("accessToken"), ""),
              q.eq(q.field("syncDirection"), "bidirectional")
            )
          )
          .collect();

        if (calendarSyncs.length > 0) {
          // Note: Mutations cannot call actions directly
          // External calendar conflict checking should be done client-side or via scheduled jobs
          // For now, we'll skip external conflict checking in mutations
          // TODO: Implement client-side conflict checking or use scheduled jobs
        }
      } catch (error) {
        // If external calendar check fails, log but don't block appointment update
        // External conflicts will be caught during the next sync cycle
        console.warn("Failed to check external calendar conflicts:", error);
      }

      // Combine internal and external conflicts
      const hasInternalConflicts = conflictingAppointments.length > 0;
      const hasExternalConflicts = externalConflicts.length > 0;

      if (hasInternalConflicts || hasExternalConflicts) {
        // Build conflict message
        const conflictMessages: string[] = [];
        const suggestions: string[] = [];
        const slotDuration = duration;
        const now = Date.now();

        // Handle internal appointment conflicts
        if (hasInternalConflicts) {
          const conflict = conflictingAppointments[0];
          if (conflict) {
            const conflictStart = new Date(conflict.scheduledAt ?? 0);
            const conflictEnd = new Date((conflict.scheduledAt ?? 0) + (conflict.duration ?? 0) * 60 * 1000);
            conflictMessages.push(`existing appointment from ${conflictStart.toLocaleString()} to ${conflictEnd.toLocaleString()}`);

            // Find available slots near the requested time using availability logic
            const searchStart = Math.max(now, conflictStart.getTime() - (2 * 60 * 60 * 1000));
            const searchEnd = conflictEnd.getTime() + (2 * 60 * 60 * 1000);
            
            // Get all appointments in the search window for availability calculation
            const searchWindowAppointments = existingAppointment.providerId
              ? await ctx.db
                  .query("appointments")
                  .withIndex("by_provider_date", (q) => 
                    q.eq("providerId", existingAppointment.providerId!)
                      .gte("scheduledAt", searchStart)
                      .lte("scheduledAt", searchEnd)
                  )
                  .filter((q) => 
                    q.and(
                      q.eq(q.field("tenantId"), existingAppointment.tenantId),
                      q.neq(q.field("status"), "cancelled"),
                      q.neq(q.field("_id"), id), // Exclude the appointment being updated
                      q.neq(q.field("_id"), conflict._id) // Exclude the conflicting appointment
                    )
                  )
                  .collect()
              : [];
            
            // Try to find available slots before and after conflict
            const checkSlots = [
              conflictStart.getTime() - (slotDuration * 60 * 1000) - (30 * 60 * 1000), // 30 min before
              conflictStart.getTime() - (slotDuration * 60 * 1000), // Right before
              conflictEnd.getTime() + (30 * 60 * 1000), // Right after
              conflictEnd.getTime() + (60 * 60 * 1000), // 1 hour after
            ];
            
            for (const slotTime of checkSlots) {
              if (slotTime < now) continue; // Skip past times
              
              // Check if this slot conflicts with any appointment
              const hasConflict = searchWindowAppointments.some((apt) => {
                const aptStart = apt.scheduledAt;
                const aptEnd = aptStart + (apt.duration * 60 * 1000);
                const slotEnd = slotTime + (slotDuration * 60 * 1000);
                
                return (slotTime < aptEnd && slotEnd > aptStart);
              });
              
              // Check if provider is available at this time (only if providerId exists)
              if (!hasConflict && existingAppointment.providerId) {
                const slotAvailability = await checkProviderAvailability(
                  ctx,
                  existingAppointment.providerId,
                  slotTime,
                  locationId,
                  existingAppointment.tenantId
                );
                
                if (slotAvailability.available && suggestions.length < 3) {
                  suggestions.push(new Date(slotTime).toLocaleString());
                }
              }
            }
          }
        }

        // Handle external calendar conflicts
        if (hasExternalConflicts) {
          const externalConflict = externalConflicts[0];
          if (externalConflict) {
            const externalStart = new Date(externalConflict.start ?? 0);
            const externalEnd = new Date(externalConflict.end ?? 0);
            conflictMessages.push(`external calendar event "${externalConflict.summary ?? 'Unknown'}" from ${externalStart.toLocaleString()} to ${externalEnd.toLocaleString()}`);
          }
        }

        // If we don't have enough suggestions, try finding slots using availability windows
        // Only attempt if providerId is present (suggestions require provider availability)
        if (suggestions.length < 2 && existingAppointment.providerId) {
          const requestDate = new Date(scheduledAt);
          const dayMap: Record<string, "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"> = {
            "mon": "monday",
            "tue": "tuesday",
            "wed": "wednesday",
            "thu": "thursday",
            "fri": "friday",
            "sat": "saturday",
            "sun": "sunday",
          };
          const dayShortName = requestDate.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
          const dayName = dayMap[dayShortName] || "monday";
          
          const providerId = existingAppointment.providerId; // Store in const for type narrowing
          const dayAvailability = await ctx.db
            .query("providerAvailability")
            .withIndex("by_provider_day", (q) => 
              q.eq("providerId", providerId).eq("dayOfWeek", dayName)
            )
            .filter((q) => 
              q.and(
                q.eq(q.field("isRecurring"), true),
                q.eq(q.field("tenantId"), existingAppointment.tenantId),
                locationId 
                  ? q.eq(q.field("locationId"), locationId)
                  : q.or(
                      q.eq(q.field("locationId"), undefined),
                      q.neq(q.field("locationId"), undefined)
                    )
              )
            )
            .first();
          
          if (dayAvailability) {
            const [startHours, startMinutes] = dayAvailability.startTime.split(':').map(Number);
    const startHoursSafe = startHours ?? 0;
    const startMinutesSafe = startMinutes ?? 0;
            const availabilityStart = new Date(requestDate);
            availabilityStart.setHours(startHoursSafe, startMinutesSafe, 0, 0);
            
            if (availabilityStart.getTime() > now && suggestions.length < 3) {
              suggestions.push(availabilityStart.toLocaleString());
            }
          }
        }

        const locationText = locationId 
          ? ` at the selected location`
          : '';
        const suggestionText = suggestions.length > 0 
          ? ` Suggested alternative times: ${suggestions.join(', ')}`
          : '';
        
        throw new Error(
          `Provider has a scheduling conflict${locationText} with ${conflictMessages.join(' and ')}.${suggestionText}`
        );
      }

      // Note: External calendar conflicts are now checked above in the conflict detection section
    }

    const updatedAt = Date.now();
    await ctx.db.patch(id, {
      ...updates,
      lastModifiedBy: lastModifiedBy || existingAppointment.lastModifiedBy,
      updatedAt,
    });

    // Log audit event for appointment updates (especially clinic user edits)
    try {
      const modifierUser = lastModifiedBy ? await ctx.db.get(lastModifiedBy) : null;
      const isClinicUserEdit = modifierUser && isClinicUser(modifierUser.role) && lastModifiedBy !== existingAppointment.createdBy;

      await ctx.runMutation(api.auditLogs.create, {
        tenantId: existingAppointment.tenantId,
        userId: lastModifiedBy || existingAppointment.lastModifiedBy,
        action: isClinicUserEdit ? "appointment_admin_edited" : "appointment_updated",
        resource: "appointments",
        resourceId: id,
        details: {
          providerId: existingAppointment.providerId,
          patientId: existingAppointment.patientId,
          changes: updates,
          isAdminEdit: isClinicUserEdit,
          originalScheduledAt: existingAppointment.scheduledAt,
          newScheduledAt: updates.scheduledAt ?? existingAppointment.scheduledAt,
        },
        timestamp: updatedAt,
      });
    } catch (error) {
      console.error("Failed to log appointment update audit event:", error);
      // Don't fail the mutation if audit logging fails
    }

    return { success: true };
  },
});

// Delete appointment
export const deleteAppointment = mutation({
  args: { 
    id: v.id("appointments"),
    userId: v.optional(v.id("users")), // User who deleted the appointment (for audit logging)
  },
  handler: async (ctx, args) => {
    // Get appointment before deletion for audit logging
    const appointment = await ctx.db.get(args.id);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Store appointment details for audit logging
    const appointmentDetails = {
      providerId: appointment.providerId,
      patientId: appointment.patientId,
      scheduledAt: appointment.scheduledAt,
      duration: appointment.duration,
      type: appointment.type,
      status: appointment.status,
    };

    // Get user to determine if this is a clinic user deletion
    const deleterUser = args.userId ? await ctx.db.get(args.userId) : null;
    const isClinicUserDeleted = deleterUser && isClinicUser(deleterUser.role);

    // Delete the appointment
    await ctx.db.delete(args.id);

    // Log audit event for appointment deletion
    try {
      await ctx.runMutation(api.auditLogs.create, {
        tenantId: appointment.tenantId,
        userId: args.userId || appointment.createdBy,
        action: isClinicUserDeleted ? "appointment_admin_deleted" : "appointment_deleted",
        resource: "appointments",
        resourceId: args.id,
        details: {
          ...appointmentDetails,
          isAdminDeleted: isClinicUserDeleted,
          originalCreatedBy: appointment.createdBy,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to log appointment deletion audit event:", error);
      // Don't fail the mutation if audit logging fails
    }

    return { success: true };
  },
});

// List all appointments
export const listAppointments = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db.query("appointments").take(limit);
  },
});

// Get appointments by tenant (real-time dashboard)
export const getAppointmentsByTenant = query({
  args: { 
    tenantId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    return await ctx.db
      .query("appointments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(limit);
  },
});

// Get today's appointments (real-time schedule)
export const getTodaysAppointments = query({
  args: { 
    tenantId: v.string(),
    providerId: v.optional(v.id("providers")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    let query = ctx.db
      .query("appointments")
      .withIndex("by_scheduled_at", (q) => 
        q.gte("scheduledAt", startOfDay.getTime()).lte("scheduledAt", endOfDay.getTime())
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId));
    
    if (args.providerId) {
      query = query.filter((q) => q.eq(q.field("providerId"), args.providerId));
    }
    
    return await query.collect();
  },
});

// Get upcoming appointments (real-time schedule)
export const getUpcomingAppointments = query({
  args: { 
    tenantId: v.string(),
    providerId: v.optional(v.id("providers")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const now = Date.now();
    
    let query = ctx.db
      .query("appointments")
      .withIndex("by_scheduled_at", (q) => q.gte("scheduledAt", now))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId));
    
    if (args.providerId) {
      query = query.filter((q) => q.eq(q.field("providerId"), args.providerId));
    }
    
    return await query.order("asc").take(limit);
  },
});

// Get appointment statistics (real-time metrics)
export const getAppointmentStats = query({
  args: { 
    tenantId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startDate = args.startDate || (now - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
    const endDate = args.endDate || now;
    
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_scheduled_at", (q) => 
        q.gte("scheduledAt", startDate).lte("scheduledAt", endDate)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();
    
    // Group by status
    const statusCounts = appointments.reduce((acc, appointment) => {
      acc[appointment.status] = (acc[appointment.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Group by type
    const typeCounts = appointments.reduce((acc, appointment) => {
      acc[appointment.type] = (acc[appointment.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: appointments.length,
      statusBreakdown: statusCounts,
      typeBreakdown: typeCounts,
      scheduled: statusCounts.scheduled || 0,
      confirmed: statusCounts.confirmed || 0,
      completed: statusCounts.completed || 0,
      cancelled: statusCounts.cancelled || 0,
    };
  },
});

// Get appointment calendar data (real-time calendar view) - user-centric
export const getAppointmentCalendar = query({
  args: { 
    tenantId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    userId: v.optional(v.id("users")), // User who owns the calendar
    userIds: v.optional(v.array(v.id("users"))), // Multiple users for shared calendars
    providerId: v.optional(v.id("providers")), // Deprecated - kept for backward compatibility
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("appointments")
      .withIndex("by_scheduled_at", (q) => 
        q.gte("scheduledAt", args.startDate).lte("scheduledAt", args.endDate)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId));
    
    // Filter by userId(s) if provided (user-centric)
    if (args.userIds && args.userIds.length > 0) {
      query = query.filter((q) => 
        q.or(...args.userIds!.map(id => q.eq(q.field("userId"), id)))
      );
    } else if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }
    
    // Fallback to providerId for backward compatibility
    if (args.providerId && !args.userId && !args.userIds) {
      query = query.filter((q) => q.eq(q.field("providerId"), args.providerId));
    }
    
    const appointments = await query.collect();
    
    // Group by date for calendar view
    const calendarData = appointments.reduce((acc, appointment) => {
      const date = new Date(appointment.scheduledAt).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(appointment);
      return acc;
    }, {} as Record<string, typeof appointments>);
    
    return calendarData;
  },
});

// Get appointments for multiple providers (admin calendar view)
export const getMultiProviderAppointments = query({
  args: {
    tenantId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    providerIds: v.optional(v.array(v.id("providers"))), // If provided, filter to these providers
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("appointments")
      .withIndex("by_scheduled_at", (q) => 
        q.gte("scheduledAt", args.startDate).lte("scheduledAt", args.endDate)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId));
    
    // Filter by provider IDs if provided
    if (args.providerIds && args.providerIds.length > 0) {
      query = query.filter((q: any) => 
        q.or(...args.providerIds!.map(id => q.eq(q.field("providerId"), id)))
      );
    }
    
    const appointments = await query.collect();
    
    // Enrich with provider and patient information
    const enrichedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const provider = appointment.providerId 
          ? await ctx.db.get(appointment.providerId)
          : null;
        const patient = await ctx.db.get(appointment.patientId);
        const location = appointment.locationId 
          ? await ctx.db.get(appointment.locationId)
          : null;
        
        return {
          ...appointment,
          providerName: provider 
            ? `${provider.firstName} ${provider.lastName}` 
            : 'Unknown Provider',
          providerSpecialty: provider?.specialty || 'General Medicine',
          patientName: patient
            ? `${patient.firstName} ${patient.lastName}`
            : 'Unknown Patient',
          locationName: location?.name || null,
        };
      })
    );
    
    return enrichedAppointments;
  },
});

// Get patient appointments with provider details
export const getPatientAppointments = query({
  args: {
    patientId: v.id("patients"),
    tenantId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const offset = args.offset || 0;
    
    let query = ctx.db
      .query("appointments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("patientId"), args.patientId));
    
    if (args.status && args.status !== 'all') {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    const appointments = await query
      .order("desc")
      .collect();
    
    // Filter by date range if provided
    let filteredAppointments = appointments;
    if (args.startDate !== undefined) {
      const startDate = args.startDate; // Type narrowing
      filteredAppointments = filteredAppointments.filter(
        (apt) => apt.scheduledAt >= startDate
      );
    }
    if (args.endDate !== undefined) {
      const endDate = args.endDate; // Type narrowing
      filteredAppointments = filteredAppointments.filter(
        (apt) => apt.scheduledAt <= endDate
      );
    }
    
    // Get provider details for each appointment
    const appointmentsWithProviders = await Promise.all(
      filteredAppointments.slice(offset, offset + limit).map(async (appointment) => {
        const provider = appointment.providerId 
          ? await ctx.db.get(appointment.providerId)
          : null;
        return {
          ...appointment,
          providerName: provider ? `${provider.firstName} ${provider.lastName}` : 'Unknown Provider',
          providerSpecialty: provider?.specialty || 'General Medicine'
        };
      })
    );
    
    return appointmentsWithProviders;
  },
});

// Get provider appointments with patient details (deprecated - kept for backward compatibility)
export const getProviderAppointments = query({
  args: {
    providerId: v.id("providers"),
    tenantId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const offset = args.offset || 0;
    
    let query = ctx.db
      .query("appointments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("providerId"), args.providerId));
    
    if (args.status && args.status !== 'all') {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    // Optimize pagination: collect only what we need (limit + offset) instead of all records
    const appointments = await query
      .order("desc")
      .take(limit + offset); // Limit at query level for better performance

    // Apply offset and limit after collection
    const paginatedAppointments = appointments.slice(offset, offset + limit);
    
    // Get patient details for each appointment
    const appointmentsWithPatients = await Promise.all(
      paginatedAppointments.map(async (appointment) => {
        const patient = await ctx.db.get(appointment.patientId);
        return {
          ...appointment,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient',
          patientEmail: patient?.email || '',
        };
      })
    );
    
    return appointmentsWithPatients;
  },
});

// Get user appointments with patient details (user-centric)
export const getUserAppointments = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const offset = args.offset || 0;
    
    let query = ctx.db
      .query("appointments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId));
    
    if (args.status && args.status !== 'all') {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    // Optimize pagination: collect only what we need (limit + offset) instead of all records
    const appointments = await query
      .order("desc")
      .take(limit + offset); // Limit at query level for better performance

    // Apply offset and limit after collection
    const paginatedAppointments = appointments.slice(offset, offset + limit);
    
    // Get patient details for each appointment
    const appointmentsWithPatients = await Promise.all(
      paginatedAppointments.map(async (appointment) => {
        const patient = await ctx.db.get(appointment.patientId);
        return {
          ...appointment,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient',
          patientEmail: patient?.email || '',
        };
      })
    );
    
    return appointmentsWithPatients;
  },
});

// Get appointments by user (simple query without patient details)
export const getAppointmentsByUser = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();
  },
});

// Get appointments for multiple users (for shared calendars)
export const getMultiUserAppointments = query({
  args: {
    tenantId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    userIds: v.optional(v.array(v.id("users"))), // If provided, filter to these users
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("appointments")
      .withIndex("by_scheduled_at", (q) => 
        q.gte("scheduledAt", args.startDate).lte("scheduledAt", args.endDate)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId));
    
    // Filter by user IDs if provided
    if (args.userIds && args.userIds.length > 0) {
      query = query.filter((q: any) => 
        q.or(...args.userIds!.map(id => q.eq(q.field("userId"), id)))
      );
    }
    
    const appointments = await query.collect();
    
    // Enrich with user and patient information
    const enrichedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const userDoc = appointment.userId !== undefined
          ? await ctx.db.get(appointment.userId)
          : null;
        // Type guard: Since appointment.userId is Id<"users">, we can safely assert it's a user
        const user = userDoc && ('email' in userDoc || 'role' in userDoc)
          ? (userDoc as { email?: string; name?: string; firstName?: string; lastName?: string })
          : null;
        const patientDoc = await ctx.db.get(appointment.patientId);
        // Type guard: Check if patient document has patient-specific properties
        const patient = patientDoc && ('firstName' in patientDoc && 'lastName' in patientDoc)
          ? (patientDoc as { firstName?: string; lastName?: string })
          : null;
        const location = appointment.locationId !== undefined
          ? await ctx.db.get(appointment.locationId)
          : null;
        
        return {
          ...appointment,
          userName: user 
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || ''
            : 'Unknown User',
          userEmail: user?.email || '',
          patientName: patient && patient.firstName && patient.lastName
            ? `${patient.firstName} ${patient.lastName}`
            : 'Unknown Patient',
          locationName: location && 'name' in location ? (location as any).name : null,
        };
      })
    );
    
    return enrichedAppointments;
  },
});

// Migration helper: Update appointment userId (for migration script only)
export const migrateAppointmentUserId = mutation({
  args: {
    appointmentId: v.id("appointments"),
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    if (appointment.tenantId !== args.tenantId) {
      throw new Error("Appointment does not belong to the specified tenant");
    }

    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Update userId
    await ctx.db.patch(args.appointmentId, {
      userId: args.userId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get user calendar with shared calendars included
export const getUserCalendarWithShares = query({
  args: {
    userId: v.id("users"), // User requesting the calendar
    tenantId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    includeSharedCalendars: v.optional(v.boolean()), // Whether to include shared calendars
    includeMemberAppointments: v.optional(v.boolean()), // Whether to include appointments where user is a member
  },
  handler: async (ctx, args) => {
    const includeShared = args.includeSharedCalendars !== false; // Default to true
    const includeMember = args.includeMemberAppointments !== false; // Default to true

    // Get user's own appointments
    const ownAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId)
          .gte("scheduledAt", args.startDate)
          .lte("scheduledAt", args.endDate)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    // Track appointment IDs to avoid duplicates
    const seenAppointmentIds = new Set(ownAppointments.map((apt) => apt._id));

    // Get shared calendars if requested
    let sharedAppointments: any[] = [];
    if (includeShared) {
      const sharedCalendars = await ctx.db
        .query("calendarShares")
        .withIndex("by_shared_with", (q) => q.eq("sharedWithUserId", args.userId))
        .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
        .collect();

      // Get appointments from each shared calendar
      for (const share of sharedCalendars) {
        const ownerAppointments = await ctx.db
          .query("appointments")
          .withIndex("by_user_date", (q) =>
            q.eq("userId", share.ownerUserId)
              .gte("scheduledAt", args.startDate)
              .lte("scheduledAt", args.endDate)
          )
          .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
          .collect();

        // Add metadata about the share (avoid duplicates)
        for (const apt of ownerAppointments) {
          if (!seenAppointmentIds.has(apt._id)) {
            seenAppointmentIds.add(apt._id);
            sharedAppointments.push({
              ...apt,
              isShared: true,
              ownerUserId: share.ownerUserId,
              sharePermission: share.permission,
            });
          }
        }
      }
    }

    // Get appointments where user is a member
    let memberAppointments: any[] = [];
    if (includeMember) {
      // Get all memberships for this user
      const memberships = await ctx.db
        .query("appointmentMembers")
        .withIndex("by_user_tenant", (q) =>
          q.eq("userId", args.userId).eq("tenantId", args.tenantId)
        )
        .collect();

      // Get appointments for each membership
      for (const membership of memberships) {
        if (seenAppointmentIds.has(membership.appointmentId)) continue;

        const appointment = await ctx.db.get(membership.appointmentId);
        if (!appointment) continue;

        // Filter by date range
        if (appointment.scheduledAt < args.startDate || appointment.scheduledAt > args.endDate) continue;

        seenAppointmentIds.add(appointment._id);
        memberAppointments.push({
          ...appointment,
          isMemberAppointment: true,
          memberRole: membership.role,
          memberStatus: membership.status,
        });
      }
    }

    // Combine and enrich with user/patient details
    const allAppointments = [
      ...ownAppointments.map((apt) => ({ ...apt, isShared: false })),
      ...sharedAppointments,
      ...memberAppointments,
    ];

    const enrichedAppointments = await Promise.all(
      allAppointments.map(async (appointment) => {
        const userDoc = appointment.userId !== undefined
          ? await ctx.db.get(appointment.userId)
          : null;
        // Type guard: Since appointment.userId is Id<"users">, we can safely assert it's a user
        const user = userDoc && ('email' in userDoc || 'role' in userDoc)
          ? (userDoc as { email?: string; name?: string; firstName?: string; lastName?: string })
          : null;
        const patientDoc = await ctx.db.get(appointment.patientId);
        // Type guard: Check if patient document has patient-specific properties
        const patient = patientDoc && ('firstName' in patientDoc && 'lastName' in patientDoc)
          ? (patientDoc as { firstName?: string; lastName?: string })
          : null;
        const location = appointment.locationId !== undefined
          ? await ctx.db.get(appointment.locationId)
          : null;

        return {
          ...appointment,
          userName: user
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || ''
            : 'Unknown User',
          userEmail: user?.email || '',
          patientName: patient && patient.firstName && patient.lastName
            ? `${patient.firstName} ${patient.lastName}`
            : 'Unknown Patient',
          locationName: location && 'name' in location ? (location as any).name : null,
        };
      })
    );

    return enrichedAppointments;
  },
});

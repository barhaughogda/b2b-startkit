/**
 * Provider Availability Hook
 * 
 * React hook for fetching provider availability data from Convex.
 * Provides time slots, availability checking, and validation helpers.
 */

import { useQuery } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { canUseConvexQuery, isValidConvexId } from '@/lib/convexIdValidation';
import { useMemo } from 'react';

export interface TimeSlot {
  dateTime: number;
  available: boolean;
  date: Date;
  timeString: string; // Short format (e.g., "9:00 AM")
  dateString: string; // Short format (e.g., "Mon, Dec 29")
  fullDateString: string; // Full format (e.g., "Monday, December 29, 2025")
}

export interface AvailabilityData {
  slots: TimeSlot[];
  availableSlots: TimeSlot[];
  unavailableSlots: TimeSlot[];
  isLoading: boolean;
  error: string | null;
}

export interface UseProviderAvailabilityOptions {
  providerId?: Id<'providers'> | undefined;
  userId?: Id<'users'> | undefined; // For user-based availability (clinic-based)
  startDate: Date;
  endDate: Date;
  slotDuration?: number; // in minutes, default 30
  locationId?: Id<'locations'>;
  clinicId?: Id<'clinics'>; // Preferred over locationId for clinic-based scheduling
  tenantId?: string;
  timezone?: string; // Timezone for formatting times (e.g., 'America/New_York')
  sessionId?: string; // Browser session ID to exclude own locks from availability
}

/**
 * Hook for fetching provider availability and time slots
 * 
 * Supports two modes:
 * 1. Provider-based (legacy): Use providerId + optional locationId
 * 2. User-based (clinic-based, preferred): Use userId + clinicId
 * 
 * @example
 * ```tsx
 * // Provider-based (legacy)
 * const { slots, availableSlots, isLoading } = useProviderAvailability({
 *   providerId: selectedProviderId,
 *   startDate: new Date(),
 *   endDate: addDays(new Date(), 7),
 *   locationId: selectedLocationId,
 * });
 * 
 * // User-based with clinic (preferred)
 * const { slots, availableSlots, isLoading } = useProviderAvailability({
 *   userId: selectedUserId,
 *   clinicId: selectedClinicId,
 *   startDate: new Date(),
 *   endDate: addDays(new Date(), 7),
 * });
 * ```
 */
export function useProviderAvailability({
  providerId,
  userId,
  startDate,
  endDate,
  slotDuration = 30,
  locationId,
  clinicId,
  tenantId: overrideTenantId,
  timezone: formatTimezone,
  sessionId,
}: UseProviderAvailabilityOptions): AvailabilityData {
  const { data: session } = useSession();
  const tenantId = overrideTenantId || session?.user?.tenantId || 'demo-tenant';

  // Check if we can use Convex queries
  // For public booking (unauthenticated), allow queries if we have tenantId and valid IDs
  // For authenticated users, require valid user ID
  const canQuery = session?.user?.id
    ? canUseConvexQuery(session.user.id, tenantId)
    : (!!tenantId && typeof tenantId === 'string' && tenantId.length > 0 && 
       (userId ? isValidConvexId(userId) : true) && 
       (clinicId ? isValidConvexId(clinicId) : true) &&
       (providerId ? isValidConvexId(providerId) : true));

  // Determine which query to use: clinic-based (preferred) or provider-based (legacy)
  const useClinicBased = !!userId && !!clinicId;

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[useProviderAvailability] Query params:', JSON.stringify({
      canQuery,
      useClinicBased,
      userId,
      clinicId,
      providerId,
      tenantId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      slotDuration,
      willCallClinicQuery: canQuery && useClinicBased && !!tenantId,
      willCallProviderQuery: canQuery && !useClinicBased && !!providerId && !!tenantId,
    }));
  }

  // Fetch available time slots from Convex
  // Use clinic-based query if userId and clinicId are provided
  const rawClinicSlots = useQuery(
    api.availability.getClinicAvailableTimeSlots,
    canQuery && useClinicBased && tenantId
      ? {
          userId: userId as Id<'users'>,
          clinicId: clinicId as Id<'clinics'>,
          startDate: startDate.getTime(),
          endDate: endDate.getTime(),
          slotDuration,
          tenantId,
          sessionId, // Exclude own session's locks from availability
        }
      : 'skip'
  );

  // Fallback to provider-based query for backward compatibility
  const rawProviderSlots = useQuery(
    api.availability.getAvailableTimeSlots,
    canQuery && !useClinicBased && providerId && tenantId
      ? {
          providerId,
          startDate: startDate.getTime(),
          endDate: endDate.getTime(),
          slotDuration,
          locationId,
          tenantId,
        }
      : 'skip'
  );

  // Use whichever slots are available
  const rawSlots = useClinicBased ? rawClinicSlots : rawProviderSlots;

  // Debug logging for raw results
  if (process.env.NODE_ENV === 'development') {
    const slotsCount = rawSlots ? rawSlots.length : 0;
    console.log('[useProviderAvailability] Query results:', JSON.stringify({
      useClinicBased,
      rawClinicSlotsCount: rawClinicSlots ? rawClinicSlots.length : 'loading/skipped',
      rawProviderSlotsCount: rawProviderSlots ? rawProviderSlots.length : 'loading/skipped',
      rawSlotsCount: slotsCount,
      firstFewSlots: rawSlots ? rawSlots.slice(0, 3).map((s: { dateTime: number; available: boolean }) => ({ 
        dateTime: new Date(s.dateTime).toISOString(), 
        available: s.available 
      })) : [],
    }));
  }

  // Transform raw slots into enriched TimeSlot objects
  const slots: TimeSlot[] = useMemo(() => {
    if (!rawSlots) return [];

    return rawSlots.map((slot: { dateTime: number; available: boolean }) => {
      const date = new Date(slot.dateTime);
      
      // Format times in the clinic timezone if provided, otherwise use browser locale
      const timeFormatOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        ...(formatTimezone ? { timeZone: formatTimezone } : {}),
      };
      
      const dateFormatOptions: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        ...(formatTimezone ? { timeZone: formatTimezone } : {}),
      };
      
      const fullDateFormatOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        ...(formatTimezone ? { timeZone: formatTimezone } : {}),
      };
      
      return {
        dateTime: slot.dateTime,
        available: slot.available,
        date,
        timeString: date.toLocaleTimeString('en-US', timeFormatOptions),
        dateString: date.toLocaleDateString('en-US', dateFormatOptions),
        fullDateString: date.toLocaleDateString('en-US', fullDateFormatOptions),
      };
    });
  }, [rawSlots, formatTimezone]);

  // Filter available and unavailable slots
  const availableSlots = useMemo(
    () => slots.filter((slot) => slot.available),
    [slots]
  );

  const unavailableSlots = useMemo(
    () => slots.filter((slot) => !slot.available),
    [slots]
  );

  // Loading state
  const isQueryActive = useClinicBased ? (!!userId && !!clinicId) : !!providerId;
  const isLoading = !!(canQuery && isQueryActive && rawSlots === undefined);

  // Error state
  const error = canQuery && !isQueryActive
    ? useClinicBased 
      ? 'User ID and Clinic ID are required to fetch availability'
      : 'Provider ID is required to fetch availability'
    : null;

  return {
    slots,
    availableSlots,
    unavailableSlots,
    isLoading,
    error,
  };
}

/**
 * Hook for checking if a specific time is available for a provider
 * 
 * @example
 * ```tsx
 * const { isAvailable, reason, isLoading } = useCheckAvailability({
 *   providerId,
 *   dateTime: selectedDateTime,
 *   locationId,
 * });
 * ```
 */
export interface UseCheckAvailabilityOptions {
  providerId: Id<'providers'> | undefined;
  dateTime: number | undefined;
  locationId?: Id<'locations'>;
  tenantId?: string;
}

export interface CheckAvailabilityResult {
  isAvailable: boolean;
  reason?: string;
  isLoading: boolean;
}

export function useCheckAvailability({
  providerId,
  dateTime,
  locationId,
  tenantId: overrideTenantId,
}: UseCheckAvailabilityOptions): CheckAvailabilityResult {
  const { data: session } = useSession();
  const tenantId = overrideTenantId || session?.user?.tenantId || 'demo-tenant';

  // Check if we can use Convex queries
  const canQuery = canUseConvexQuery(session?.user?.id, tenantId);

  // Check availability for specific time
  const availabilityResult = useQuery(
    api.availability.checkAvailability,
    canQuery && providerId && dateTime && tenantId
      ? {
          providerId,
          dateTime,
          locationId,
          tenantId,
        }
      : 'skip'
  );

  const isLoading = !!(canQuery && providerId && dateTime && availabilityResult === undefined);

  return {
    isAvailable: availabilityResult?.available ?? false,
    reason: availabilityResult?.reason,
    isLoading,
  };
}

/**
 * Group slots by date for calendar-style display
 */
export function groupSlotsByDate(slots: TimeSlot[]): Map<string, TimeSlot[]> {
  const grouped = new Map<string, TimeSlot[]>();

  slots.forEach((slot) => {
    const dateKey = slot.date.toISOString().split('T')[0];
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, slot]);
  });

  return grouped;
}

/**
 * Get date string in a specific timezone (YYYY-MM-DD format)
 * This function extracts the date components (year, month, day) from the Date object
 * and formats them in the specified timezone, ignoring the time component.
 */
function getDateStringInTimezone(date: Date, timezone: string): string {
  try {
    // Use formatToParts to get precise control over date formatting
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
    
    // Fallback to toLocaleDateString if formatToParts fails
    return date.toLocaleDateString('en-CA', { timeZone: timezone });
  } catch {
    // Fallback to UTC if timezone is invalid
    return date.toISOString().split('T')[0];
  }
}

/**
 * Get slots for a specific date
 * Uses timezone-aware date comparison to handle timezone differences correctly
 * 
 * Important: Both the selected date and slot dates are compared in the SAME timezone
 * (the display timezone) to ensure correct filtering.
 * 
 * When displayTimezone is the user's timezone (Calendly-style):
 * - Dec 28 Brisbane shows slots that occur on Dec 28 Brisbane time
 * 
 * When displayTimezone is the clinic timezone:
 * - Dec 28 NYC shows slots that occur on Dec 28 NYC time
 */
export function getSlotsForDate(slots: TimeSlot[], date: Date, timezone?: string): TimeSlot[] {
  if (!timezone) {
    // Fall back to UTC comparison (for backward compatibility)
    const targetDateString = date.toISOString().split('T')[0];
    return slots.filter((slot) => {
      const slotDateString = slot.date.toISOString().split('T')[0];
      return slotDateString === targetDateString;
    });
  }
  
  // IMPORTANT: Compare both dates in the SAME timezone (the display timezone)
  // This ensures that when a user sees "December 28" on the calendar displayed in their timezone,
  // they get slots that fall on December 28 in that same timezone.
  //
  // The calendar date is interpreted in the display timezone, not the browser's local timezone.
  // This fixes timezone mismatch issues where a user in GMT+10 booking a clinic in GMT-5
  // would see no availability because dates were being compared in different timezones.
  const targetDateString = getDateStringInTimezone(date, timezone);
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    const firstSlotDateString = slots.length > 0 ? getDateStringInTimezone(slots[0].date, timezone) : 'N/A';
    console.log('[getSlotsForDate] Date comparison:', {
      selectedDateISO: date.toISOString(),
      targetDateInDisplayTZ: targetDateString,
      displayTimezone: timezone,
      firstSlotDateInDisplayTZ: firstSlotDateString,
      totalSlots: slots.length,
    });
  }
  
  return slots.filter((slot) => {
    // Extract date components from slot date in the display timezone
    const slotDateString = getDateStringInTimezone(slot.date, timezone);
    return slotDateString === targetDateString;
  });
}

/**
 * Check if any slots are available on a specific date
 */
export function hasAvailableSlotsOnDate(slots: TimeSlot[], date: Date, timezone?: string): boolean {
  const dateSlots = getSlotsForDate(slots, date, timezone);
  return dateSlots.some((slot) => slot.available);
}

/**
 * Count the number of available slots on a specific date
 * Useful for availability level indicators (high/medium/low)
 */
export function countAvailableSlotsOnDate(slots: TimeSlot[], date: Date, timezone?: string): number {
  const dateSlots = getSlotsForDate(slots, date, timezone);
  return dateSlots.filter((slot) => slot.available).length;
}

/**
 * Get availability level for a specific date
 * Returns 'high' (3+ slots), 'low' (1-2 slots), or 'none' (0 slots)
 */
export type AvailabilityLevel = 'high' | 'low' | 'none';

export function getAvailabilityLevel(slots: TimeSlot[], date: Date, timezone?: string): AvailabilityLevel {
  const count = countAvailableSlotsOnDate(slots, date, timezone);
  if (count >= 3) return 'high';
  if (count >= 1) return 'low';
  return 'none';
}


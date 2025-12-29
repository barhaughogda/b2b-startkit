'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Clock, CheckCircle, Globe } from 'lucide-react';
import { TimezoneSelector, getTimezoneDisplayName } from '@/components/ui/timezone-selector';
import { cn } from '@/lib/utils';
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import {
  useProviderAvailability,
  TimeSlot,
  getSlotsForDate,
  hasAvailableSlotsOnDate,
  getAvailabilityLevel,
} from '@/hooks/useProviderAvailability';
import { addDays, format, startOfDay, startOfMonth, isSameDay, isAfter, isBefore } from 'date-fns';

/**
 * Format a timestamp in a specific timezone using Intl.DateTimeFormat.
 * This ensures the displayed time matches the user's chosen timezone.
 */
function formatInTimezone(
  timestamp: number,
  timezone: string,
  options: Intl.DateTimeFormatOptions
): string {
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timezone }).format(
      new Date(timestamp)
    );
  } catch {
    // Fallback to browser timezone if invalid timezone
    return new Intl.DateTimeFormat('en-US', options).format(new Date(timestamp));
  }
}

export interface AvailabilitySlotPickerProps {
  providerId?: Id<'providers'> | undefined;
  userId?: Id<'users'> | undefined; // For user-based availability (clinic-based, preferred)
  locationId?: Id<'locations'>;
  clinicId?: Id<'clinics'>; // Preferred over locationId for clinic-based scheduling
  tenantId?: string;
  slotDuration?: number;
  selectedDateTime?: number;
  onSlotSelect: (slot: TimeSlot) => void;
  onTimezoneLoad?: (timezone: string) => void; // Callback when clinic timezone is loaded
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  showCalendar?: boolean;
  daysToShow?: number;
  /**
   * Optional timezone for displaying times (e.g., user's local timezone).
   * When provided, all times (slot list, selected time summary) will be displayed in this timezone.
   * If not provided, times are displayed in the clinic timezone (legacy behavior).
   * Note: The actual slot timestamps remain in UTC; this only affects display formatting.
   */
  displayTimezone?: string;
  /**
   * Time format preference: '12h' for 12-hour (AM/PM) or '24h' for 24-hour format.
   * Defaults to '12h' if not specified.
   * This respects the patient's preference from their profile settings.
   */
  timeFormat?: '12h' | '24h';
  /**
   * Show the timezone display label and optional override dropdown.
   * When enabled, users can see which timezone times are displayed in and optionally change it.
   * Defaults to true for public booking flows.
   */
  showTimezoneDisplay?: boolean;
  /**
   * Allow users to override the display timezone via a dropdown.
   * When true, shows a timezone selector dropdown.
   * Defaults to false (just shows the label, no override).
   */
  allowTimezoneOverride?: boolean;
  /**
   * Callback when user changes the display timezone via the override dropdown.
   */
  onTimezoneOverride?: (timezone: string) => void;
  /**
   * Browser session ID for slot locking.
   * When provided, the user's own locked slots will still appear as available.
   * This prevents the user from seeing their own held slot as unavailable.
   */
  sessionId?: string;
}

/**
 * AvailabilitySlotPicker Component
 * 
 * A comprehensive component for selecting available appointment time slots.
 * Integrates with the Convex availability system to show real-time availability.
 * 
 * @example
 * ```tsx
 * <AvailabilitySlotPicker
 *   providerId={selectedProviderId}
 *   locationId={selectedLocationId}
 *   selectedDateTime={selectedTime}
 *   onSlotSelect={(slot) => setSelectedTime(slot.dateTime)}
 * />
 * ```
 */
export function AvailabilitySlotPicker({
  providerId,
  userId,
  locationId,
  clinicId,
  tenantId,
  slotDuration = 30,
  selectedDateTime,
  onSlotSelect,
  onTimezoneLoad,
  minDate = new Date(),
  maxDate = addDays(new Date(), 30),
  className,
  showCalendar = true,
  daysToShow = 7,
  displayTimezone,
  timeFormat = '12h',
  showTimezoneDisplay = true,
  allowTimezoneOverride = false,
  onTimezoneOverride,
  sessionId,
}: AvailabilitySlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(minDate));
  const [viewStartDate, setViewStartDate] = useState<Date>(startOfDay(minDate));

  // Update viewStartDate when selectedDate changes significantly (different month)
  useEffect(() => {
    const selectedMonth = selectedDate.getMonth();
    const viewMonth = viewStartDate.getMonth();
    if (selectedMonth !== viewMonth) {
      setViewStartDate(startOfDay(selectedDate));
    }
  }, [selectedDate, viewStartDate]);

  // Calculate date range for fetching slots - expand to cover multiple months
  const dateRange = useMemo(() => {
    const start = startOfDay(viewStartDate);
    // Fetch 60 days of availability to cover multiple months
    const end = addDays(start, 60);
    return { start, end };
  }, [viewStartDate]);

  // Fetch clinic timezone for accurate date comparisons
  const clinicTimezoneData = useQuery(
    api.clinics.getClinicTimezone,
    clinicId ? { clinicId } : 'skip'
  );
  const clinicTimezone = clinicTimezoneData?.timezone || 'UTC';

  // Effective timezone: use displayTimezone if provided, otherwise fall back to clinic timezone
  // This allows displaying times in the user's local timezone while keeping UTC timestamps accurate
  const effectiveTimezone = displayTimezone || clinicTimezone;

  // Notify parent when timezone is loaded
  useEffect(() => {
    if (clinicTimezoneData?.timezone && onTimezoneLoad) {
      onTimezoneLoad(clinicTimezoneData.timezone);
    }
  }, [clinicTimezoneData?.timezone, onTimezoneLoad]);

  // Fetch availability data
  // Supports both provider-based (legacy) and user/clinic-based (preferred) modes
  const { slots, availableSlots, isLoading, error } = useProviderAvailability({
    providerId,
    userId,
    startDate: dateRange.start,
    endDate: dateRange.end,
    slotDuration,
    locationId,
    clinicId,
    tenantId,
    timezone: effectiveTimezone, // Format times in effective timezone (user's or clinic's)
    sessionId, // Exclude own session's locks from availability
  });

  // Debug: Log component props
  if (process.env.NODE_ENV === 'development') {
    console.log('[AvailabilitySlotPicker] Props:', JSON.stringify({
      userId,
      clinicId,
      providerId,
      tenantId,
      slotDuration,
      dateRange: { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() },
      clinicTimezone,
      displayTimezone,
      effectiveTimezone,
      clinicTimezoneLoading: clinicTimezoneData === undefined,
    }));
  }

  // Get slots for the selected date (using effective timezone for accurate matching)
  const slotsForSelectedDate = useMemo(() => {
    const result = getSlotsForDate(slots, selectedDate, effectiveTimezone);
    // Debug logging in development - always log to help diagnose issues
    if (process.env.NODE_ENV === 'development') {
      console.log('[AvailabilitySlotPicker] Slot data:', JSON.stringify({
        selectedDate: selectedDate.toISOString(),
        effectiveTimezone,
        totalSlots: slots.length,
        availableSlots: availableSlots.length,
        slotsForSelectedDate: result.length,
        isLoading,
        error,
        sampleSlotDates: slots.slice(0, 5).map(s => ({
          dateTime: s.dateTime,
          date: s.date.toISOString(),
          timeString: s.timeString,
          available: s.available,
        })),
      }));
    }
    return result;
  }, [slots, selectedDate, effectiveTimezone, availableSlots, isLoading, error]);


  // Handle date selection from calendar
  // Important: Extract date components (year/month/day) to avoid timezone shift issues
  // The calendar gives us a Date object, but we want to preserve the calendar date
  // regardless of timezone differences
  const handleCalendarSelect = useCallback((date: Date | undefined) => {
    if (date) {
      // Use startOfDay to normalize to midnight, but the date components are preserved
      // The actual date string comparison will happen in clinic timezone
      const normalizedDate = startOfDay(date);
      setSelectedDate(normalizedDate);
      setViewStartDate(normalizedDate);
    }
  }, []);

  // Handle slot selection
  const handleSlotClick = useCallback(
    (slot: TimeSlot) => {
      if (slot.available) {
        onSlotSelect(slot);
      }
    },
    [onSlotSelect]
  );

  // Handle month navigation - update viewStartDate to fetch availability for the new month
  const handleMonthChange = useCallback((month: Date) => {
    setViewStartDate(startOfMonth(month));
  }, []);

  // Check if a date has availability (for calendar highlighting)
  const dateHasAvailability = useCallback(
    (date: Date) => {
      return hasAvailableSlotsOnDate(availableSlots, date, effectiveTimezone);
    },
    [availableSlots, effectiveTimezone]
  );

  // Get availability level for a date (for color-coded calendar styling)
  const getDateAvailabilityLevel = useCallback(
    (date: Date) => {
      return getAvailabilityLevel(availableSlots, date, effectiveTimezone);
    },
    [availableSlots, effectiveTimezone]
  );

  // Helper to check if date is within allowed range
  const isDateInRange = useCallback(
    (date: Date) => {
      return !isBefore(date, startOfDay(minDate)) && !isAfter(date, maxDate);
    },
    [minDate, maxDate]
  );

  // Filter to only show available slots
  // IMPORTANT: This hook must be called before any early returns to maintain hook order
  const availableSlotsForDate = useMemo(() => {
    return slotsForSelectedDate.filter((slot) => slot.available);
  }, [slotsForSelectedDate]);

  // Check if we have the required parameters for either mode
  // Provider-based (legacy): providerId
  // Clinic-based (preferred): userId && clinicId
  const hasRequiredParams = providerId || (userId && clinicId);

  // Render loading state
  if (!hasRequiredParams) {
    return (
      <div className={cn('p-4 text-center text-text-secondary', className)}>
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Please select a provider to view available times</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <Loader2
          className="h-8 w-8 mx-auto mb-2 animate-spin"
          style={{ color: 'var(--tenant-primary, var(--zenthea-teal))' }}
        />
        <p className="text-text-secondary">Loading available times...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4 text-center text-status-error', className)}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Side-by-side layout: Calendar left, Time slots right */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar Section - Left Side */}
        {showCalendar && (
          <div className="flex-shrink-0 lg:w-[280px] w-full">
            <div className="border border-border-primary rounded-lg p-3 bg-surface-elevated">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleCalendarSelect}
                onMonthChange={handleMonthChange}
                disabled={(date) =>
                  // Only disable days outside the allowed date range
                  // Don't disable based on availability - let users click and see "no times"
                  isBefore(date, startOfDay(minDate)) ||
                  isAfter(date, maxDate)
                }
                modifiers={{
                  // High availability (3+ slots) - green
                  highAvailability: (date) => 
                    isDateInRange(date) && 
                    getDateAvailabilityLevel(date) === 'high',
                  // Low availability (1-2 slots) - amber/orange  
                  lowAvailability: (date) =>
                    isDateInRange(date) &&
                    getDateAvailabilityLevel(date) === 'low',
                  // No availability - muted
                  noAvailability: (date) =>
                    isDateInRange(date) &&
                    getDateAvailabilityLevel(date) === 'none',
                }}
                modifiersClassNames={{
                  // High availability (3+ slots) - use Zenthea status-success colors
                  highAvailability: 'bg-status-success/20 text-status-success font-medium hover:bg-status-success/30 dark:bg-status-success/20 dark:text-status-success dark:hover:bg-status-success/30',
                  // Low availability (1-2 slots) - use Zenthea status-warning colors
                  lowAvailability: 'bg-status-warning/20 text-status-warning font-medium hover:bg-status-warning/30 dark:bg-status-warning/20 dark:text-status-warning dark:hover:bg-status-warning/30',
                  // No availability - use Zenthea text-disabled
                  noAvailability: 'text-text-disabled opacity-50',
                }}
                className="rounded-md"
              />
            </div>
          </div>
        )}

        {/* Time Slots Section - Right Side */}
        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          <div className="space-y-4">
            {/* Selected Date Display */}
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-1">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h3>
              <p className="text-sm text-text-secondary">
                Select a time slot
              </p>
            </div>

            {/* Timezone Display - Shows which timezone times are displayed in */}
            {showTimezoneDisplay && effectiveTimezone && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                {allowTimezoneOverride && onTimezoneOverride ? (
                  <div className="flex-1">
                    <TimezoneSelector
                      value={effectiveTimezone}
                      onChange={onTimezoneOverride}
                      showLabel={false}
                      placeholder="Select timezone..."
                      className="w-full"
                    />
                  </div>
                ) : (
                  <span className="text-text-secondary">
                    Times shown in <span className="font-medium text-text-primary">{getTimezoneDisplayName(effectiveTimezone)}</span>
                  </span>
                )}
              </div>
            )}

            {/* Time Slots Grid */}
            {availableSlotsForDate.length === 0 ? (
              <div className="p-8 text-center bg-surface-elevated rounded-lg border border-border-primary">
                <Clock className="h-8 w-8 mx-auto mb-2 text-text-tertiary opacity-50" />
                <p className="text-text-secondary font-medium">
                  No available times for this date
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Try selecting a different date from the calendar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Scrollable time slots list */}
                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                  {availableSlotsForDate.map((slot) => {
                    const isSelected = selectedDateTime === slot.dateTime;

                    return (
                      <button
                        key={slot.dateTime}
                        onClick={() => handleSlotClick(slot)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all border',
                          isSelected
                            ? 'text-white shadow-sm'
                            : 'bg-surface-elevated hover:bg-interactive-primary hover:text-white text-text-primary border-border-primary hover:border-interactive-primary'
                        )}
                        style={
                          isSelected
                            ? {
                                backgroundColor: 'var(--tenant-primary, var(--zenthea-teal))',
                                borderColor: 'var(--tenant-primary, var(--zenthea-teal))',
                              }
                            : undefined
                        }
                        aria-label={`Select ${slot.timeString}`}
                        aria-pressed={isSelected}
                      >
                        <span>{slot.timeString}</span>
                        {isSelected && (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Time Summary */}
                {selectedDateTime && selectedDateTime > 0 && (
                  <div
                    className="rounded-lg p-4"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--tenant-primary, var(--zenthea-teal)) 10%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--tenant-primary, var(--zenthea-teal)) 30%, transparent)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    <div
                      className="flex items-center gap-2 mb-1"
                      style={{ color: 'var(--tenant-primary, var(--zenthea-teal))' }}
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-semibold">Selected Time</span>
                    </div>
                    <p className="text-text-primary text-sm">
                      {formatInTimezone(selectedDateTime, effectiveTimezone, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p
                      className="text-lg font-semibold"
                      style={{ color: 'var(--tenant-primary, var(--zenthea-teal))' }}
                    >
                      {formatInTimezone(selectedDateTime, effectiveTimezone, {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: timeFormat === '12h',
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version of the slot picker for inline use
 */
export function CompactSlotPicker({
  providerId,
  userId,
  locationId,
  clinicId,
  tenantId,
  slotDuration = 30,
  selectedDateTime,
  onSlotSelect,
  selectedDate,
  className,
}: Omit<AvailabilitySlotPickerProps, 'showCalendar' | 'daysToShow' | 'minDate' | 'maxDate'> & {
  selectedDate: Date;
}) {
  // Fetch clinic timezone for accurate date comparisons
  const clinicTimezoneData = useQuery(
    api.clinics.getClinicTimezone,
    clinicId ? { clinicId } : 'skip'
  );
  const clinicTimezone = clinicTimezoneData?.timezone || 'UTC';

  // Fetch availability for just the selected date
  const { slots, isLoading } = useProviderAvailability({
    providerId,
    userId,
    startDate: startOfDay(selectedDate),
    endDate: addDays(startOfDay(selectedDate), 1),
    slotDuration,
    locationId,
    clinicId,
    tenantId,
  });

  // Get slots for the selected date (using clinic timezone for accurate matching)
  const slotsForDate = useMemo(() => {
    return getSlotsForDate(slots, selectedDate, clinicTimezone);
  }, [slots, selectedDate, clinicTimezone]);

  // Check if we have the required parameters for either mode
  const hasRequiredParams = providerId || (userId && clinicId);

  if (!hasRequiredParams) {
    return (
      <p className="text-sm text-text-secondary">Select a provider first</p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading times...</span>
      </div>
    );
  }

  const availableSlots = slotsForDate.filter((s) => s.available);

  if (availableSlots.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        No available times for this date
      </p>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {availableSlots.map((slot) => {
        const isSelected = selectedDateTime === slot.dateTime;

        return (
          <button
            key={slot.dateTime}
            onClick={() => onSlotSelect(slot)}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-colors',
              isSelected
                ? 'text-white'
                : 'bg-surface-elevated hover:bg-interactive-primary hover:text-white text-text-primary'
            )}
            style={
              isSelected
                ? { backgroundColor: 'var(--tenant-primary, var(--zenthea-teal))' }
                : undefined
            }
          >
            {slot.timeString}
          </button>
        );
      })}
    </div>
  );
}

export default AvailabilitySlotPicker;


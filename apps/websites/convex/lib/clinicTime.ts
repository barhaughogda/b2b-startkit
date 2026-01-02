/**
 * Clinic Timezone Utilities
 * 
 * Helper functions for timezone-aware date/time calculations.
 * Used to compute availability slots in the clinic's local timezone.
 */

/**
 * Get the day of week in a specific timezone
 * 
 * @param timestamp - UTC timestamp
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Day name in lowercase (e.g., "monday", "tuesday")
 */
export function getDayOfWeekInTimezone(
  timestamp: number,
  timezone: string
): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
  const date = new Date(timestamp);
  
  // Get day name in the clinic's timezone
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(date).toLowerCase();
  
  return dayName as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
}

/**
 * Get the date string (YYYY-MM-DD) for a timestamp in a specific timezone
 * Used for override date matching
 * 
 * @param timestamp - UTC timestamp
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateStringInTimezone(timestamp: number, timezone: string): string {
  const date = new Date(timestamp);
  
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}

/**
 * Get the start of day (midnight) in a specific timezone as UTC timestamp
 * 
 * @param timestamp - UTC timestamp of any time during the day
 * @param timezone - IANA timezone string
 * @returns UTC timestamp for midnight in the specified timezone
 */
export function getStartOfDayInTimezone(timestamp: number, timezone: string): number {
  const dateStr = getDateStringInTimezone(timestamp, timezone);
  
  // Parse date parts
  const [year, month, day] = dateStr.split('-').map(Number) as [number, number, number];
  
  // Create a date formatter to get the UTC offset for this date in the timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  // Create a target date at midnight
  const targetDate = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, 12, 0, 0)); // Use noon to avoid DST edge cases
  
  // Get timezone parts for this date
  const formatted = formatter.formatToParts(targetDate);
  const hourPart = formatted.find(p => p.type === 'hour');
  const localHour = hourPart ? parseInt(hourPart.value, 10) : 12;
  
  // Calculate offset (difference between local hour and UTC hour)
  const utcHour = targetDate.getUTCHours();
  let offsetHours = localHour - utcHour;
  
  // Normalize offset to [-12, 12] range
  if (offsetHours > 12) offsetHours -= 24;
  if (offsetHours < -12) offsetHours += 24;
  
  // Create midnight in the timezone
  // If local is ahead of UTC (positive offset), subtract to get UTC time
  // If local is behind UTC (negative offset), add to get UTC time
  const midnightUTC = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0) - (offsetHours * 60 * 60 * 1000);
  
  return midnightUTC;
}

/**
 * Convert a local time string (HH:mm) on a specific date to a UTC timestamp
 * 
 * @param dateStr - Date string (YYYY-MM-DD) or timestamp in the target timezone
 * @param timeStr - Time string in HH:mm format (24-hour)
 * @param timezone - IANA timezone string
 * @returns UTC timestamp
 */
export function localTimeToUTC(
  dateStr: string | number,
  timeStr: string,
  timezone: string
): number {
  // Parse date
  let year: number, month: number, day: number;
  
  if (typeof dateStr === 'number') {
    // Convert timestamp to date string in timezone
    const ds = getDateStringInTimezone(dateStr, timezone);
    [year, month, day] = ds.split('-').map(Number) as [number, number, number];
  } else {
    [year, month, day] = dateStr.split('-').map(Number) as [number, number, number];
  }
  
  // Parse time
  const [hours, minutes] = timeStr.split(':').map(Number) as [number, number];
  
  // Get timezone offset for this specific date and time
  // We need to find the UTC time that corresponds to this local time
  
  // Start with a naive UTC date
  const naiveUTC = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0, 0);
  
  // Get what local time this would be in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(new Date(naiveUTC));
  const localHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const localMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  
  // Calculate offset in minutes
  const targetMinutes = hours * 60 + minutes;
  const resultMinutes = localHour * 60 + localMinute;
  let offsetMinutes = resultMinutes - targetMinutes;
  
  // Handle day boundary
  if (offsetMinutes > 12 * 60) offsetMinutes -= 24 * 60;
  if (offsetMinutes < -12 * 60) offsetMinutes += 24 * 60;
  
  // Adjust the naive UTC by the offset
  return naiveUTC - (offsetMinutes * 60 * 1000);
}

/**
 * Generate time slots for a day based on availability schedule
 * 
 * @param dateTimestamp - UTC timestamp for the date (will be converted to clinic timezone)
 * @param startTime - Start time string (HH:mm)
 * @param endTime - End time string (HH:mm)
 * @param slotDuration - Slot duration in minutes
 * @param timezone - IANA timezone string
 * @returns Array of slot objects with UTC timestamps
 */
export function generateTimeSlotsForDay(
  dateTimestamp: number,
  startTime: string,
  endTime: string,
  slotDuration: number,
  timezone: string
): Array<{ startTimestamp: number; endTimestamp: number }> {
  const slots: Array<{ startTimestamp: number; endTimestamp: number }> = [];
  
  // Get the date string in clinic timezone
  const dateStr = getDateStringInTimezone(dateTimestamp, timezone);
  
  // Parse times
  const [startHours, startMinutes] = startTime.split(':').map(Number) as [number, number];
  const [endHours, endMinutes] = endTime.split(':').map(Number) as [number, number];
  
  const startTotalMinutes = (startHours ?? 0) * 60 + (startMinutes ?? 0);
  const endTotalMinutes = (endHours ?? 0) * 60 + (endMinutes ?? 0);
  
  // Generate slots
  let currentMinutes = startTotalMinutes;
  while (currentMinutes + slotDuration <= endTotalMinutes) {
    const slotHours = Math.floor(currentMinutes / 60);
    const slotMins = currentMinutes % 60;
    const timeStr = `${String(slotHours).padStart(2, '0')}:${String(slotMins).padStart(2, '0')}`;
    
    const slotStart = localTimeToUTC(dateStr, timeStr, timezone);
    const slotEnd = slotStart + (slotDuration * 60 * 1000);
    
    slots.push({
      startTimestamp: slotStart,
      endTimestamp: slotEnd,
    });
    
    currentMinutes += slotDuration;
  }
  
  return slots;
}

/**
 * Check if a timestamp falls within a time range on a specific date
 * All comparisons are done in UTC after converting from clinic timezone
 * 
 * @param timestamp - UTC timestamp to check
 * @param dateTimestamp - UTC timestamp for the date
 * @param startTime - Start time string (HH:mm) in clinic timezone
 * @param endTime - End time string (HH:mm) in clinic timezone
 * @param timezone - IANA timezone string
 * @returns Whether the timestamp is within the range
 */
export function isTimestampInRange(
  timestamp: number,
  dateTimestamp: number,
  startTime: string,
  endTime: string,
  timezone: string
): boolean {
  const dateStr = getDateStringInTimezone(dateTimestamp, timezone);
  const rangeStart = localTimeToUTC(dateStr, startTime, timezone);
  const rangeEnd = localTimeToUTC(dateStr, endTime, timezone);
  
  return timestamp >= rangeStart && timestamp < rangeEnd;
}

/**
 * Get the next N days starting from a timestamp, accounting for timezone
 * 
 * @param startTimestamp - Starting UTC timestamp
 * @param numDays - Number of days to return
 * @param timezone - IANA timezone string
 * @returns Array of objects with date info
 */
export function getNextDaysInTimezone(
  startTimestamp: number,
  numDays: number,
  timezone: string
): Array<{
  dateString: string;
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  midnightUTC: number;
}> {
  const days: Array<{
    dateString: string;
    dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    midnightUTC: number;
  }> = [];
  
  let currentTimestamp = startTimestamp;
  
  for (let i = 0; i < numDays; i++) {
    const dateString = getDateStringInTimezone(currentTimestamp, timezone);
    const dayOfWeek = getDayOfWeekInTimezone(currentTimestamp, timezone);
    const midnightUTC = getStartOfDayInTimezone(currentTimestamp, timezone);
    
    days.push({ dateString, dayOfWeek, midnightUTC });
    
    // Move to next day
    currentTimestamp = midnightUTC + 24 * 60 * 60 * 1000;
  }
  
  return days;
}


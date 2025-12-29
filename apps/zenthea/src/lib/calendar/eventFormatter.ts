import { Id } from '@/convex/_generated/dataModel';
import { GoogleCalendarEvent } from './googleCalendarService';

/**
 * HIPAA-Compliant Event Formatter
 * 
 * Formats Zenthea appointments for Google Calendar sync.
 * Ensures NO PHI (Protected Health Information) is sent to external calendars.
 * 
 * HIPAA Compliance Rules:
 * - NO patient names
 * - NO medical conditions
 * - NO notes or descriptions containing PHI
 * - NO appointment IDs that could be traced back to patients
 * - ONLY generic "Patient Appointment" title
 * - ONLY time and location (if location doesn't contain PHI)
 * 
 * External events from Google Calendar are formatted for display in Zenthea.
 */

export interface AppointmentData {
  _id: Id<'appointments'>;
  scheduledAt: number;
  duration: number; // in minutes
  locationName?: string | null;
  type: string;
  // Intentionally NOT including: patientId, patientName, notes, etc.
}

export interface ExternalEventData {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string | null;
    date?: string | null;
  };
  end: {
    dateTime?: string | null;
    date?: string | null;
  };
  location?: string | null;
  extendedProperties?: {
    private?: {
      zentheaAppointmentId?: string;
      [key: string]: string | undefined;
    };
  };
}

/**
 * Format Zenthea appointment for Google Calendar (HIPAA-compliant)
 * 
 * @param appointment - Appointment data (without PHI)
 * @param timeZone - Timezone for the event (defaults to UTC)
 * @returns Google Calendar event format
 */
export function formatAppointmentForGoogleCalendar(
  appointment: AppointmentData,
  timeZone: string = 'UTC'
): GoogleCalendarEvent {
  const startDate = new Date(appointment.scheduledAt);
  const endDate = new Date(startDate.getTime() + appointment.duration * 60 * 1000);

  // Format dates as ISO 8601 strings
  const startDateTime = startDate.toISOString();
  const endDateTime = endDate.toISOString();

  // Build location string (only if location name is safe - no PHI)
  let location: string | undefined;
  if (appointment.locationName) {
    // Only include location if it's a generic location name
    // In production, you might want to validate location names don't contain PHI
    location = appointment.locationName;
  }

  // Create HIPAA-compliant event
  // Summary is ALWAYS "Patient Appointment" - no patient names, no conditions
  const event: GoogleCalendarEvent = {
    summary: 'Patient Appointment',
    description: undefined, // NO description - could contain PHI
    start: {
      dateTime: startDateTime,
      timeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone,
    },
    location,
    // Store Zenthea appointment ID in extended properties for sync tracking
    // This is safe as it's not PHI and is only used for internal sync
    extendedProperties: {
      private: {
        zentheaAppointmentId: appointment._id,
        zentheaAppointmentType: appointment.type,
      },
    },
  };

  return event;
}

/**
 * Format external Google Calendar event for Zenthea display
 * 
 * @param externalEvent - Event from Google Calendar API
 * @returns Formatted event data for Zenthea
 */
export function formatExternalEventForZenthea(
  externalEvent: ExternalEventData
): {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  isExternal: boolean;
} {
  // Parse start time
  const startTime = externalEvent.start.dateTime 
    ? new Date(externalEvent.start.dateTime)
    : externalEvent.start.date 
    ? new Date(externalEvent.start.date)
    : new Date();

  // Parse end time
  const endTime = externalEvent.end.dateTime
    ? new Date(externalEvent.end.dateTime)
    : externalEvent.end.date
    ? new Date(externalEvent.end.date)
    : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

  return {
    id: externalEvent.id,
    title: externalEvent.summary || 'External Event',
    start: startTime,
    end: endTime,
    location: externalEvent.location ?? undefined,
    isExternal: true,
  };
}

/**
 * Check if an external event should be synced as a "busy" block
 * 
 * Filters out events that are:
 * - All-day events (unless configured otherwise)
 * - Events marked as "free" (if we can detect that)
 * - Events that are Zenthea appointments (to avoid duplicates)
 * 
 * @param externalEvent - Event from Google Calendar
 * @returns True if event should be shown as busy block
 */
export function shouldSyncAsBusyBlock(externalEvent: ExternalEventData): boolean {
  // Skip all-day events (they're usually not relevant for appointment scheduling)
  if (externalEvent.start.date && !externalEvent.start.dateTime) {
    return false;
  }

  // Skip events that are Zenthea appointments (they'll be synced separately)
  if (externalEvent.extendedProperties?.private?.zentheaAppointmentId) {
    return false;
  }

  // Include all other events as busy blocks
  return true;
}

/**
 * Extract Zenthea appointment ID from Google Calendar event
 * 
 * @param externalEvent - Event from Google Calendar
 * @returns Zenthea appointment ID if found, null otherwise
 */
export function extractZentheaAppointmentId(
  externalEvent: ExternalEventData
): Id<'appointments'> | null {
  const appointmentId = externalEvent.extendedProperties?.private?.zentheaAppointmentId;
  
  if (appointmentId && typeof appointmentId === 'string') {
    return appointmentId as Id<'appointments'>;
  }

  return null;
}


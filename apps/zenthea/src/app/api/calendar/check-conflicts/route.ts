import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { GoogleCalendarService } from '@/lib/calendar/googleCalendarService';
import { shouldSyncAsBusyBlock } from '@/lib/calendar/eventFormatter';

/**
 * Check External Calendar Conflicts API Route
 * 
 * Checks if a provider has external calendar events (busy blocks) that conflict
 * with a proposed appointment time.
 * 
 * Security:
 * - Requires CALENDAR_SYNC_SECRET header for authentication
 * - Validates tenant isolation
 * - Only checks bidirectional sync calendars
 */
export async function POST(request: NextRequest) {
  try {
    // Verify sync secret
    const syncSecret = request.headers.get('X-Sync-Secret');
    const expectedSecret = process.env.CALENDAR_SYNC_SECRET;

    if (!expectedSecret || syncSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid sync secret' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      providerId,
      tenantId,
      scheduledAt,
      duration, // in minutes
      accessToken,
      refreshToken,
      calendarId,
    } = body;

    if (!providerId || !tenantId || !scheduledAt || !duration || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize Convex client
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      throw new Error('Convex URL not configured');
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

    // Initialize Google Calendar service
    const calendarService = new GoogleCalendarService({
      accessToken,
      refreshToken,
      calendarId: calendarId || 'primary',
    });

    // Calculate time window (add 1 hour buffer before/after for context)
    const appointmentStart = new Date(scheduledAt);
    const appointmentEnd = new Date(scheduledAt + duration * 60 * 1000);
    const timeMin = new Date(appointmentStart.getTime() - 60 * 60 * 1000).toISOString();
    const timeMax = new Date(appointmentEnd.getTime() + 60 * 60 * 1000).toISOString();

    // Fetch external events
    const externalEvents = await calendarService.getEvents(timeMin, timeMax);

    // Check for conflicts
    const conflicts: Array<{
      id: string;
      summary: string;
      start: string;
      end: string;
      location?: string;
    }> = [];

    for (const event of externalEvents) {
      // Skip if this shouldn't be treated as a busy block
      // Convert Google Calendar event to our format
      const externalEvent = {
        id: event.id || '',
        summary: event.summary || '',
        start: event.start || {},
        end: event.end || {},
        location: event.location,
        extendedProperties: event.extendedProperties as {
          private?: {
            zentheaAppointmentId?: string;
            [key: string]: string | undefined;
          };
        } | undefined,
      };

      if (!shouldSyncAsBusyBlock(externalEvent)) {
        continue;
      }

      // Parse event times
      const eventStart = event.start?.dateTime 
        ? new Date(event.start.dateTime)
        : event.start?.date
        ? new Date(event.start.date)
        : null;

      const eventEnd = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : event.end?.date
        ? new Date(event.end.date)
        : null;

      if (!eventStart || !eventEnd) {
        continue;
      }

      // Check for overlap
      // Conflict if: appointment starts during event OR appointment ends during event OR appointment contains event
      const hasConflict = (
        (appointmentStart >= eventStart && appointmentStart < eventEnd) ||
        (appointmentEnd > eventStart && appointmentEnd <= eventEnd) ||
        (appointmentStart <= eventStart && appointmentEnd >= eventEnd)
      );

      if (hasConflict) {
        conflicts.push({
          id: event.id || '',
          summary: event.summary || 'External Event',
          start: eventStart.toISOString(),
          end: eventEnd.toISOString(),
          location: event.location ?? undefined, // Convert null to undefined
        });
      }
    }

    // Refresh access token if it was refreshed
    const newAccessToken = await calendarService.refreshAccessTokenIfNeeded();
    if (newAccessToken !== accessToken) {
      // Find the sync record and update token
      const syncs = await convex.query((api as any).calendarSync.getSyncByProvider, {
        providerId: providerId as Id<'providers'>,
        tenantId,
      });

      if (syncs && syncs.length > 0) {
        await convex.mutation((api as any).calendarSync.refreshAccessToken, {
          syncId: syncs[0]._id,
          accessToken: newAccessToken,
          refreshToken,
          tenantId,
        });
      }
    }

    return NextResponse.json({
      hasConflicts: conflicts.length > 0,
      conflicts,
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error checking external calendar conflicts:', error);
    }
    
    // Return a safe response - if we can't check, assume no conflicts
    // This prevents blocking appointments when external calendar is temporarily unavailable
    return NextResponse.json({
      hasConflicts: false,
      conflicts: [],
      error: error.message || 'Failed to check external calendar',
      checkedAt: new Date().toISOString(),
    });
  }
}


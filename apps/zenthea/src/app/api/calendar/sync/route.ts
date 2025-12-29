import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { GoogleCalendarService } from '@/lib/calendar/googleCalendarService';
import { formatAppointmentForGoogleCalendar } from '@/lib/calendar/eventFormatter';

/**
 * Calendar Sync API Route
 * 
 * Handles calendar synchronization between Zenthea and Google Calendar.
 * Called by Convex scheduled functions.
 * 
 * Security:
 * - Requires CALENDAR_SYNC_SECRET header for authentication
 * - Validates tenant isolation
 * - Uses HIPAA-compliant event formatting
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
      syncId,
      providerId,
      tenantId,
      accessToken,
      refreshToken,
      calendarId,
      syncType,
      syncDirection,
    } = body;

    if (!syncId || !providerId || !tenantId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Only support Google Calendar for now
    if (syncType !== 'google') {
      return NextResponse.json(
        { error: 'Unsupported sync type' },
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

    // Get appointments for the provider that need syncing
    // Sync appointments from the last sync time (or last 30 days if no previous sync)
    const lastSyncTime = await convex.query(
      (api as any).calendarSync.getSyncStatusByType,
      {
        providerId: providerId as Id<'providers'>,
        syncType: 'google',
        tenantId,
      }
    );

    const syncStartTime = lastSyncTime?.lastSyncAt 
      ? lastSyncTime.lastSyncAt 
      : Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    const syncEndTime = Date.now() + 90 * 24 * 60 * 60 * 1000; // 90 days in the future

    // Get appointments in the sync range
    // Using provider-based query since calendar sync is provider-centric
    const appointments = await convex.query(
      api.appointments.getAppointmentsByDateRangeProvider,
      {
        providerId: providerId as Id<'providers'>,
        startDate: syncStartTime,
        endDate: syncEndTime,
        tenantId,
      }
    );

    let synced = 0;
    let errors = 0;
    const errorsList: string[] = [];

    // Sync each appointment to Google Calendar
    for (const appointment of appointments) {
      try {
        // Skip cancelled appointments
        if (appointment.status === 'cancelled') {
          // Try to delete from Google Calendar if it exists
          const googleEventId = appointment.googleCalendarEventId;
          if (googleEventId) {
            try {
              await calendarService.deleteEvent(googleEventId);
            } catch (error) {
              // Event might not exist - that's okay
              if (process.env.NODE_ENV === 'development') {
                console.warn(`Could not delete cancelled appointment from Google Calendar: ${error}`);
              }
            }
          }
          continue;
        }

        // Get location name if available
        const locationName = appointment.locationId
          ? await convex.query((api as any).locations.getLocation, {
              id: appointment.locationId,
            }).then(loc => loc?.name)
          : null;

        // Format appointment for Google Calendar (HIPAA-compliant)
        const googleEvent = formatAppointmentForGoogleCalendar(
          {
            _id: appointment._id,
            scheduledAt: appointment.scheduledAt,
            duration: appointment.duration,
            locationName,
            type: appointment.type,
          },
          'UTC' // TODO: Get provider's timezone
        );

        // Check if appointment already has a Google Calendar event ID
        const existingGoogleEventId = appointment.googleCalendarEventId;

        if (existingGoogleEventId) {
          // Update existing event
          try {
            await calendarService.updateEvent(existingGoogleEventId, googleEvent);
            synced++;
          } catch (error: any) {
            if (error.message.includes('not found')) {
              // Event was deleted from Google Calendar, create new one
              const newEvent = await calendarService.createEvent(googleEvent);
              // Update appointment with new Google Calendar event ID
              if (newEvent.id) {
                await convex.mutation(api.appointments.updateAppointment, {
                  id: appointment._id,
                  googleCalendarEventId: newEvent.id,
                });
              }
              synced++;
            } else {
              throw error;
            }
          }
        } else {
          // Create new event
          const newEvent = await calendarService.createEvent(googleEvent);
          // Store Google Calendar event ID in appointment
          if (newEvent.id) {
            await convex.mutation(api.appointments.updateAppointment, {
              id: appointment._id,
              googleCalendarEventId: newEvent.id,
            });
          }
          synced++;
        }
      } catch (error: any) {
        errors++;
        errorsList.push(`Appointment ${appointment._id}: ${error.message}`);
        if (process.env.NODE_ENV === 'development') {
          console.error(`Error syncing appointment ${appointment._id}:`, error);
        }
      }
    }

    // If bidirectional sync, fetch external events and mark as busy blocks
    if (syncDirection === 'bidirectional') {
      try {
        const timeMin = new Date(syncStartTime).toISOString();
        const timeMax = new Date(syncEndTime).toISOString();
        
        await calendarService.getEvents(timeMin, timeMax);
        
        // Process external events (mark as busy blocks, etc.)
        // TODO: Store external events as availability blocks
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching external events:', error);
        }
        // Don't fail the entire sync if external events fail
      }
    }

    // Refresh access token if it was refreshed during sync
    const newAccessToken = await calendarService.refreshAccessTokenIfNeeded();
    if (newAccessToken !== accessToken) {
      // Update token in Convex
      await convex.mutation((api as any).calendarSync.refreshAccessToken, {
        syncId: syncId as Id<'calendarSync'>,
        accessToken: newAccessToken,
        refreshToken, // Keep existing refresh token
        tenantId,
      });
    }

    return NextResponse.json({
      success: true,
      synced,
      errors,
      errorsList: errorsList.length > 0 ? errorsList : undefined,
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in calendar sync:', error);
    }
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}


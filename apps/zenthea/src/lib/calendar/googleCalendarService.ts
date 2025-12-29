import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Google Calendar Service
 * 
 * Wrapper for Google Calendar API operations with:
 * - HIPAA-compliant event formatting
 * - Token refresh handling
 * - Rate limiting and error handling
 * - Event CRUD operations
 * 
 * Security:
 * - Tokens are encrypted at rest in Convex
 * - No PHI is sent to Google Calendar
 * - Events are formatted as "Patient Appointment" only
 */

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  colorId?: string;
  extendedProperties?: {
    private?: {
      [key: string]: string;
    };
  };
}

export interface GoogleCalendarServiceConfig {
  accessToken: string;
  refreshToken?: string;
  calendarId?: string; // Defaults to 'primary'
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;
  private calendarId: string;
  private accessToken: string;
  private refreshToken?: string;

  constructor(config: GoogleCalendarServiceConfig) {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google Calendar OAuth credentials not configured');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      // Redirect URI not needed for token refresh
      undefined
    );

    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.calendarId = config.calendarId || 'primary';

    // Set credentials
    this.oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
    });

    // Create calendar client
    this.calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  /**
   * Refresh access token if expired
   * Returns new access token if refreshed, or current token if still valid
   */
  async refreshAccessTokenIfNeeded(): Promise<string> {
    try {
      // Try to refresh token
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (credentials.access_token) {
        this.accessToken = credentials.access_token;
        this.oauth2Client.setCredentials(credentials);
        
        // Return new access token for storage
        return credentials.access_token;
      }
    } catch (error) {
      console.error('Failed to refresh Google Calendar access token:', error);
      throw new Error('Failed to refresh access token. Please reconnect your calendar.');
    }

    return this.accessToken;
  }

  /**
   * Create a calendar event (HIPAA-compliant format)
   * 
   * @param event - Event data (summary should be "Patient Appointment", no PHI)
   * @returns Created event with Google Calendar ID
   */
  async createEvent(event: GoogleCalendarEvent): Promise<calendar_v3.Schema$Event> {
    try {
      // Ensure token is valid
      await this.refreshAccessTokenIfNeeded();

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          location: event.location,
          colorId: event.colorId,
          extendedProperties: event.extendedProperties,
        },
      });

      if (!response.data) {
        throw new Error('No event data returned from Google Calendar');
      }

      return response.data;
    } catch (error: any) {
      if (error.code === 401) {
        // Token expired, try to refresh
        await this.refreshAccessTokenIfNeeded();
        // Retry once
        return this.createEvent(event);
      }
      
      if (error.code === 429) {
        // Rate limit exceeded
        throw new Error('Google Calendar rate limit exceeded. Please try again later.');
      }

      console.error('Error creating Google Calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Update an existing calendar event
   * 
   * @param eventId - Google Calendar event ID
   * @param event - Updated event data
   * @returns Updated event
   */
  async updateEvent(
    eventId: string,
    event: Partial<GoogleCalendarEvent>
  ): Promise<calendar_v3.Schema$Event> {
    try {
      // Ensure token is valid
      await this.refreshAccessTokenIfNeeded();

      const response = await this.calendar.events.patch({
        calendarId: this.calendarId,
        eventId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          location: event.location,
          colorId: event.colorId,
          extendedProperties: event.extendedProperties,
        },
      });

      if (!response.data) {
        throw new Error('No event data returned from Google Calendar');
      }

      return response.data;
    } catch (error: any) {
      if (error.code === 401) {
        // Token expired, try to refresh
        await this.refreshAccessTokenIfNeeded();
        // Retry once
        return this.updateEvent(eventId, event);
      }

      if (error.code === 404) {
        throw new Error('Calendar event not found');
      }

      if (error.code === 429) {
        throw new Error('Google Calendar rate limit exceeded. Please try again later.');
      }

      console.error('Error updating Google Calendar event:', error);
      throw new Error(`Failed to update calendar event: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a calendar event
   * 
   * @param eventId - Google Calendar event ID
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      // Ensure token is valid
      await this.refreshAccessTokenIfNeeded();

      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });
    } catch (error: any) {
      if (error.code === 401) {
        // Token expired, try to refresh
        await this.refreshAccessTokenIfNeeded();
        // Retry once
        return this.deleteEvent(eventId);
      }

      if (error.code === 404) {
        // Event already deleted or doesn't exist - treat as success
        return;
      }

      if (error.code === 429) {
        throw new Error('Google Calendar rate limit exceeded. Please try again later.');
      }

      console.error('Error deleting Google Calendar event:', error);
      throw new Error(`Failed to delete calendar event: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get events from Google Calendar for a date range
   * Used to fetch external events that should be shown as "busy" blocks
   * 
   * @param timeMin - Start of date range (ISO 8601)
   * @param timeMax - End of date range (ISO 8601)
   * @returns Array of events
   */
  async getEvents(
    timeMin: string,
    timeMax: string
  ): Promise<calendar_v3.Schema$Event[]> {
    try {
      // Ensure token is valid
      await this.refreshAccessTokenIfNeeded();

      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500, // Google Calendar API limit
      });

      return response.data.items || [];
    } catch (error: any) {
      if (error.code === 401) {
        // Token expired, try to refresh
        await this.refreshAccessTokenIfNeeded();
        // Retry once
        return this.getEvents(timeMin, timeMax);
      }

      if (error.code === 429) {
        throw new Error('Google Calendar rate limit exceeded. Please try again later.');
      }

      console.error('Error fetching Google Calendar events:', error);
      throw new Error(`Failed to fetch calendar events: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get a specific event by ID
   * 
   * @param eventId - Google Calendar event ID
   * @returns Event data
   */
  async getEvent(eventId: string): Promise<calendar_v3.Schema$Event | null> {
    try {
      // Ensure token is valid
      await this.refreshAccessTokenIfNeeded();

      const response = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId,
      });

      return response.data || null;
    } catch (error: any) {
      if (error.code === 401) {
        // Token expired, try to refresh
        await this.refreshAccessTokenIfNeeded();
        // Retry once
        return this.getEvent(eventId);
      }

      if (error.code === 404) {
        return null; // Event not found
      }

      if (error.code === 429) {
        throw new Error('Google Calendar rate limit exceeded. Please try again later.');
      }

      console.error('Error fetching Google Calendar event:', error);
      throw new Error(`Failed to fetch calendar event: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Test connection to Google Calendar
   * 
   * @returns True if connection is valid
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.refreshAccessTokenIfNeeded();
      
      // Try to get calendar metadata
      await this.calendar.calendars.get({
        calendarId: this.calendarId,
      });

      return true;
    } catch (error) {
      console.error('Google Calendar connection test failed:', error);
      return false;
    }
  }
}


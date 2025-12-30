import { NextRequest, NextResponse } from 'next/server';
import { getZentheaServerSession } from '@/lib/auth';

import { google } from 'googleapis';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

/**
 * Google Calendar OAuth Callback Route
 * 
 * Handles the OAuth callback from Google, exchanges authorization code for tokens,
 * and stores them securely in Convex via the calendarSync API.
 * 
 * Query Parameters:
 * - code: Authorization code from Google
 * - state: Optional state parameter
 * 
 * Security:
 * - Validates code verifier (PKCE)
 * - Verifies user session matches OAuth flow
 * - Stores tokens encrypted in Convex
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Google Calendar OAuth error:', error);
      }
      return NextResponse.redirect(
        `${request.nextUrl.origin}/company/calendar?error=oauth_cancelled&tab=sync`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/company/calendar?error=missing_code&tab=sync`
      );
    }

    // Get stored values from cookies
    const codeVerifier = request.cookies.get('google_calendar_code_verifier')?.value;
    const userId = request.cookies.get('google_calendar_user_id')?.value;
    const tenantId = request.cookies.get('google_calendar_tenant_id')?.value;

    if (!codeVerifier || !userId || !tenantId) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Missing OAuth state - cookies may have expired');
      }
      return NextResponse.redirect(
        `${request.nextUrl.origin}/company/calendar?error=expired_session&tab=sync`
      );
    }

    // Verify current session matches OAuth flow
    const session = await getZentheaServerSession();
    if (!session || session.user.id !== userId || session.user.tenantId !== tenantId) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Session mismatch in OAuth callback');
      }
      return NextResponse.redirect(
        `${request.nextUrl.origin}/company/calendar?error=session_mismatch&tab=sync`
      );
    }

    // Get OAuth credentials
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/api/auth/google-calendar/callback`;

    if (!clientId || !clientSecret) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Google Calendar OAuth credentials not configured');
      }
      return NextResponse.redirect(
        `${request.nextUrl.origin}/company/calendar?error=not_configured&tab=sync`
      );
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange authorization code for tokens with PKCE
    // Note: googleapis getToken doesn't support PKCE directly, so we make the request manually
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const tokenRequestBody = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      if (process.env.NODE_ENV === 'development') {
        console.error('Token exchange failed:', errorText);
      }
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token received from Google');
    }

    // Set tokens on OAuth2 client for subsequent API calls
    const tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expires_in 
        ? Date.now() + tokenData.expires_in * 1000 
        : undefined,
      scope: tokenData.scope,
      token_type: tokenData.token_type,
    };
    
    oauth2Client.setCredentials(tokens);

    // Get user's calendar ID (usually "primary")
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Get calendar list to find primary calendar
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(
      (cal: any) => cal.primary === true
    ) || calendarList.data.items?.[0];

    const calendarId = primaryCalendar?.id || 'primary';

    // Initialize Convex client
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      throw new Error('Convex URL not configured');
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

    // Store tokens in Convex using user-based function (will be encrypted)
    await convex.mutation((api as any).calendarSync.initGoogleCalendarSyncByUser, {
      userId: userId as Id<'users'>,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      calendarId,
      syncDirection: 'bidirectional', // Default to bidirectional
      tenantId,
    });

    // Clear OAuth cookies
    const response = NextResponse.redirect(
      `${request.nextUrl.origin}/company/calendar?success=calendar_connected&tab=sync`
    );

    response.cookies.delete('google_calendar_code_verifier');
    response.cookies.delete('google_calendar_user_id');
    response.cookies.delete('google_calendar_tenant_id');

    return response;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in Google Calendar OAuth callback:', error);
    }
    return NextResponse.redirect(
      `${request.nextUrl.origin}/company/calendar?error=oauth_failed&tab=sync`
    );
  }
}


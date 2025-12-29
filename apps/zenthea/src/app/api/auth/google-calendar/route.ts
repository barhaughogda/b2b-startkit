import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Google Calendar OAuth Initiation Route
 * 
 * Initiates the OAuth 2.0 flow for Google Calendar integration.
 * Redirects user to Google's authorization page.
 * 
 * Query Parameters:
 * - redirect_uri: Optional callback URL (defaults to /api/auth/google-calendar/callback)
 * 
 * Security:
 * - Requires authenticated session
 * - Validates user is a provider
 * - Uses PKCE for secure OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Verify user is a provider
    if (session.user.role !== 'provider') {
      return NextResponse.json(
        { error: 'Forbidden - Provider access required' },
        { status: 403 }
      );
    }

    // Get OAuth credentials from environment
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const redirectUri = request.nextUrl.searchParams.get('redirect_uri') || 
      `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/api/auth/google-calendar/callback`;

    if (!clientId || !clientSecret) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Google Calendar OAuth credentials not configured');
      }
      return NextResponse.json(
        { error: 'Google Calendar integration not configured' },
        { status: 500 }
      );
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Manually construct authorization URL with PKCE parameters
    // Note: googleapis generateAuthUrl doesn't support PKCE in TypeScript types,
    // so we build the URL manually to ensure proper PKCE support
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' '));
    authUrl.searchParams.set('access_type', 'offline'); // Request refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Force consent screen to get refresh token
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Store code verifier in session/cookie for callback verification
    // Using httpOnly cookie for security
    const response = NextResponse.redirect(authUrl.toString());

    // Store code verifier and user info in secure httpOnly cookie
    // Expires in 10 minutes (OAuth flow timeout)
    response.cookies.set('google_calendar_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    response.cookies.set('google_calendar_user_id', session.user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    response.cookies.set('google_calendar_tenant_id', session.user.tenantId || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    return response;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error initiating Google Calendar OAuth:', error);
    }
    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar authorization' },
      { status: 500 }
    );
  }
}

/**
 * Generate a random code verifier for PKCE
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generate code challenge from verifier using SHA-256
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
}

/**
 * Base64 URL encode (RFC 4648)
 * Uses Node.js Buffer for server-side compatibility (btoa is browser-only)
 */
function base64URLEncode(buffer: Uint8Array): string {
  // Convert Uint8Array to Buffer and encode to base64
  const base64 = Buffer.from(buffer).toString('base64');
  // Convert to URL-safe base64 (RFC 4648)
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}


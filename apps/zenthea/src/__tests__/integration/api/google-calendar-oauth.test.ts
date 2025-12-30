/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/auth/google-calendar/callback/route';
import { getZentheaServerSession } from '@/lib/auth';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getZentheaServerSession: vi.fn(),
  authOptions: {},
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(),
    },
  },
}));

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn(() => ({
    mutation: vi.fn(),
  })),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Note: @/convex/_generated/api is already mocked globally in src/__tests__/setup.ts

describe('Google Calendar OAuth Callback', () => {
  const mockGetServerSession = require('@/lib/auth').getZentheaServerSession;
  const mockConvexHttpClient = require('convex/browser').ConvexHttpClient;
  const mockFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variables
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'test-client-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  });

  it('should redirect with error when OAuth error parameter is present', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/auth/google-calendar/callback?error=access_denied'
    );

    const response = await GET(request);
    
    expect(response.status).toBe(307); // Redirect
    const location = response.headers.get('location');
    expect(location).toContain('/provider/calendar');
    expect(location).toContain('error=oauth_cancelled');
    expect(location).toContain('tab=sync');
  });

  it('should redirect with error when code is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/auth/google-calendar/callback'
    );

    const response = await GET(request);
    
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('error=missing_code');
  });

  it('should redirect with error when cookies are missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/auth/google-calendar/callback?code=test-code'
    );

    const response = await GET(request);
    
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('error=expired_session');
  });

  it('should redirect with error when session mismatch', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'different-user-id',
        tenantId: 'tenant-123',
      },
    });

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google-calendar/callback?code=test-code',
      {
        headers: {
          cookie: 'google_calendar_code_verifier=verifier; google_calendar_user_id=user-123; google_calendar_tenant_id=tenant-123',
        },
      }
    );

    const response = await GET(request);
    
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('error=session_mismatch');
  });

  it('should redirect with error when OAuth credentials are not configured', async () => {
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
    delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        tenantId: 'tenant-123',
      },
    });

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google-calendar/callback?code=test-code',
      {
        headers: {
          cookie: 'google_calendar_code_verifier=verifier; google_calendar_user_id=user-123; google_calendar_tenant_id=tenant-123',
        },
      }
    );

    const response = await GET(request);
    
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('error=not_configured');
  });

  it('should handle successful OAuth flow', async () => {
    // Restore env vars
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'test-client-secret';

    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        tenantId: 'tenant-123',
      },
    });

    // Mock successful token exchange
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
      }),
    });

    const mockMutation = vi.fn().mockResolvedValue({ _id: 'sync-1' });
    mockConvexHttpClient.mockImplementation(() => ({
      mutation: mockMutation,
    }));

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google-calendar/callback?code=test-code',
      {
        headers: {
          cookie: 'google_calendar_code_verifier=verifier; google_calendar_user_id=user-123; google_calendar_tenant_id=tenant-123',
        },
      }
    );

    const response = await GET(request);
    
    // Should redirect to success page
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/provider/calendar');
    expect(location).toContain('success=calendar_connected');
    
    // Restore fetch
    global.fetch = mockFetch;
  });
});


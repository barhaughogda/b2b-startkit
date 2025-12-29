import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock admin-auth
const mockVerifyAdminAuth = vi.fn();
vi.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: () => mockVerifyAdminAuth(),
}));

// Mock Convex
const mockConvexQueryFn = vi.fn();
const mockConvexMutationFn = vi.fn();
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    query: mockConvexQueryFn,
    mutation: mockConvexMutationFn,
  })),
}));

// Mock Convex generated API
vi.mock('../../../../../convex/_generated/api', () => ({
  api: {
    admin: {
      systemSettings: {
        getSystemSettings: vi.fn(),
        updateSystemSettings: vi.fn(),
      },
    },
  },
}));

// Mock environment variable
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url';

// Import routes after mocks
let GET: typeof import('@/app/api/admin/system-settings/route').GET;
let PUT: typeof import('@/app/api/admin/system-settings/route').PUT;

describe('GET /api/admin/system-settings', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import('@/app/api/admin/system-settings/route');
    GET = routeModule.GET;
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/system-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 if user is not admin', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Forbidden - Admin access required' }),
          { status: 403 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/system-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });

    it('should allow admin users to access endpoint', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });

      const mockSettings = {
        sessionTimeout: 30,
        maxConcurrentSessions: 5,
        emailNotifications: true,
        timezone: 'UTC',
      };

      mockConvexQueryFn.mockResolvedValue(mockSettings);

      const request = new NextRequest('http://localhost:3000/api/admin/system-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSettings);
    });
  });

  describe('Tenant Isolation', () => {
    it('should filter settings by tenantId from session', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-123',
      });

      mockConvexQueryFn.mockResolvedValue({ sessionTimeout: 30 });

      const request = new NextRequest('http://localhost:3000/api/admin/system-settings');
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        { tenantId: 'tenant-123' }
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });
    });

    it('should handle Convex query errors gracefully', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Convex query failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/system-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch system settings');
      expect(data.message).toBe('Convex query failed');
    });

    it('should return 500 for unexpected errors', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/admin/system-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unexpected error');
    });
  });
});

describe('PUT /api/admin/system-settings', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import('@/app/api/admin/system-settings/route');
    PUT = routeModule.PUT;
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/system-settings', {
        method: 'PUT',
        body: JSON.stringify({ sessionTimeout: 30 }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not admin', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Forbidden - Admin access required' }),
          { status: 403 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/system-settings', {
        method: 'PUT',
        body: JSON.stringify({ sessionTimeout: 30 }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(403);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });
    });

    it('should validate session timeout range', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/system-settings', {
        method: 'PUT',
        body: JSON.stringify({ sessionTimeout: 3 }), // Too low
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.errors).toContain('Session timeout must be between 5 and 480 minutes');
    });

    it('should validate max concurrent sessions range', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/system-settings', {
        method: 'PUT',
        body: JSON.stringify({ maxConcurrentSessions: 15 }), // Too high
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Max concurrent sessions must be between 1 and 10');
    });

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/system-settings', {
        method: 'PUT',
        body: JSON.stringify({
          emailNotifications: true,
          emailFromAddress: 'invalid-email',
        }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Invalid email from address format');
    });

    it('should validate time format', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/system-settings', {
        method: 'PUT',
        body: JSON.stringify({ timeFormat: '25h' }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain("Time format must be '12h' or '24h'");
    });
  });

  describe('Successful Updates', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });
    });

    it('should update system settings successfully', async () => {
      const updatedSettings = {
        sessionTimeout: 60,
        maxConcurrentSessions: 5,
        timezone: 'America/New_York',
      };

      mockConvexMutationFn.mockResolvedValue(updatedSettings);

      const request = new NextRequest('http://localhost:3000/api/admin/system-settings', {
        method: 'PUT',
        body: JSON.stringify(updatedSettings),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedSettings);
      expect(mockConvexMutationFn).toHaveBeenCalledWith(
        expect.anything(),
        {
          tenantId: 'tenant-1',
          settings: updatedSettings,
        }
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });
    });

    it('should handle Convex mutation errors gracefully', async () => {
      mockConvexMutationFn.mockRejectedValue(new Error('Convex mutation failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/system-settings', {
        method: 'PUT',
        body: JSON.stringify({ sessionTimeout: 30 }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update system settings');
    });
  });
});


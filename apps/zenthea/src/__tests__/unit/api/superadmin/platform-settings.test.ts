import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock superadmin-auth
const mockVerifySuperAdminAuth = vi.fn();
vi.mock('@/lib/superadmin-auth', () => ({
  verifySuperAdminAuth: () => mockVerifySuperAdminAuth(),
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
      platformSettings: {
        getPlatformSettings: vi.fn(),
        updatePlatformSettings: vi.fn(),
      },
    },
  },
}));

// Mock environment variable
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url';

// Import routes after mocks
let GET: typeof import('@/app/api/superadmin/platform-settings/route').GET;
let PUT: typeof import('@/app/api/superadmin/platform-settings/route').PUT;

describe('GET /api/superadmin/platform-settings', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import('@/app/api/superadmin/platform-settings/route');
    GET = routeModule.GET;
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 if user is not superadmin', async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Forbidden - Superadmin access required' }),
          { status: 403 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Superadmin access required');
    });

    it('should return platform settings for superadmin user', async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });

      const mockSettings = {
        passwordMinLength: 12,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecialChars: true,
        mfaRequired: false,
        sessionTimeout: 60,
        accountLockoutMaxAttempts: 5,
        accountLockoutDuration: 30,
        apiKeys: [],
        webhooks: [],
      };

      mockConvexQueryFn.mockResolvedValue(mockSettings);

      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSettings);
    });
  });

  describe('Convex Function Deployment Errors', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should handle Convex function not deployed error', async () => {
      const error = new Error('Could not find public function for admin/platformSettings:getPlatformSettings');
      mockConvexQueryFn.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Convex function not deployed');
      expect(data.code).toBe('CONVEX_FUNCTION_NOT_DEPLOYED');
      expect(data.message).toContain('npx convex dev');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should handle Convex query errors gracefully', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Convex query failed'));

      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch platform settings');
      expect(data.code).toBe('FETCH_PLATFORM_SETTINGS_ERROR');
    });
  });
});

describe('PUT /api/superadmin/platform-settings', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import('@/app/api/superadmin/platform-settings/route');
    PUT = routeModule.PUT;
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({ passwordMinLength: 12 }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not superadmin', async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Forbidden - Superadmin access required' }),
          { status: 403 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({ passwordMinLength: 12 }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(403);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should validate password minimum length range', async () => {
      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({ passwordMinLength: 5 }), // Too low
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.errors).toContain('Password minimum length must be between 8 and 128 characters');
    });

    it('should validate session timeout range', async () => {
      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({ sessionTimeout: 3 }), // Too low
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Session timeout must be between 5 and 480 minutes');
    });

    it('should validate account lockout max attempts range', async () => {
      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({ accountLockoutMaxAttempts: 2 }), // Too low
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Account lockout max attempts must be between 3 and 10');
    });

    it('should validate API keys structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({ apiKeys: 'not-an-array' }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('API keys must be an array');
    });

    it('should validate webhooks structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({ webhooks: 'not-an-array' }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Webhooks must be an array');
    });
  });

  describe('Successful Updates', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should update platform settings successfully', async () => {
      const updatedSettings = {
        passwordMinLength: 12,
        passwordRequireUppercase: true,
        sessionTimeout: 60,
      };

      mockConvexMutationFn.mockResolvedValue(updatedSettings);

      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings', {
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
        { settings: updatedSettings }
      );
    });
  });

  describe('Convex Function Deployment Errors', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should handle Convex function not deployed error', async () => {
      const error = new Error('Could not find public function for admin/platformSettings:updatePlatformSettings');
      mockConvexMutationFn.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({ passwordMinLength: 12 }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Convex function not deployed');
      expect(data.code).toBe('CONVEX_FUNCTION_NOT_DEPLOYED');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should handle Convex mutation errors gracefully', async () => {
      mockConvexMutationFn.mockRejectedValue(new Error('Convex mutation failed'));

      const request = new NextRequest('http://localhost:3000/api/superadmin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({ passwordMinLength: 12 }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update platform settings');
      expect(data.code).toBe('UPDATE_PLATFORM_SETTINGS_ERROR');
    });
  });
});


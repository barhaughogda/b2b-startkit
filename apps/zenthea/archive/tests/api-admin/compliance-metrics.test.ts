import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock admin-auth
const mockVerifyAdminAuth = vi.fn();
vi.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: () => mockVerifyAdminAuth(),
}));

// Mock Convex
const mockConvexQueryFn = vi.fn();
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    query: mockConvexQueryFn,
  })),
}));

// Mock Convex generated API
vi.mock('../../../../../convex/_generated/api', () => ({
  api: {
    admin: {
      complianceMetrics: {
        getComplianceMetrics: vi.fn(),
      },
    },
  },
}));

// Mock environment variable
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url';

// Import route after mocks
let GET: typeof import('@/app/api/admin/compliance-metrics/route').GET;

describe('GET /api/admin/compliance-metrics', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import('@/app/api/admin/compliance-metrics/route');
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

      const request = new NextRequest('http://localhost:3000/api/admin/compliance-metrics');
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

      const request = new NextRequest('http://localhost:3000/api/admin/compliance-metrics');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('should return compliance metrics for admin user', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });

      const mockMetrics = {
        hipaaCompliant: true,
        auditLogsCount: 1000,
        dataRetentionDays: 2555, // 7 years
        lastComplianceCheck: new Date().toISOString(),
        consentFormsSigned: 500,
        privacyPolicyAccepted: 450,
      };

      mockConvexQueryFn.mockResolvedValue(mockMetrics);

      const request = new NextRequest('http://localhost:3000/api/admin/compliance-metrics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockMetrics);
    });
  });

  describe('Tenant Isolation', () => {
    it('should filter metrics by tenantId from session', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-123',
      });

      mockConvexQueryFn.mockResolvedValue({ hipaaCompliant: true });

      const request = new NextRequest('http://localhost:3000/api/admin/compliance-metrics');
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

      const request = new NextRequest('http://localhost:3000/api/admin/compliance-metrics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch compliance metrics');
    });
  });
});


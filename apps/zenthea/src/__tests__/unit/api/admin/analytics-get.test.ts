import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { getZentheaServerSession } from '@/lib/auth';

// Mock hook
vi.mock('@/lib/auth', () => ({
  getZentheaServerSession: vi.fn(),
}));

// Mock Convex
const mockConvexQueryFn = vi.fn();
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    query: mockConvexQueryFn,
  })),
}));

// Mock Convex generated API - must be before route import
vi.mock('../../../../../convex/_generated/api', () => ({
  api: {
    admin: {
      analytics: {
        getAnalytics: vi.fn(),
      },
    },
  },
}));

// Mock admin-auth helper
const mockVerifyAdminAuth = vi.fn();
vi.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: mockVerifyAdminAuth,
}));

// Mock environment variable
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url';

// Import route after mocks are set up
let GET: typeof import('@/app/api/admin/analytics/route').GET;

describe('GET /api/admin/analytics', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Dynamically import route after mocks
    const routeModule = await import('@/app/api/admin/analytics/route');
    GET = routeModule.GET;
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: false,
        response: NextResponse.json(
          {
            error: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED',
          },
          { status: 401 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 if user is not admin', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: false,
        response: NextResponse.json(
          {
            error: 'Forbidden - Admin access required',
            code: 'ADMIN_ACCESS_REQUIRED',
          },
          { status: 403 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });

    it('should allow admin users to access endpoint', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            role: 'admin',
            tenantId: 'tenant-1',
          },
        },
        tenantId: 'tenant-1',
      });

      mockConvexQueryFn.mockResolvedValue({
        patientGrowth: [],
        appointmentTrends: [],
        revenue: {
          total: 0,
          paid: 0,
          pending: 0,
          overdue: 0,
        },
        userActivity: [],
        performance: {
          averageResponseTime: 0,
          systemUptime: 100,
        },
        period: {
          startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
          endDate: Date.now(),
        },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Analytics Data Retrieval', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            role: 'admin',
            tenantId: 'tenant-1',
          },
        },
        tenantId: 'tenant-1',
      });
    });

    it('should return patient growth data', async () => {
      const mockAnalytics = {
        patientGrowth: [
          { date: '2025-01-01', count: 10, cumulative: 10 },
          { date: '2025-01-02', count: 5, cumulative: 15 },
          { date: '2025-01-03', count: 8, cumulative: 23 },
        ],
        appointmentTrends: [],
        revenue: { total: 0, paid: 0, pending: 0, overdue: 0 },
        userActivity: [],
        performance: { averageResponseTime: 0, systemUptime: 100 },
        period: { startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, endDate: Date.now() },
      };

      mockConvexQueryFn.mockResolvedValue(mockAnalytics);

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.patientGrowth).toHaveLength(3);
      expect(data.data.patientGrowth[0]).toMatchObject({
        date: '2025-01-01',
        count: 10,
        cumulative: 10,
      });
    });

    it('should return appointment trends data', async () => {
      const mockAnalytics = {
        patientGrowth: [],
        appointmentTrends: [
          { date: '2025-01-01', scheduled: 5, completed: 4, cancelled: 1 },
          { date: '2025-01-02', scheduled: 8, completed: 7, cancelled: 1 },
        ],
        revenue: { total: 0, paid: 0, pending: 0, overdue: 0 },
        userActivity: [],
        performance: { averageResponseTime: 0, systemUptime: 100 },
        period: { startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, endDate: Date.now() },
      };

      mockConvexQueryFn.mockResolvedValue(mockAnalytics);

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.appointmentTrends).toHaveLength(2);
      expect(data.data.appointmentTrends[0]).toMatchObject({
        date: '2025-01-01',
        scheduled: 5,
        completed: 4,
        cancelled: 1,
      });
    });

    it('should return revenue/billing metrics', async () => {
      const mockAnalytics = {
        patientGrowth: [],
        appointmentTrends: [],
        revenue: {
          total: 50000, // $500.00 in cents
          paid: 40000, // $400.00 in cents
          pending: 8000, // $80.00 in cents
          overdue: 2000, // $20.00 in cents
          dailyRevenue: [
            { date: '2025-01-01', amount: 10000 },
            { date: '2025-01-02', amount: 15000 },
          ],
        },
        userActivity: [],
        performance: { averageResponseTime: 0, systemUptime: 100 },
        period: { startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, endDate: Date.now() },
      };

      mockConvexQueryFn.mockResolvedValue(mockAnalytics);

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.revenue).toMatchObject({
        total: 50000,
        paid: 40000,
        pending: 8000,
        overdue: 2000,
      });
      expect(data.data.revenue.dailyRevenue).toHaveLength(2);
    });

    it('should return user activity analytics', async () => {
      const mockAnalytics = {
        patientGrowth: [],
        appointmentTrends: [],
        revenue: { total: 0, paid: 0, pending: 0, overdue: 0 },
        userActivity: [
          { date: '2025-01-01', activeUsers: 10, newUsers: 2, logins: 25 },
          { date: '2025-01-02', activeUsers: 12, newUsers: 3, logins: 30 },
        ],
        performance: { averageResponseTime: 0, systemUptime: 100 },
        period: { startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, endDate: Date.now() },
      };

      mockConvexQueryFn.mockResolvedValue(mockAnalytics);

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.userActivity).toHaveLength(2);
      expect(data.data.userActivity[0]).toMatchObject({
        date: '2025-01-01',
        activeUsers: 10,
        newUsers: 2,
        logins: 25,
      });
    });

    it('should return performance metrics', async () => {
      const mockAnalytics = {
        patientGrowth: [],
        appointmentTrends: [],
        revenue: { total: 0, paid: 0, pending: 0, overdue: 0 },
        userActivity: [],
        performance: {
          averageResponseTime: 150, // milliseconds
          systemUptime: 99.9, // percentage
          errorRate: 0.1, // percentage
          requestCount: 10000,
        },
        period: { startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, endDate: Date.now() },
      };

      mockConvexQueryFn.mockResolvedValue(mockAnalytics);

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.performance).toMatchObject({
        averageResponseTime: 150,
        systemUptime: 99.9,
        errorRate: 0.1,
        requestCount: 10000,
      });
    });
  });

  describe('Date Range Filtering', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            role: 'admin',
            tenantId: 'tenant-1',
          },
        },
        tenantId: 'tenant-1',
      });
    });

    it('should filter analytics by start date', async () => {
      const startDate = new Date('2025-01-01').toISOString();
      mockConvexQueryFn.mockResolvedValue({
        patientGrowth: [],
        appointmentTrends: [],
        revenue: { total: 0, paid: 0, pending: 0, overdue: 0 },
        userActivity: [],
        performance: { averageResponseTime: 0, systemUptime: 100 },
        period: { startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, endDate: Date.now() },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/admin/analytics?startDate=${startDate}`
      );
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'tenant-1',
          startDate: expect.any(Number),
        })
      );
    });

    it('should filter analytics by end date', async () => {
      const endDate = new Date('2025-01-31').toISOString();
      mockConvexQueryFn.mockResolvedValue({
        patientGrowth: [],
        appointmentTrends: [],
        revenue: { total: 0, paid: 0, pending: 0, overdue: 0 },
        userActivity: [],
        performance: { averageResponseTime: 0, systemUptime: 100 },
        period: { startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, endDate: Date.now() },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/admin/analytics?endDate=${endDate}`
      );
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'tenant-1',
          endDate: expect.any(Number),
        })
      );
    });

    it('should filter analytics by both start and end date', async () => {
      const startDate = new Date('2025-01-01').toISOString();
      const endDate = new Date('2025-01-31').toISOString();
      mockConvexQueryFn.mockResolvedValue({
        patientGrowth: [],
        appointmentTrends: [],
        revenue: { total: 0, paid: 0, pending: 0, overdue: 0 },
        userActivity: [],
        performance: { averageResponseTime: 0, systemUptime: 100 },
        period: { startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, endDate: Date.now() },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/admin/analytics?startDate=${startDate}&endDate=${endDate}`
      );
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'tenant-1',
          startDate: expect.any(Number),
          endDate: expect.any(Number),
        })
      );
    });

    it('should return 400 if start date is after end date', async () => {
      const startDate = new Date('2025-01-31').toISOString();
      const endDate = new Date('2025-01-01').toISOString();

      const request = new NextRequest(
        `http://localhost:3000/api/admin/analytics?startDate=${startDate}&endDate=${endDate}`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid date range');
      expect(data.message).toBe('Start date must be before end date');
      expect(mockConvexQueryFn).not.toHaveBeenCalled();
    });

    it('should use default date range (last 30 days) if not provided', async () => {
      mockConvexQueryFn.mockResolvedValue({
        patientGrowth: [],
        appointmentTrends: [],
        revenue: { total: 0, paid: 0, pending: 0, overdue: 0 },
        userActivity: [],
        performance: { averageResponseTime: 0, systemUptime: 100 },
        period: { startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, endDate: Date.now() },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'tenant-1',
        })
      );
    });
  });

  describe('Tenant Isolation', () => {
    it('should filter analytics by tenantId from session', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            role: 'admin',
            tenantId: 'tenant-123',
          },
        },
        tenantId: 'tenant-123',
      });

      mockConvexQueryFn.mockResolvedValue({
        patientGrowth: [],
        appointmentTrends: [],
        revenue: { total: 0, paid: 0, pending: 0, overdue: 0 },
        userActivity: [],
        performance: { averageResponseTime: 0, systemUptime: 100 },
        period: { startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, endDate: Date.now() },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'tenant-123',
        })
      );
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            role: 'admin',
            tenantId: 'tenant-1',
          },
        },
        tenantId: 'tenant-1',
      });
    });

    it('should return analytics data with proper structure', async () => {
      const mockData = {
        patientGrowth: [
          { date: '2025-01-01', count: 10, cumulative: 10 },
        ],
        appointmentTrends: [
          { date: '2025-01-01', scheduled: 5, completed: 4, cancelled: 1 },
        ],
        revenue: {
          total: 50000,
          paid: 40000,
          pending: 8000,
          overdue: 2000,
          dailyRevenue: [{ date: '2025-01-01', amount: 10000 }],
        },
        userActivity: [
          { date: '2025-01-01', activeUsers: 10, newUsers: 2, logins: 25 },
        ],
        performance: {
          averageResponseTime: 150,
          systemUptime: 99.9,
          errorRate: 0.1,
          requestCount: 10000,
        },
        period: {
          startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
          endDate: Date.now(),
        },
      };

      mockConvexQueryFn.mockResolvedValue(mockData);

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('patientGrowth');
      expect(data.data).toHaveProperty('appointmentTrends');
      expect(data.data).toHaveProperty('revenue');
      expect(data.data).toHaveProperty('userActivity');
      expect(data.data).toHaveProperty('performance');
      expect(data.data).toHaveProperty('period');
    });

    it('should format data suitable for charts', async () => {
      const mockData = {
        patientGrowth: [
          { date: '2025-01-01', count: 10, cumulative: 10 },
          { date: '2025-01-02', count: 5, cumulative: 15 },
        ],
        appointmentTrends: [],
        revenue: { total: 0, paid: 0, pending: 0, overdue: 0 },
        userActivity: [],
        performance: { averageResponseTime: 0, systemUptime: 100 },
        period: { startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, endDate: Date.now() },
      };

      mockConvexQueryFn.mockResolvedValue(mockData);

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Verify data structure is chart-friendly (arrays with date/value pairs)
      expect(Array.isArray(data.data.patientGrowth)).toBe(true);
      expect(data.data.patientGrowth[0]).toHaveProperty('date');
      expect(data.data.patientGrowth[0]).toHaveProperty('count');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            role: 'admin',
            tenantId: 'tenant-1',
          },
        },
        tenantId: 'tenant-1',
      });
    });

    it('should handle Convex query errors gracefully', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Convex query failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch analytics data');
    });

    it('should handle Convex function not deployed error', async () => {
      mockConvexQueryFn.mockRejectedValue(
        new Error('Could not find public function admin.analytics.getAnalytics')
      );

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Convex function not deployed');
    });

    it('should return 500 for unexpected errors', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/admin/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unexpected error');
    });
  });
});


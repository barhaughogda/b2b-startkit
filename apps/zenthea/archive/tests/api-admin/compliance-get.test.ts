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
      compliance: {
        getComplianceData: vi.fn(),
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

const mockGetZentheaServerSession = getZentheaServerSession as ReturnType<typeof vi.fn>;

// Import route after mocks are set up
let GET: typeof import('@/app/api/admin/compliance/route').GET;

describe('GET /api/admin/compliance', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Dynamically import route after mocks
    const routeModule = await import('@/app/api/admin/compliance/route');
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

      const request = new NextRequest('http://localhost:3000/api/admin/compliance');
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

      const request = new NextRequest('http://localhost:3000/api/admin/compliance');
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
        status: 'compliant',
        violations: [],
        score: 100,
        level: 'excellent',
        lastUpdated: Date.now(),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/compliance');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Compliance Data Retrieval', () => {
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

    it('should return compliance status', async () => {
      const mockComplianceData = {
        status: 'compliant',
        violations: [],
        score: 100,
        level: 'excellent',
        lastUpdated: Date.now(),
      };

      mockConvexQueryFn.mockResolvedValue(mockComplianceData);

      const request = new NextRequest('http://localhost:3000/api/admin/compliance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('compliant');
    });

    it('should return compliance violations', async () => {
      const mockViolations = [
        {
          id: 'violation-1',
          type: 'unauthorized_access',
          resource: 'patient_data',
          timestamp: Date.now() - 1000,
          severity: 'high',
          description: 'Unauthorized access attempt',
        },
        {
          id: 'violation-2',
          type: 'permission_denied',
          resource: 'phi',
          timestamp: Date.now() - 2000,
          severity: 'medium',
          description: 'Permission denied',
        },
      ];

      mockConvexQueryFn.mockResolvedValue({
        status: 'warning',
        violations: mockViolations,
        score: 85,
        level: 'good',
        lastUpdated: Date.now(),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/compliance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.violations).toHaveLength(2);
      expect(data.data.violations[0]).toMatchObject({
        type: 'unauthorized_access',
        severity: 'high',
      });
    });

    it('should return compliance score', async () => {
      mockConvexQueryFn.mockResolvedValue({
        status: 'compliant',
        violations: [],
        score: 95,
        level: 'excellent',
        lastUpdated: Date.now(),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/compliance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.score).toBe(95);
      expect(data.data.level).toBe('excellent');
    });

    it('should return compliance status with violations', async () => {
      mockConvexQueryFn.mockResolvedValue({
        status: 'non-compliant',
        violations: [
          {
            id: 'violation-1',
            type: 'unauthorized_access',
            resource: 'patient_data',
            timestamp: Date.now() - 1000,
            severity: 'high',
            description: 'Unauthorized access attempt',
          },
        ],
        score: 60,
        level: 'fair',
        lastUpdated: Date.now(),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/compliance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('non-compliant');
      expect(data.data.score).toBe(60);
      expect(data.data.level).toBe('fair');
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

    it('should filter compliance data by start date', async () => {
      const startDate = new Date('2025-01-01').toISOString();
      mockConvexQueryFn.mockResolvedValue({
        status: 'compliant',
        violations: [],
        score: 100,
        level: 'excellent',
        lastUpdated: Date.now(),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/admin/compliance?startDate=${startDate}`
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

    it('should filter compliance data by end date', async () => {
      const endDate = new Date('2025-01-31').toISOString();
      mockConvexQueryFn.mockResolvedValue({
        status: 'compliant',
        violations: [],
        score: 100,
        level: 'excellent',
        lastUpdated: Date.now(),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/admin/compliance?endDate=${endDate}`
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

    it('should filter compliance data by both start and end date', async () => {
      const startDate = new Date('2025-01-01').toISOString();
      const endDate = new Date('2025-01-31').toISOString();
      mockConvexQueryFn.mockResolvedValue({
        status: 'compliant',
        violations: [],
        score: 100,
        level: 'excellent',
        lastUpdated: Date.now(),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/admin/compliance?startDate=${startDate}&endDate=${endDate}`
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
        `http://localhost:3000/api/admin/compliance?startDate=${startDate}&endDate=${endDate}`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid date range');
      expect(data.message).toBe('Start date must be before end date');
      expect(mockConvexQueryFn).not.toHaveBeenCalled();
    });
  });

  describe('Tenant Isolation', () => {
    it('should filter compliance data by tenantId from session', async () => {
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
        status: 'compliant',
        violations: [],
        score: 100,
        level: 'excellent',
        lastUpdated: Date.now(),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/compliance');
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

    it('should return compliance data with proper structure', async () => {
      const mockData = {
        status: 'compliant',
        violations: [],
        score: 100,
        level: 'excellent',
        lastUpdated: Date.now(),
      };

      mockConvexQueryFn.mockResolvedValue(mockData);

      const request = new NextRequest('http://localhost:3000/api/admin/compliance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('violations');
      expect(data.data).toHaveProperty('score');
      expect(data.data).toHaveProperty('level');
      expect(data.data).toHaveProperty('lastUpdated');
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

      const request = new NextRequest('http://localhost:3000/api/admin/compliance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch compliance data');
    });

    it('should return 500 for unexpected errors', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/admin/compliance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unexpected error');
    });
  });
});


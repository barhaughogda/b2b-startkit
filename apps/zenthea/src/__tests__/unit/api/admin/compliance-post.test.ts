import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
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
        generateComplianceReport: vi.fn(),
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

const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

// Import route after mocks are set up
let POST: typeof import('@/app/api/admin/compliance/route').POST;

describe('POST /api/admin/compliance', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Dynamically import route after mocks
    const routeModule = await import('@/app/api/admin/compliance/route');
    POST = routeModule.POST;
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

      const request = new NextRequest('http://localhost:3000/api/admin/compliance', {
        method: 'POST',
        body: JSON.stringify({ type: 'pdf', dateRange: {} }),
      });
      const response = await POST(request);
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

      const request = new NextRequest('http://localhost:3000/api/admin/compliance', {
        method: 'POST',
        body: JSON.stringify({ type: 'pdf', dateRange: {} }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });
  });

  describe('Report Generation', () => {
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

    it('should generate PDF compliance report', async () => {
      const mockReport = {
        type: 'pdf',
        data: Buffer.from('PDF content'),
        filename: 'compliance-report-2025-01-10.pdf',
        generatedAt: Date.now(),
      };

      mockConvexQueryFn.mockResolvedValue(mockReport);

      const request = new NextRequest('http://localhost:3000/api/admin/compliance', {
        method: 'POST',
        body: JSON.stringify({
          type: 'pdf',
          dateRange: {
            startDate: '2025-01-01',
            endDate: '2025-01-31',
          },
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe('pdf');
    });

    it('should generate CSV compliance report', async () => {
      const mockReport = {
        type: 'csv',
        data: 'violation_id,type,severity,timestamp\nviolation-1,unauthorized_access,high,2025-01-10',
        filename: 'compliance-report-2025-01-10.csv',
        generatedAt: Date.now(),
      };

      mockConvexQueryFn.mockResolvedValue(mockReport);

      const request = new NextRequest('http://localhost:3000/api/admin/compliance', {
        method: 'POST',
        body: JSON.stringify({
          type: 'csv',
          dateRange: {
            startDate: '2025-01-01',
            endDate: '2025-01-31',
          },
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe('csv');
    });

    it('should validate report type', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/compliance', {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid',
          dateRange: {},
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid report type');
    });

    it('should validate date range', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/compliance', {
        method: 'POST',
        body: JSON.stringify({
          type: 'pdf',
          dateRange: {
            startDate: '2025-01-31',
            endDate: '2025-01-01', // End date before start date
          },
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid date range');
    });

    it('should use default date range if not provided', async () => {
      const mockReport = {
        type: 'pdf',
        data: Buffer.from('PDF content'),
        filename: 'compliance-report-2025-01-10.pdf',
        generatedAt: Date.now(),
      };

      mockConvexQueryFn.mockResolvedValue(mockReport);

      const request = new NextRequest('http://localhost:3000/api/admin/compliance', {
        method: 'POST',
        body: JSON.stringify({
          type: 'pdf',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockConvexQueryFn).toHaveBeenCalled();
    });
  });

  describe('Tenant Isolation', () => {
    it('should filter report data by tenantId from session', async () => {
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

      const mockReport = {
        type: 'pdf',
        data: Buffer.from('PDF content'),
        filename: 'compliance-report-2025-01-10.pdf',
        generatedAt: Date.now(),
      };

      mockConvexQueryFn.mockResolvedValue(mockReport);

      const request = new NextRequest('http://localhost:3000/api/admin/compliance', {
        method: 'POST',
        body: JSON.stringify({
          type: 'pdf',
          dateRange: {},
        }),
      });
      await POST(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'tenant-123',
        })
      );
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

      const request = new NextRequest('http://localhost:3000/api/admin/compliance', {
        method: 'POST',
        body: JSON.stringify({
          type: 'pdf',
          dateRange: {},
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to generate compliance report');
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/compliance', {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid request body');
    });
  });
});


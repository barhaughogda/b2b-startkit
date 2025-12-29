import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock Convex
const mockConvexQueryFn = vi.fn();
const mockConvexHttpClient = vi.fn().mockImplementation(() => ({
  query: mockConvexQueryFn,
}));
vi.mock('convex/browser', () => ({
  ConvexHttpClient: mockConvexHttpClient,
}));

// Mock Convex generated API - must be before route import
vi.mock('../../../../../convex/_generated/api', () => ({
  api: {
    admin: {
      reports: {
        generateReport: vi.fn(),
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
let POST: typeof import('@/app/api/admin/reports/route').POST;

describe('POST /api/admin/reports', () => {
  const mockAuthorizedAuth = {
    authorized: true,
    tenantId: 'test-tenant-id',
    session: {
      user: {
        id: 'test-user-id',
        email: 'admin@test.com',
        role: 'admin',
      },
    },
  };

  const mockReportResult = {
    type: 'csv' as const,
    data: 'report_id,type,description,date\n1,user_activity,User login,2025-01-10',
    filename: 'user-activity-report-2025-01-10.csv',
    generatedAt: Date.now(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(mockAuthorizedAuth);
    mockConvexQueryFn.mockClear();
    mockConvexHttpClient.mockImplementation(() => ({
      query: mockConvexQueryFn,
    }));
    
    // Dynamically import route after mocks
    const routeModule = await import('@/app/api/admin/reports/route');
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

      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'user_activity',
          exportFormat: 'csv',
        }),
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

      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'user_activity',
          exportFormat: 'csv',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 if request body is invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
      expect(data.code).toBe('INVALID_REQUEST_BODY');
    });

    it('should return 400 if reportType is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          exportFormat: 'csv',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid report type');
      expect(data.code).toBe('INVALID_REPORT_TYPE');
    });

    it('should return 400 if reportType is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'invalid_type',
          exportFormat: 'csv',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid report type');
      expect(data.code).toBe('INVALID_REPORT_TYPE');
    });

    it('should return 400 if exportFormat is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'user_activity',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid export format');
      expect(data.code).toBe('INVALID_EXPORT_FORMAT');
    });

    it('should return 400 if exportFormat is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'user_activity',
          exportFormat: 'invalid_format',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid export format');
      expect(data.code).toBe('INVALID_EXPORT_FORMAT');
    });

    it('should return 400 if date range is invalid (startDate after endDate)', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'user_activity',
          exportFormat: 'csv',
          dateRange: {
            startDate: '2025-01-31',
            endDate: '2025-01-01',
          },
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid date range');
      expect(data.code).toBe('INVALID_DATE_RANGE');
    });
  });

  describe('Report Generation', () => {
    it('should generate user activity report successfully', async () => {
      mockConvexQueryFn.mockResolvedValue(mockReportResult);

      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'user_activity',
          exportFormat: 'csv',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockReportResult);
      expect(mockConvexQueryFn).toHaveBeenCalled();
    });

    it('should generate compliance report successfully', async () => {
      const complianceReport = {
        ...mockReportResult,
        filename: 'compliance-report-2025-01-10.csv',
      };
      mockConvexQueryFn.mockResolvedValue(complianceReport);

      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'compliance',
          exportFormat: 'csv',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.filename).toContain('compliance-report');
    });

    it('should generate financial report successfully', async () => {
      const financialReport = {
        ...mockReportResult,
        filename: 'financial-report-2025-01-10.csv',
      };
      mockConvexQueryFn.mockResolvedValue(financialReport);

      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'financial',
          exportFormat: 'csv',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.filename).toContain('financial-report');
    });

    it('should generate security report successfully', async () => {
      const securityReport = {
        ...mockReportResult,
        filename: 'security-report-2025-01-10.csv',
      };
      mockConvexQueryFn.mockResolvedValue(securityReport);

      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'security',
          exportFormat: 'csv',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.filename).toContain('security-report');
    });

    it('should generate PDF report successfully', async () => {
      const pdfReport = {
        type: 'pdf' as const,
        data: 'base64encodedpdfdata',
        filename: 'user-activity-report-2025-01-10.pdf',
        generatedAt: Date.now(),
      };
      mockConvexQueryFn.mockResolvedValue(pdfReport);

      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'user_activity',
          exportFormat: 'pdf',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe('pdf');
      expect(data.data.filename).toContain('.pdf');
    });

    it('should include date range in Convex query when provided', async () => {
      mockConvexQueryFn.mockResolvedValue(mockReportResult);

      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'user_activity',
          exportFormat: 'csv',
          dateRange: {
            startDate: '2025-01-01',
            endDate: '2025-01-31',
          },
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          tenantId: 'test-tenant-id',
          reportType: 'user_activity',
          exportFormat: 'csv',
          dateRange: expect.objectContaining({
            startDate: expect.any(Number),
            endDate: expect.any(Number),
          }),
        })
      );
    });

    it('should handle Convex function not deployed error', async () => {
      mockConvexQueryFn.mockRejectedValue(
        new Error('Could not find public function admin/reports:generateReport')
      );

      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'user_activity',
          exportFormat: 'csv',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Convex function not deployed');
      expect(data.message).toContain('admin/reports:generateReport');
    });

    it('should handle Convex query errors', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: 'user_activity',
          exportFormat: 'csv',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to generate report');
    });
  });

  describe('Report Types', () => {
    const reportTypes = ['user_activity', 'compliance', 'financial', 'security'] as const;

    reportTypes.forEach((reportType) => {
      it(`should accept ${reportType} report type`, async () => {
        mockConvexQueryFn.mockResolvedValue(mockReportResult);

        const request = new NextRequest('http://localhost:3000/api/admin/reports', {
          method: 'POST',
          body: JSON.stringify({
            reportType,
            exportFormat: 'csv',
          }),
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockConvexQueryFn).toHaveBeenCalledWith(
          expect.any(Function),
          expect.objectContaining({
            reportType,
          })
        );
      });
    });
  });

  describe('Export Formats', () => {
    const exportFormats = ['pdf', 'csv'] as const;

    exportFormats.forEach((exportFormat) => {
      it(`should accept ${exportFormat.toUpperCase()} export format`, async () => {
        const report = {
          ...mockReportResult,
          type: exportFormat,
          filename: `report-2025-01-10.${exportFormat}`,
        };
        mockConvexQueryFn.mockResolvedValue(report);

        const request = new NextRequest('http://localhost:3000/api/admin/reports', {
          method: 'POST',
          body: JSON.stringify({
            reportType: 'user_activity',
            exportFormat,
          }),
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.type).toBe(exportFormat);
      });
    });
  });
});


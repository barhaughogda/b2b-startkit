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
      security: {
        getSecurityData: vi.fn(),
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
let GET: typeof import('@/app/api/admin/security/route').GET;

describe('GET /api/admin/security', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Dynamically import route after mocks
    const routeModule = await import('@/app/api/admin/security/route');
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

      const request = new NextRequest('http://localhost:3000/api/admin/security');
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

      const request = new NextRequest('http://localhost:3000/api/admin/security');
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
        events: [],
        failedLogins: [],
        activeSessions: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Security Events Retrieval', () => {
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

    it('should return security events from audit logs', async () => {
      const mockSecurityEvents = [
        {
          _id: 'log-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'login_failed',
          resource: 'authentication',
          resourceId: 'auth-1',
          timestamp: Date.now() - 1000,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: { reason: 'Invalid password' },
        },
        {
          _id: 'log-2',
          tenantId: 'tenant-1',
          userId: 'user-2',
          action: 'unauthorized_access',
          resource: 'patient_data',
          resourceId: 'patient-1',
          timestamp: Date.now() - 2000,
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          details: { resource: 'patient_data' },
        },
      ];

      mockConvexQueryFn.mockResolvedValue({
        events: mockSecurityEvents,
        failedLogins: mockSecurityEvents.filter((e) => e.action === 'login_failed'),
        activeSessions: [],
        total: 2,
        page: 1,
        limit: 50,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.events).toHaveLength(2);
      expect(data.data.events[0]).toMatchObject({
        action: 'login_failed',
        resource: 'authentication',
      });
    });

    it('should return failed login attempts', async () => {
      const mockFailedLogins = [
        {
          _id: 'log-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'login_failed',
          resource: 'authentication',
          resourceId: 'auth-1',
          timestamp: Date.now() - 1000,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: { email: 'user@example.com', reason: 'Invalid password' },
        },
        {
          _id: 'log-2',
          tenantId: 'tenant-1',
          userId: undefined,
          action: 'login_failed',
          resource: 'authentication',
          resourceId: 'auth-2',
          timestamp: Date.now() - 2000,
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          details: { email: 'unknown@example.com', reason: 'User not found' },
        },
      ];

      mockConvexQueryFn.mockResolvedValue({
        events: mockFailedLogins,
        failedLogins: mockFailedLogins,
        activeSessions: [],
        total: 2,
        page: 1,
        limit: 50,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.failedLogins).toHaveLength(2);
      expect(data.data.failedLogins[0]).toMatchObject({
        action: 'login_failed',
      });
    });

    it('should return active sessions based on recent login_success events', async () => {
      const now = Date.now();
      const mockActiveSessions = [
        {
          _id: 'log-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'login_success',
          resource: 'authentication',
          resourceId: 'auth-1',
          timestamp: now - 1000 * 60 * 5, // 5 minutes ago
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: { sessionId: 'session-1' },
        },
        {
          _id: 'log-2',
          tenantId: 'tenant-1',
          userId: 'user-2',
          action: 'login_success',
          resource: 'authentication',
          resourceId: 'auth-2',
          timestamp: now - 1000 * 60 * 30, // 30 minutes ago
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          details: { sessionId: 'session-2' },
        },
      ];

      mockConvexQueryFn.mockResolvedValue({
        events: mockActiveSessions,
        failedLogins: [],
        activeSessions: mockActiveSessions,
        total: 2,
        page: 1,
        limit: 50,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.activeSessions).toHaveLength(2);
      expect(data.data.activeSessions[0]).toMatchObject({
        action: 'login_success',
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

    it('should filter security events by start date', async () => {
      const startDate = new Date('2025-01-01').toISOString();
      mockConvexQueryFn.mockResolvedValue({
        events: [],
        failedLogins: [],
        activeSessions: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/admin/security?startDate=${startDate}`
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

    it('should filter security events by end date', async () => {
      const endDate = new Date('2025-01-31').toISOString();
      mockConvexQueryFn.mockResolvedValue({
        events: [],
        failedLogins: [],
        activeSessions: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/admin/security?endDate=${endDate}`
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

    it('should filter security events by both start and end date', async () => {
      const startDate = new Date('2025-01-01').toISOString();
      const endDate = new Date('2025-01-31').toISOString();
      mockConvexQueryFn.mockResolvedValue({
        events: [],
        failedLogins: [],
        activeSessions: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/admin/security?startDate=${startDate}&endDate=${endDate}`
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
        `http://localhost:3000/api/admin/security?startDate=${startDate}&endDate=${endDate}`
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

  describe('Pagination', () => {
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

    it('should support pagination with page and limit query params', async () => {
      mockConvexQueryFn.mockResolvedValue({
        events: [],
        failedLogins: [],
        activeSessions: [],
        total: 50,
        page: 2,
        limit: 20,
        hasMore: true,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/security?page=2&limit=20'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.page).toBe(2);
      expect(data.data.limit).toBe(20);
      expect(data.data.total).toBe(50);
      expect(data.data.hasMore).toBe(true);
    });

    it('should use default pagination values if not provided', async () => {
      mockConvexQueryFn.mockResolvedValue({
        events: [],
        failedLogins: [],
        activeSessions: [],
        total: 10,
        page: 1,
        limit: 50,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.page).toBe(1);
      expect(data.data.limit).toBe(50);
    });
  });

  describe('Tenant Isolation', () => {
    it('should filter security events by tenantId from session', async () => {
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
        events: [],
        failedLogins: [],
        activeSessions: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/security');
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

    it('should return security data with proper structure', async () => {
      const mockData = {
        events: [
          {
            _id: 'log-1',
            tenantId: 'tenant-1',
            userId: 'user-1',
            action: 'login_failed',
            resource: 'authentication',
            resourceId: 'auth-1',
            timestamp: Date.now(),
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            details: {},
          },
        ],
        failedLogins: [],
        activeSessions: [],
        total: 1,
        page: 1,
        limit: 50,
        hasMore: false,
      };

      mockConvexQueryFn.mockResolvedValue(mockData);

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('events');
      expect(data.data).toHaveProperty('failedLogins');
      expect(data.data).toHaveProperty('activeSessions');
      expect(data.data).toHaveProperty('total');
      expect(data.data).toHaveProperty('page');
      expect(data.data).toHaveProperty('limit');
      expect(data.data).toHaveProperty('hasMore');
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

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch security data');
    });

    it('should return 500 for unexpected errors', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unexpected error');
    });
  });
});


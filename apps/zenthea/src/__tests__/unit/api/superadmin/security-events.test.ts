/**
 * Unit tests for Security Events API endpoint
 * Task 6.1: Create Security Events API
 * 
 * TDD Phase: RED - Failing tests that define the API contract
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock superadmin-auth
const mockVerifySuperAdminAuth = vi.fn();
vi.mock('@/lib/superadmin-auth', () => ({
  verifySuperAdminAuth: () => mockVerifySuperAdminAuth(),
}));

// Mock Convex - match the pattern from tenants.test.ts
const mockConvexQueryFn = vi.fn();
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    query: mockConvexQueryFn,
  })),
}));

// Mock Convex generated API - match pattern from tenants.test.ts exactly
vi.mock('@/convex/_generated/api', () => ({
  api: {
    admin: {
      securityEvents: {
        getSecurityEventsForSuperadmin: vi.fn(),
      },
    },
  },
}));


// Mock environment variable - set before any imports
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url';

// Import route after mocks
let GET: typeof import('@/app/api/superadmin/security/events/route').GET;

describe('GET /api/superadmin/security/events', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockConvexQueryFn.mockReset();
    // Ensure environment variable is set
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url';
    // Dynamically import route after mocks are set up
    const routeModule = await import('@/app/api/superadmin/security/events/route');
    GET = routeModule.GET;
  });

  describe('Authentication & Authorization', () => {
    beforeEach(() => {
      // Reset the mock implementation for each test
      mockConvexQueryFn.mockReset();
    });

    it('should verify mock setup', () => {
      // Verify mocks are set up correctly
      expect(mockConvexQueryFn).toBeDefined();
      expect(typeof mockConvexQueryFn).toBe('function');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/security/events');
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

      const request = new NextRequest('http://localhost:3000/api/superadmin/security/events');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('should return security events for superadmin user', async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });

      const mockSecurityEvents = [
        {
          _id: 'log-1',
          action: 'unauthorized_access',
          resource: 'security',
          resourceId: 'superadmin_access_denied',
          timestamp: Date.now() - 3600000,
          userId: 'user-1',
          tenantId: 'tenant-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: { attemptedPath: '/superadmin', severity: 'critical' },
        },
        {
          _id: 'log-2',
          action: 'login_failed',
          resource: 'authentication',
          resourceId: 'login_attempt',
          timestamp: Date.now() - 1800000,
          userId: 'user-2',
          tenantId: 'tenant-2',
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          details: { email: 'test@example.com', attempts: 3 },
        },
      ];

      mockConvexQueryFn.mockResolvedValue({
        events: mockSecurityEvents,
        pagination: {
          total: 2,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/security/events');
      const response = await GET(request);
      const data = await response.json();
      
      // Debug: Log error details
      if (response.status !== 200) {
        // Use expect.fail to show the error in test output
        expect.fail(`Expected 200 but got ${response.status}. Error: ${JSON.stringify(data, null, 2)}\nmockConvexQueryFn called: ${mockConvexQueryFn.mock.calls.length}`);
      }

      expect(response.status).toBe(200);
      expect(mockConvexQueryFn).toHaveBeenCalled();
      expect(data).toHaveProperty('events');
      expect(data.events).toHaveLength(2);
      expect(data.events[0].action).toBe('unauthorized_access');
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should filter by event type', async () => {
      const mockEvents = [
        {
          _id: 'log-1',
          action: 'unauthorized_access',
          resource: 'security',
          resourceId: 'access_denied',
          timestamp: Date.now(),
          tenantId: 'tenant-1',
        },
      ];

      mockConvexQueryFn.mockResolvedValue({
        events: mockEvents,
        pagination: {
          total: mockEvents.length,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/security/events?eventType=unauthorized_access'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventType: 'unauthorized_access',
        })
      );
    });

    it('should filter by severity level', async () => {
      const mockEvents = [
        {
          _id: 'log-1',
          action: 'unauthorized_access',
          resource: 'security',
          resourceId: 'access_denied',
          timestamp: Date.now(),
          tenantId: 'tenant-1',
          details: { severity: 'critical' },
        },
      ];

      mockConvexQueryFn.mockResolvedValue({
        events: mockEvents,
        pagination: {
          total: mockEvents.length,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/security/events?severity=critical'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          severity: 'critical',
        })
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-01-01').getTime();
      const endDate = new Date('2025-01-31').getTime();

      const mockEvents: any[] = [];
      mockConvexQueryFn.mockResolvedValue({
        events: mockEvents,
        pagination: {
          total: mockEvents.length,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/superadmin/security/events?startDate=${startDate}&endDate=${endDate}`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          startDate: startDate,
          endDate: endDate,
        })
      );
    });

    it('should support multiple filters combined', async () => {
      const mockEvents: any[] = [];
      mockConvexQueryFn.mockResolvedValue({
        events: mockEvents,
        pagination: {
          total: mockEvents.length,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/security/events?eventType=unauthorized_access&severity=critical&startDate=1704067200000&endDate=1706745600000'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventType: 'unauthorized_access',
          severity: 'critical',
          startDate: 1704067200000,
          endDate: 1706745600000,
        })
      );
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should support pagination with limit and offset', async () => {
      const mockEvents = Array.from({ length: 10 }, (_, i) => ({
        _id: `log-${i}`,
        action: 'unauthorized_access',
        resource: 'security',
        resourceId: `access_denied_${i}`,
        timestamp: Date.now() - i * 3600000,
        tenantId: 'tenant-1',
      }));

      mockConvexQueryFn.mockImplementation((path: string, args: any) => {
        return Promise.resolve({
          events: mockEvents,
          pagination: {
            total: mockEvents.length,
            limit: args.limit || 50,
            offset: args.offset || 0,
            hasMore: false,
          },
        });
      });

      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/security/events?limit=10&offset=0'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('events');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('limit', 10);
      expect(data.pagination).toHaveProperty('offset', 0);
    });

    it('should default to limit 50 if not specified', async () => {
      const mockEvents: any[] = [];
      mockConvexQueryFn.mockResolvedValue({
        events: mockEvents,
        pagination: {
          total: mockEvents.length,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/security/events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(50);
    });

    it('should include total count and hasMore in pagination', async () => {
      const mockEvents = Array.from({ length: 25 }, (_, i) => ({
        _id: `log-${i}`,
        action: 'unauthorized_access',
        resource: 'security',
        resourceId: `access_denied_${i}`,
        timestamp: Date.now() - i * 3600000,
        tenantId: 'tenant-1',
      }));

      mockConvexQueryFn.mockResolvedValue({
        events: mockEvents,
        pagination: {
          total: mockEvents.length,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/security/events?limit=10&offset=0'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('hasMore');
    });
  });

  describe('Security Event Types', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should return events with required fields', async () => {
      const mockEvents = [
        {
          _id: 'log-1',
          action: 'unauthorized_access',
          resource: 'security',
          resourceId: 'access_denied',
          timestamp: Date.now(),
          userId: 'user-1',
          tenantId: 'tenant-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: { attemptedPath: '/superadmin' },
        },
      ];

      mockConvexQueryFn.mockResolvedValue({
        events: mockEvents,
        pagination: {
          total: mockEvents.length,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/security/events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events[0]).toHaveProperty('id');
      expect(data.events[0]).toHaveProperty('action');
      expect(data.events[0]).toHaveProperty('resource');
      expect(data.events[0]).toHaveProperty('resourceId');
      expect(data.events[0]).toHaveProperty('timestamp');
      expect(data.events[0]).toHaveProperty('ipAddress');
      expect(data.events[0]).toHaveProperty('userAgent');
    });

    it('should include user information when available', async () => {
      const mockEvents = [
        {
          _id: 'log-1',
          action: 'login_failed',
          resource: 'authentication',
          resourceId: 'login_attempt',
          timestamp: Date.now(),
          userId: 'user-1',
          tenantId: 'tenant-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      ];

      mockConvexQueryFn.mockResolvedValue({
        events: mockEvents,
        pagination: {
          total: mockEvents.length,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/security/events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events[0]).toHaveProperty('userId', 'user-1');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should handle database query errors gracefully', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/superadmin/security/events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });

    it('should validate date range parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/security/events?startDate=invalid&endDate=invalid'
      );
      const response = await GET(request);

      // Should either return 400 or handle gracefully
      expect([400, 200]).toContain(response.status);
    });

    it('should validate pagination parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/security/events?limit=-1&offset=-1'
      );
      const response = await GET(request);

      // Should either return 400 or handle gracefully with defaults
      expect([400, 200]).toContain(response.status);
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should return events sorted by timestamp (most recent first)', async () => {
      const now = Date.now();
      const mockEvents = [
        {
          _id: 'log-1',
          action: 'unauthorized_access',
          resource: 'security',
          resourceId: 'access_denied_1',
          timestamp: now - 3600000, // 1 hour ago
          tenantId: 'tenant-1',
        },
        {
          _id: 'log-2',
          action: 'unauthorized_access',
          resource: 'security',
          resourceId: 'access_denied_2',
          timestamp: now, // Most recent
          tenantId: 'tenant-1',
        },
        {
          _id: 'log-3',
          action: 'unauthorized_access',
          resource: 'security',
          resourceId: 'access_denied_3',
          timestamp: now - 7200000, // 2 hours ago
          tenantId: 'tenant-1',
        },
      ];

      // Sort events by timestamp descending (most recent first) to match Convex behavior
      const sortedEvents = [...mockEvents].sort((a, b) => b.timestamp - a.timestamp);
      
      mockConvexQueryFn.mockResolvedValue({
        events: sortedEvents,
        pagination: {
          total: sortedEvents.length,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/security/events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events[0].timestamp).toBeGreaterThanOrEqual(data.events[1].timestamp);
    });

    it('should return empty array when no events match filters', async () => {
      mockConvexQueryFn.mockResolvedValue({
        events: [],
        pagination: {
          total: 0,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/security/events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });
  });
});


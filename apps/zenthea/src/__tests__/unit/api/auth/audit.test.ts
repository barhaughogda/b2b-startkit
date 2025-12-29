/**
 * Tests for Authentication Audit Logging API
 * 
 * Tests HIPAA-compliant audit logging for authentication events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/audit/route';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/convex-client', () => ({
  initializeConvex: vi.fn(),
}));

vi.mock('@/lib/utils/request-helpers', () => ({
  extractClientIP: vi.fn((request, providedIp) => {
    if (providedIp) return providedIp;
    return request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      'unknown';
  }),
  extractUserAgent: vi.fn((request, providedUserAgent) => {
    if (providedUserAgent) return providedUserAgent;
    return request.headers.get('user-agent') || 'unknown';
  }),
}));

import { getServerSession } from 'next-auth';
import { initializeConvex } from '@/lib/convex-client';
import { extractClientIP, extractUserAgent } from '@/lib/utils/request-helpers';

describe('POST /api/auth/audit', () => {
  let mockConvex: any;
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConvex = {
      mutation: vi.fn().mockResolvedValue({}),
    };

    mockApi = {
      auditLogs: {
        create: vi.fn(),
      },
    };

    vi.mocked(initializeConvex).mockResolvedValue({
      convex: mockConvex,
      api: mockApi,
    });
  });

  const createMockRequest = (
    body: any,
    headers: Record<string, string> = {}
  ): NextRequest => {
    const request = new NextRequest('http://localhost/api/auth/audit', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    // Mock request.ip - only set if explicitly provided in headers
    // This allows tests to verify 'unknown' fallback behavior
    if (headers['x-real-ip']) {
      (request as any).ip = headers['x-real-ip'];
    } else {
      // Don't set default IP to allow testing 'unknown' fallback
      (request as any).ip = undefined;
    }

    return request;
  };

  describe('Input Validation', () => {
    it('should reject requests without action field', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject requests without email field', async () => {
      const request = createMockRequest({
        action: 'login_success',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject invalid action types', async () => {
      const request = createMockRequest({
        action: 'invalid_action',
        email: 'test@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid action');
    });

    it('should accept valid login_success action', async () => {
      const request = createMockRequest({
        action: 'login_success',
        email: 'test@example.com',
        userId: 'validUserId123456789',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept valid login_failed action', async () => {
      const request = createMockRequest({
        action: 'login_failed',
        email: 'test@example.com',
        errorMessage: 'Invalid credentials',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('IP Address Extraction', () => {
    it('should use provided IP address when available', async () => {
      const providedIp = '192.168.1.100';
      const request = createMockRequest(
        {
          action: 'login_success',
          email: 'test@example.com',
          ipAddress: providedIp,
        },
        {
          'cf-connecting-ip': '1.2.3.4',
          'x-forwarded-for': '5.6.7.8',
        }
      );

      await POST(request);

      expect(mockConvex.mutation).toHaveBeenCalled();
      const callArgs = mockConvex.mutation.mock.calls[0][1];
      expect(callArgs.ipAddress).toBe(providedIp);
    });

    it('should extract IP from cf-connecting-ip header', async () => {
      const request = createMockRequest(
        {
          action: 'login_success',
          email: 'test@example.com',
        },
        {
          'cf-connecting-ip': '192.168.1.1',
        }
      );

      await POST(request);

      expect(mockConvex.mutation).toHaveBeenCalled();
      const callArgs = mockConvex.mutation.mock.calls[0][1];
      expect(callArgs.ipAddress).toBe('192.168.1.1');
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const request = createMockRequest(
        {
          action: 'login_success',
          email: 'test@example.com',
        },
        {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        }
      );

      await POST(request);

      expect(mockConvex.mutation).toHaveBeenCalled();
      const callArgs = mockConvex.mutation.mock.calls[0][1];
      expect(callArgs.ipAddress).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', async () => {
      const request = createMockRequest(
        {
          action: 'login_success',
          email: 'test@example.com',
        },
        {
          'x-real-ip': '203.0.113.1',
        }
      );

      await POST(request);

      expect(mockConvex.mutation).toHaveBeenCalled();
      const callArgs = mockConvex.mutation.mock.calls[0][1];
      expect(callArgs.ipAddress).toBe('203.0.113.1');
    });

    it('should default to unknown when no IP headers present', async () => {
      const request = createMockRequest({
        action: 'login_success',
        email: 'test@example.com',
      });

      await POST(request);

      expect(mockConvex.mutation).toHaveBeenCalled();
      const callArgs = mockConvex.mutation.mock.calls[0][1];
      expect(callArgs.ipAddress).toBe('unknown');
    });
  });

  describe('User Agent Extraction', () => {
    it('should use provided user agent when available', async () => {
      const providedUserAgent = 'Custom User Agent';
      const request = createMockRequest(
        {
          action: 'login_success',
          email: 'test@example.com',
          userAgent: providedUserAgent,
        },
        {
          'user-agent': 'Browser User Agent',
        }
      );

      await POST(request);

      expect(mockConvex.mutation).toHaveBeenCalled();
      const callArgs = mockConvex.mutation.mock.calls[0][1];
      expect(callArgs.userAgent).toBe(providedUserAgent);
    });

    it('should extract user agent from headers', async () => {
      const request = createMockRequest(
        {
          action: 'login_success',
          email: 'test@example.com',
        },
        {
          'user-agent': 'Mozilla/5.0',
        }
      );

      await POST(request);

      expect(mockConvex.mutation).toHaveBeenCalled();
      const callArgs = mockConvex.mutation.mock.calls[0][1];
      expect(callArgs.userAgent).toBe('Mozilla/5.0');
    });

    it('should default to unknown when no user agent header', async () => {
      const request = createMockRequest({
        action: 'login_success',
        email: 'test@example.com',
      });

      await POST(request);

      expect(mockConvex.mutation).toHaveBeenCalled();
      const callArgs = mockConvex.mutation.mock.calls[0][1];
      expect(callArgs.userAgent).toBe('unknown');
    });
  });

  describe('Convex ID Validation', () => {
    it('should accept valid Convex user IDs', async () => {
      const validUserId = 'validUserId123456789';
      const request = createMockRequest({
        action: 'login_success',
        email: 'test@example.com',
        userId: validUserId,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockConvex.mutation).toHaveBeenCalled();
    });

    it('should handle invalid Convex user IDs gracefully', async () => {
      const invalidUserId = 'short';
      const request = createMockRequest({
        action: 'login_success',
        email: 'test@example.com',
        userId: invalidUserId,
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still succeed but userId will be undefined
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockConvex.mutation).toHaveBeenCalled();
      const callArgs = mockConvex.mutation.mock.calls[0][1];
      expect(callArgs.userId).toBeUndefined();
    });
  });

  describe('Session Handling', () => {
    it('should use session userId for login_success when not provided', async () => {
      const sessionUserId = 'sessionUserId123456789';
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: sessionUserId,
          tenantId: 'tenant123',
        },
      } as any);

      const request = createMockRequest({
        action: 'login_success',
        email: 'test@example.com',
      });

      await POST(request);

      expect(mockConvex.mutation).toHaveBeenCalled();
      const callArgs = mockConvex.mutation.mock.calls[0][1];
      expect(callArgs.userId).toBe(sessionUserId);
    });

    it('should use provided userId over session userId', async () => {
      const providedUserId = 'providedUserId123456789';
      const sessionUserId = 'sessionUserId123456789';
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: sessionUserId,
          tenantId: 'tenant123',
        },
      } as any);

      const request = createMockRequest({
        action: 'login_success',
        email: 'test@example.com',
        userId: providedUserId,
      });

      await POST(request);

      expect(mockConvex.mutation).toHaveBeenCalled();
      const callArgs = mockConvex.mutation.mock.calls[0][1];
      expect(callArgs.userId).toBe(providedUserId);
    });
  });

  describe('Error Handling', () => {
    it('should handle Convex initialization failure gracefully', async () => {
      vi.mocked(initializeConvex).mockResolvedValue({
        convex: null,
        api: null,
      });

      const request = createMockRequest({
        action: 'login_success',
        email: 'test@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Audit logging service unavailable');
    });

    it('should handle audit logging failures gracefully', async () => {
      mockConvex.mutation.mockRejectedValue(new Error('Convex error'));

      const request = createMockRequest({
        action: 'login_success',
        email: 'test@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      // Should return 202 Accepted for non-critical audit failures
      expect(response.status).toBe(202);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to create audit log entry');
    });

    it('should include error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockConvex.mutation.mockRejectedValue(new Error('Test error'));

      const request = createMockRequest({
        action: 'login_success',
        email: 'test@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.details).toBe('Test error');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include error details in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockConvex.mutation.mockRejectedValue(new Error('Test error'));

      const request = createMockRequest({
        action: 'login_success',
        email: 'test@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Audit Log Entry Creation', () => {
    it('should create audit log with correct structure for login_success', async () => {
      const request = createMockRequest({
        action: 'login_success',
        email: 'test@example.com',
        userId: 'validUserId123456789',
        tenantId: 'tenant123',
        details: { customField: 'value' },
      });

      await POST(request);

      expect(mockConvex.mutation).toHaveBeenCalledWith(
        mockApi.auditLogs.create,
        expect.objectContaining({
          tenantId: 'tenant123',
          userId: 'validUserId123456789',
          action: 'login_success',
          resource: 'authentication',
          resourceId: 'validUserId123456789',
          details: expect.objectContaining({
            email: 'test@example.com',
            customField: 'value',
            timestamp: expect.any(Number),
            source: 'clinic_login_page',
          }),
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
          timestamp: expect.any(Number),
        })
      );
    });

    it('should create audit log with correct structure for login_failed', async () => {
      const request = createMockRequest({
        action: 'login_failed',
        email: 'test@example.com',
        errorMessage: 'Invalid credentials',
      });

      await POST(request);

      expect(mockConvex.mutation).toHaveBeenCalledWith(
        mockApi.auditLogs.create,
        expect.objectContaining({
          action: 'login_failed',
          resource: 'authentication',
          resourceId: 'test@example.com',
          details: expect.objectContaining({
            email: 'test@example.com',
            errorMessage: 'Invalid credentials',
          }),
        })
      );
    });
  });
});


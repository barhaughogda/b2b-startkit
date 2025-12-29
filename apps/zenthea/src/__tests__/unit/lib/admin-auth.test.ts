import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { verifyAdminAuth } from '@/lib/admin-auth';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

describe('verifyAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset NODE_ENV to test
    process.env.NODE_ENV = 'test';
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const result = await verifyAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(401);
      const data = await result.response.json();
      expect(data.error).toBe('Authentication required');
      expect(data.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should return 401 if session exists but user is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const result = await verifyAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(401);
      const data = await result.response.json();
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Authorization', () => {
    it('should return 403 if user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'provider@example.com',
          role: 'provider',
          tenantId: 'tenant-1',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const result = await verifyAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(403);
      const data = await result.response.json();
      expect(data.error).toBe('Forbidden - Admin access required');
      expect(data.code).toBe('ADMIN_ACCESS_REQUIRED');
    });

    it('should return 403 for patient role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'patient@example.com',
          role: 'patient',
          tenantId: 'tenant-1',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const result = await verifyAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(403);
    });

    it('should return 403 for demo role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'demo@example.com',
          role: 'demo',
          tenantId: 'tenant-1',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const result = await verifyAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(403);
    });
  });

  describe('Successful Authorization', () => {
    it('should authorize admin user with tenantId', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: 'tenant-123',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const result = await verifyAdminAuth(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.tenantId).toBe('tenant-123');
        expect(result.session.user.role).toBe('admin');
      }
    });

    it('should authorize admin user and return session', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: 'tenant-1',
        },
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const result = await verifyAdminAuth(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.session).toEqual(mockSession);
        expect(result.tenantId).toBe('tenant-1');
      }
    });
  });

  describe('Tenant ID Handling', () => {
    it('should return 500 in production if tenantId is missing', async () => {
      process.env.NODE_ENV = 'production';
      
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: undefined,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const result = await verifyAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(500);
      const data = await result.response.json();
      expect(data.error).toBe('Configuration error');
      expect(data.message).toBe('Tenant ID required');
      expect(data.code).toBe('MISSING_TENANT_ID');
    });

    it('should fallback to demo-tenant in development if tenantId is missing', async () => {
      process.env.NODE_ENV = 'development';
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: undefined,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const result = await verifyAdminAuth(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.tenantId).toBe('demo-tenant');
      }
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Admin user missing tenantId'),
        expect.objectContaining({
          userId: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
        })
      );

      consoleWarnSpy.mockRestore();
    });

    it('should use tenantId from session when available', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: 'custom-tenant-id',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const result = await verifyAdminAuth(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.tenantId).toBe('custom-tenant-id');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle session errors gracefully', async () => {
      const sessionError = new Error('Session error');
      mockGetServerSession.mockRejectedValue(sessionError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const result = await verifyAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(500);
      const data = await result.response.json();
      expect(data.error).toBe('Authentication error');
      expect(data.message).toBe('Session error');
      expect(data.code).toBe('AUTHENTICATION_ERROR');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ verifyAdminAuth: Error getting session:'),
        sessionError
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle unknown errors', async () => {
      mockGetServerSession.mockRejectedValue('Unknown error');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const result = await verifyAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(500);
      const data = await result.response.json();
      expect(data.error).toBe('Authentication error');
      expect(data.message).toBe('Unknown error');

      consoleErrorSpy.mockRestore();
    });
  });
});


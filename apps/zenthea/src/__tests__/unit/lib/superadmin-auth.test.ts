import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getZentheaServerSession } from '@/lib/auth';
import { verifySuperAdminAuth } from '@/lib/superadmin-auth';

// Mock hook
vi.mock('@/lib/auth', () => ({
  getZentheaServerSession: vi.fn(),
}));

const mockGetZentheaServerSession = getZentheaServerSession as ReturnType<typeof vi.fn>;

describe('verifySuperAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetZentheaServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const result = await verifySuperAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(401);
      const data = await result.response.json();
      expect(data.error).toBe('Authentication required');
      expect(data.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should return 401 if session exists but user is missing', async () => {
      mockGetZentheaServerSession.mockResolvedValue({
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const result = await verifySuperAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(401);
      const data = await result.response.json();
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Authorization', () => {
    it('should return 403 if user is not superadmin', async () => {
      mockGetZentheaServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: 'tenant-1',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const result = await verifySuperAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(403);
      const data = await result.response.json();
      expect(data.error).toBe('Forbidden - Superadmin access required');
      expect(data.code).toBe('SUPERADMIN_ACCESS_REQUIRED');
    });

    it('should return 403 for provider role', async () => {
      mockGetZentheaServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'provider@example.com',
          role: 'provider',
          tenantId: 'tenant-1',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const result = await verifySuperAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(403);
    });

    it('should return 403 for patient role', async () => {
      mockGetZentheaServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'patient@example.com',
          role: 'patient',
          tenantId: 'tenant-1',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const result = await verifySuperAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(403);
    });
  });

  describe('Successful Authorization', () => {
    it('should authorize superadmin user', async () => {
      const mockSession = {
        user: {
          id: 'superadmin-1',
          email: 'superadmin@zenthea.com',
          role: 'super_admin',
        },
      };

      mockGetZentheaServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const result = await verifySuperAdminAuth(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.session).toEqual(mockSession);
        expect(result.session.user.role).toBe('super_admin');
      }
    });

    it('should authorize superadmin user and return session', async () => {
      const mockSession = {
        user: {
          id: 'superadmin-1',
          email: 'superadmin@zenthea.com',
          role: 'super_admin',
        },
      };

      mockGetZentheaServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const result = await verifySuperAdminAuth(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.session.user.id).toBe('superadmin-1');
        expect(result.session.user.email).toBe('superadmin@zenthea.com');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle session errors gracefully', async () => {
      const sessionError = new Error('Session error');
      mockGetZentheaServerSession.mockRejectedValue(sessionError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const result = await verifySuperAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(500);
      const data = await result.response.json();
      expect(data.error).toBe('Authentication error');
      expect(data.message).toBe('Session error');
      expect(data.code).toBe('AUTHENTICATION_ERROR');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ verifySuperAdminAuth: Error getting session:'),
        sessionError
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle unknown errors', async () => {
      mockGetZentheaServerSession.mockRejectedValue('Unknown error');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const result = await verifySuperAdminAuth(request);

      expect(result.authorized).toBe(false);
      expect(result.response.status).toBe(500);
      const data = await result.response.json();
      expect(data.error).toBe('Authentication error');
      expect(data.message).toBe('Unknown error');

      consoleErrorSpy.mockRestore();
    });
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock superadmin-auth
const mockVerifySuperAdminAuth = vi.fn();
vi.mock('@/lib/superadmin-auth', () => ({
  verifySuperAdminAuth: () => mockVerifySuperAdminAuth(),
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
      tenants: {
        listTenantsForSuperadmin: vi.fn(),
      },
    },
  },
}));

// Mock environment variable
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url';

// Import route after mocks
let GET: typeof import('@/app/api/superadmin/tenants/route').GET;

describe('GET /api/superadmin/tenants', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import('@/app/api/superadmin/tenants/route');
    GET = routeModule.GET;
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
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

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('should return tenant list for superadmin user', async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });

      const mockTenants = {
        tenants: [
          { _id: 'tenant-1', name: 'Clinic A', status: 'active' },
          { _id: 'tenant-2', name: 'Clinic B', status: 'active' },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockConvexQueryFn.mockResolvedValue(mockTenants);

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockTenants);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should support pagination with page and limit query params', async () => {
      mockConvexQueryFn.mockResolvedValue({
        tenants: [],
        total: 50,
        page: 2,
        limit: 20,
        totalPages: 3,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/tenants?page=2&limit=20'
      );
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          page: 2,
          limit: 20,
        })
      );
    });

    it('should use default pagination values if not provided', async () => {
      mockConvexQueryFn.mockResolvedValue({
        tenants: [],
        total: 10,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          page: 1,
          limit: 20,
        })
      );
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should filter tenants by status', async () => {
      mockConvexQueryFn.mockResolvedValue({
        tenants: [{ _id: 'tenant-1', status: 'active' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/tenants?status=active'
      );
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('should filter tenants by plan', async () => {
      mockConvexQueryFn.mockResolvedValue({
        tenants: [{ _id: 'tenant-1', subscription: { plan: 'premium' } }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/tenants?plan=premium'
      );
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          plan: 'premium',
        })
      );
    });

    it('should filter tenants by type', async () => {
      mockConvexQueryFn.mockResolvedValue({
        tenants: [{ _id: 'tenant-1', type: 'clinic' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/tenants?type=clinic'
      );
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'clinic',
        })
      );
    });

    it('should search tenants by name', async () => {
      mockConvexQueryFn.mockResolvedValue({
        tenants: [{ _id: 'tenant-1', name: 'Test Clinic' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/tenants?search=test'
      );
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          search: 'test',
        })
      );
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should sort tenants by name ascending', async () => {
      mockConvexQueryFn.mockResolvedValue({
        tenants: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/tenants?sortBy=name&sortOrder=asc'
      );
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          sortBy: 'name',
          sortOrder: 'asc',
        })
      );
    });

    it('should sort tenants by createdAt descending', async () => {
      mockConvexQueryFn.mockResolvedValue({
        tenants: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/superadmin/tenants?sortBy=createdAt&sortOrder=desc'
      );
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
      );
    });
  });

  describe('Convex Function Deployment Errors', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should handle Convex function not deployed error', async () => {
      const error = new Error('Could not find public function for admin/tenants:listTenantsForSuperadmin');
      mockConvexQueryFn.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Convex function not deployed');
      expect(data.code).toBe('CONVEX_FUNCTION_NOT_DEPLOYED');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should handle Convex query errors gracefully', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Convex query failed'));

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch tenants');
      expect(data.code).toBe('FETCH_TENANTS_ERROR');
    });
  });
});


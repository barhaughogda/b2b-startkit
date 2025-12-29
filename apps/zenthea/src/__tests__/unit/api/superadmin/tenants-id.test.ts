import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock superadmin-auth
const mockVerifySuperAdminAuth = vi.fn();
vi.mock('@/lib/superadmin-auth', () => ({
  verifySuperAdminAuth: () => mockVerifySuperAdminAuth(),
}));

// Mock Convex
const mockConvexQueryFn = vi.fn();
const mockConvexMutationFn = vi.fn();
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    query: mockConvexQueryFn,
    mutation: mockConvexMutationFn,
  })),
}));

// Mock Convex generated API
vi.mock('../../../../../../convex/_generated/api', () => ({
  api: {
    admin: {
      tenants: {
        getTenantDetailsForSuperadmin: vi.fn(),
        updateTenantForSuperadmin: vi.fn(),
      },
    },
  },
}));

// Mock environment variable
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url';

// Import routes after mocks
let GET: typeof import('@/app/api/superadmin/tenants/[id]/route').GET;
let PUT: typeof import('@/app/api/superadmin/tenants/[id]/route').PUT;

describe('GET /api/superadmin/tenants/[id]', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import('@/app/api/superadmin/tenants/[id]/route');
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

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1');
      const response = await GET(request, { params: { id: 'tenant-1' } });
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

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1');
      const response = await GET(request, { params: { id: 'tenant-1' } });

      expect(response.status).toBe(403);
    });

    it('should return tenant details for superadmin user', async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });

      const mockTenant = {
        _id: 'tenant-1',
        name: 'Test Clinic',
        status: 'active',
        type: 'clinic',
        branding: { primaryColor: '#FF0000' },
        features: { messaging: true },
        subscription: { plan: 'premium', maxUsers: 100 },
        contactInfo: { email: 'contact@test.com' },
      };

      mockConvexQueryFn.mockResolvedValue(mockTenant);

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1');
      const response = await GET(request, { params: { id: 'tenant-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockTenant);
      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        { tenantId: 'tenant-1' }
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
      const error = new Error('Could not find public function for admin/tenants:getTenantDetailsForSuperadmin');
      mockConvexQueryFn.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1');
      const response = await GET(request, { params: { id: 'tenant-1' } });
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

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1');
      const response = await GET(request, { params: { id: 'tenant-1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch tenant details');
      expect(data.code).toBe('FETCH_TENANT_DETAILS_ERROR');
    });
  });
});

describe('PUT /api/superadmin/tenants/[id]', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import('@/app/api/superadmin/tenants/[id]/route');
    PUT = routeModule.PUT;
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

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request, { params: { id: 'tenant-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not superadmin', async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Forbidden - Superadmin access required' }),
          { status: 403 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request, { params: { id: 'tenant-1' } });

      expect(response.status).toBe(403);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should validate tenant name', async () => {
      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1', {
        method: 'PUT',
        body: JSON.stringify({ name: '' }),
      });
      const response = await PUT(request, { params: { id: 'tenant-1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Tenant name is required');
    });

    it('should validate subscription max users range', async () => {
      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1', {
        method: 'PUT',
        body: JSON.stringify({
          subscription: { maxUsers: 15000 }, // Too high
        }),
      });
      const response = await PUT(request, { params: { id: 'tenant-1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Max users must be between 1 and 10,000');
    });

    it('should validate subscription max patients range', async () => {
      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1', {
        method: 'PUT',
        body: JSON.stringify({
          subscription: { maxPatients: 200000 }, // Too high
        }),
      });
      const response = await PUT(request, { params: { id: 'tenant-1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Max patients must be between 1 and 100,000');
    });

    it('should validate contact email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1', {
        method: 'PUT',
        body: JSON.stringify({
          contactInfo: { email: 'invalid-email' },
        }),
      });
      const response = await PUT(request, { params: { id: 'tenant-1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Invalid contact email format');
    });

    it('should validate color formats', async () => {
      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1', {
        method: 'PUT',
        body: JSON.stringify({
          branding: { primaryColor: 'not-a-color' },
        }),
      });
      const response = await PUT(request, { params: { id: 'tenant-1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Primary color must be a valid hex color');
    });
  });

  describe('Successful Updates', () => {
    beforeEach(() => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'superadmin-1', role: 'super_admin' } },
      });
    });

    it('should update tenant successfully', async () => {
      const updates = {
        name: 'Updated Clinic Name',
        subscription: { maxUsers: 200 },
      };

      mockConvexMutationFn.mockResolvedValue({
        _id: 'tenant-1',
        ...updates,
      });

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const response = await PUT(request, { params: { id: 'tenant-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockConvexMutationFn).toHaveBeenCalledWith(
        expect.anything(),
        {
          tenantId: 'tenant-1',
          updates,
        }
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
      const error = new Error('Could not find public function for admin/tenants:updateTenantForSuperadmin');
      mockConvexMutationFn.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request, { params: { id: 'tenant-1' } });
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

    it('should handle Convex mutation errors gracefully', async () => {
      mockConvexMutationFn.mockRejectedValue(new Error('Convex mutation failed'));

      const request = new NextRequest('http://localhost:3000/api/superadmin/tenants/tenant-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request, { params: { id: 'tenant-1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update tenant');
      expect(data.code).toBe('UPDATE_TENANT_ERROR');
    });
  });
});


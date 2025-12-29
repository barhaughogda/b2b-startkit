import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock admin-auth
const mockVerifyAdminAuth = vi.fn();
vi.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: () => mockVerifyAdminAuth(),
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
vi.mock('../../../../../convex/_generated/api', () => ({
  api: {
    tenants: {
      getTenantData: vi.fn(),
      updateTenantBranding: vi.fn(),
      updateTenantFeatures: vi.fn(),
      updateTenantContactInfo: vi.fn(),
    },
  },
}));

// Mock environment variable
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url';

// Import routes after mocks
let GET: typeof import('@/app/api/admin/tenant-settings/route').GET;
let PUT: typeof import('@/app/api/admin/tenant-settings/route').PUT;

describe('GET /api/admin/tenant-settings', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import('@/app/api/admin/tenant-settings/route');
    GET = routeModule.GET;
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 if user is not admin', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Forbidden - Admin access required' }),
          { status: 403 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('should return tenant settings for admin user', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });

      const mockTenant = {
        _id: 'tenant-1',
        name: 'Test Clinic',
        branding: { primaryColor: '#FF0000' },
        features: { messaging: true },
        contactInfo: { email: 'contact@test.com' },
      };

      mockConvexQueryFn.mockResolvedValue(mockTenant);

      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockTenant);
    });

    it('should return 404 if tenant not found', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });

      mockConvexQueryFn.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Tenant not found');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });
    });

    it('should handle Convex query errors gracefully', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Convex query failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch tenant settings');
    });
  });
});

describe('PUT /api/admin/tenant-settings', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import('@/app/api/admin/tenant-settings/route');
    PUT = routeModule.PUT;
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: false,
        response: new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401 }
        ),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Subscription Management Restriction', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });
    });

    it('should reject subscription updates', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings', {
        method: 'PUT',
        body: JSON.stringify({
          subscription: { plan: 'premium' },
        }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Forbidden');
      expect(data.message).toContain('Subscription management is not available');
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });
    });

    it('should validate tenant name', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings', {
        method: 'PUT',
        body: JSON.stringify({ name: '' }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Tenant name is required');
    });

    it('should validate contact email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings', {
        method: 'PUT',
        body: JSON.stringify({
          contactInfo: { email: 'invalid-email' },
        }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Invalid contact email format');
    });

    it('should validate color formats', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings', {
        method: 'PUT',
        body: JSON.stringify({
          branding: { primaryColor: 'not-a-color' },
        }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Primary color must be a valid hex color');
    });

    it('should validate custom domain format', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings', {
        method: 'PUT',
        body: JSON.stringify({
          branding: { customDomain: 'invalid domain' },
        }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('Custom domain must be a valid domain name');
    });
  });

  describe('Successful Updates', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });
    });

    it('should update branding successfully', async () => {
      const branding = { primaryColor: '#FF0000', secondaryColor: '#00FF00' };
      mockConvexMutationFn.mockResolvedValue(branding);

      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings', {
        method: 'PUT',
        body: JSON.stringify({ branding }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.branding).toEqual(branding);
    });

    it('should update features successfully', async () => {
      const features = { messaging: true, appointments: false };
      mockConvexMutationFn.mockResolvedValue(features);

      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings', {
        method: 'PUT',
        body: JSON.stringify({ features }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.features).toEqual(features);
    });

    it('should update contact info successfully', async () => {
      const contactInfo = {
        email: 'new@example.com',
        phone: '123-456-7890',
        address: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
        },
      };
      mockConvexMutationFn.mockResolvedValue(contactInfo);

      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings', {
        method: 'PUT',
        body: JSON.stringify({ contactInfo }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.contactInfo).toEqual(contactInfo);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockVerifyAdminAuth.mockResolvedValue({
        authorized: true,
        session: { user: { id: 'admin-1', role: 'admin' } },
        tenantId: 'tenant-1',
      });
    });

    it('should handle Convex mutation errors gracefully', async () => {
      mockConvexMutationFn.mockRejectedValue(new Error('Convex mutation failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/tenant-settings', {
        method: 'PUT',
        body: JSON.stringify({ branding: { primaryColor: '#FF0000' } }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update tenant settings');
    });
  });
});


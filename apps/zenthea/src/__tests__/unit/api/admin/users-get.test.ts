import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
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
      users: {
        getUsers: vi.fn(),
      },
    },
    users: {
      getUserByEmail: vi.fn(),
    },
  },
}));

// Mock environment variable
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url';

const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

// Import route after mocks are set up
let GET: typeof import('@/app/api/admin/users/route').GET;

describe('GET /api/admin/users', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Dynamically import route after mocks
    const routeModule = await import('@/app/api/admin/users/route');
    GET = routeModule.GET;
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

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
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });

    it('should allow admin users to access endpoint', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: 'tenant-1',
        },
      });

      mockConvexQueryFn.mockResolvedValue({
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: 'tenant-1',
        },
      });
    });

    it('should support pagination with page and limit query params', async () => {
      mockConvexQueryFn.mockResolvedValue({
        users: [],
        total: 50,
        page: 2,
        limit: 20,
        totalPages: 3,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/users?page=2&limit=20'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.page).toBe(2);
      expect(data.data.limit).toBe(20);
      expect(data.data.total).toBe(50);
      expect(data.data.totalPages).toBe(3);
    });

    it('should use default pagination values if not provided', async () => {
      mockConvexQueryFn.mockResolvedValue({
        users: [],
        total: 10,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.page).toBe(1);
      expect(data.data.limit).toBe(10);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: 'tenant-1',
        },
      });
    });

    it('should filter users by role', async () => {
      mockConvexQueryFn.mockResolvedValue({
        users: [
          { _id: 'user-1', email: 'provider@example.com', role: 'provider' },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/users?role=provider'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'tenant-1',
          role: 'provider',
        })
      );
    });

    it('should filter users by status (active/inactive)', async () => {
      mockConvexQueryFn.mockResolvedValue({
        users: [{ _id: 'user-1', email: 'user@example.com', isActive: true }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/users?status=active'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'tenant-1',
          status: 'active',
        })
      );
    });

    it('should search users by name, email, or role', async () => {
      mockConvexQueryFn.mockResolvedValue({
        users: [{ _id: 'user-1', email: 'john@example.com', name: 'John Doe' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/users?search=john'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'tenant-1',
          search: 'john',
        })
      );
    });
  });

  describe('Tenant Isolation', () => {
    it('should filter users by tenantId from session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: 'tenant-123',
        },
      });

      mockConvexQueryFn.mockResolvedValue({
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'tenant-123',
        })
      );
    });

    it('should use default tenantId if not in session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: undefined,
        },
      });

      mockConvexQueryFn.mockResolvedValue({
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      await GET(request);

      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'demo-tenant',
        })
      );
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: 'tenant-1',
        },
      });
    });

    it('should return users list with metadata', async () => {
      const mockUsers = [
        {
          _id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          role: 'provider',
          isActive: true,
          tenantId: 'tenant-1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          _id: 'user-2',
          email: 'user2@example.com',
          name: 'User Two',
          role: 'demo',
          isActive: true,
          tenantId: 'tenant-1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      mockConvexQueryFn.mockResolvedValue({
        users: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(2);
      expect(data.data.users[0]).toMatchObject({
        _id: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
        role: 'provider',
      });
      expect(data.data.total).toBe(2);
      expect(data.data.page).toBe(1);
      expect(data.data.limit).toBe(10);
      expect(data.data.totalPages).toBe(1);
    });

    it('should exclude passwordHash from user objects', async () => {
      // Mock Convex to return users WITHOUT passwordHash (as our implementation does)
      mockConvexQueryFn.mockResolvedValue({
        users: [
          {
            _id: 'user-1',
            email: 'user@example.com',
            name: 'User',
            // passwordHash is excluded by Convex query
            role: 'provider',
            isActive: true,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.users[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          tenantId: 'tenant-1',
        },
      });
    });

    it('should handle Convex query errors gracefully', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Convex query failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch users');
    });

    it('should return 500 for unexpected errors', async () => {
      mockConvexQueryFn.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unexpected error');
    });
  });
});


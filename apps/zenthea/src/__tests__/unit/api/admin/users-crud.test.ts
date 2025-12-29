import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock Convex
const mockConvexMutationFn = vi.fn();
const mockConvexActionFn = vi.fn();
const mockConvexQueryFn = vi.fn();
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    mutation: mockConvexMutationFn,
    action: mockConvexActionFn,
    query: mockConvexQueryFn,
  })),
}));

// Mock Convex generated API
// Note: Both route files import using different relative paths, but vitest.config.ts
// has aliases that map both paths to the same mock file. We only need to mock
// the path that resolves correctly from this test file location (5 levels up).
const mockApi = {
  admin: {
    users: {
      createUserMutation: vi.fn(),
      updateUserMutation: vi.fn(),
      deleteUserMutation: vi.fn(),
      getUserById: vi.fn(),
    },
  },
  users: {
    getUserByEmail: vi.fn(),
  },
};

// Mock the path that resolves from this test file (5 levels up to root)
// The vitest.config.ts alias will handle the 6-level path used by [id]/route.ts
vi.mock('../../../../../convex/_generated/api', () => ({
  api: mockApi,
}));

// Mock Convex generated dataModel
// Note: The vitest.config.ts alias handles the 6-level path used by [id]/route.ts
const mockId = vi.fn((x) => x);

// Mock the path that resolves from this test file (5 levels up to root)
vi.mock('../../../../../convex/_generated/dataModel', () => ({
  Id: mockId,
}));

// Mock bcryptjs - must be hoisted before route imports
vi.mock('bcryptjs', () => ({
  hash: vi.fn((password: string) => Promise.resolve(`hashed-${password}`)),
  compare: vi.fn((password: string, hash: string) => Promise.resolve(hash === `hashed-${password}`)),
  default: {
    hash: vi.fn((password: string) => Promise.resolve(`hashed-${password}`)),
    compare: vi.fn((password: string, hash: string) => Promise.resolve(hash === `hashed-${password}`)),
  },
}));

// Mock environment variable
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url';

const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

// Import routes after mocks are set up
let POST: typeof import('@/app/api/admin/users/route').POST;
let PUT: typeof import('@/app/api/admin/users/[id]/route').PUT;
let DELETE: typeof import('@/app/api/admin/users/[id]/route').DELETE;

describe('POST /api/admin/users', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Dynamically import routes after mocks
    const usersRoute = await import('@/app/api/admin/users/route');
    POST = usersRoute.POST;
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          name: 'New User',
          role: 'provider',
          password: 'SecurePass123!',
        }),
      });

      const response = await POST(request);
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

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          name: 'New User',
          role: 'provider',
          password: 'SecurePass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });
  });

  describe('User Creation', () => {
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

    it('should create a new user with valid data', async () => {
      // Mock: user doesn't exist yet
      mockConvexQueryFn.mockResolvedValue(null);
      // Mock: user creation succeeds
      mockConvexMutationFn.mockResolvedValue('new-user-id');
      // Note: bcrypt.hash is mocked in setup.ts and will return 'hashed-{password}'

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          name: 'New User',
          role: 'provider',
          password: 'SecurePass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe('new-user-id');
      // Verify duplicate check query
      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: 'newuser@example.com',
          tenantId: 'tenant-1',
        })
      );
      // Verify user creation mutation
      expect(mockConvexMutationFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: 'newuser@example.com',
          name: 'New User',
          role: 'provider',
          tenantId: 'tenant-1',
        })
      );
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New User',
          // Missing email, role, password
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.toLowerCase()).toContain('validation');
    });

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          name: 'New User',
          role: 'provider',
          password: 'SecurePass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message?.toLowerCase() || data.error.toLowerCase()).toContain('email');
    });

    it('should validate password strength', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          name: 'New User',
          role: 'provider',
          password: 'weak', // Too weak
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message?.toLowerCase() || data.error.toLowerCase()).toContain('password');
    });

    it('should handle duplicate email errors', async () => {
      // Mock: user already exists
      mockConvexQueryFn.mockResolvedValue({
        _id: 'existing-user-id',
        email: 'existing@example.com',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          name: 'New User',
          role: 'provider',
          password: 'SecurePass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
      // Verify duplicate check was called
      expect(mockConvexQueryFn).toHaveBeenCalled();
      // Verify user creation was NOT called
      expect(mockConvexMutationFn).not.toHaveBeenCalled();
    });
  });
});

describe('PUT /api/admin/users/[id]', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Dynamically import route after mocks
    const userRoute = await import('@/app/api/admin/users/[id]/route');
    PUT = userRoute.PUT;
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      });

      const response = await PUT(request, { params: { id: 'user-1' } });
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

      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      });

      const response = await PUT(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });
  });

  describe('User Update', () => {
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

    it('should update user name', async () => {
      // Mock: user exists
      mockConvexQueryFn.mockResolvedValue({ _id: 'user-1', name: 'Old Name', tenantId: 'tenant-1' });
      // Mock: update succeeds
      mockConvexMutationFn.mockResolvedValue({ _id: 'user-1' });

      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      });

      const response = await PUT(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Verify user existence check
      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'user-1' })
      );
      // Verify update mutation
      expect(mockConvexMutationFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'user-1',
          name: 'Updated Name',
        })
      );
    });

    it('should update user role', async () => {
      mockConvexQueryFn.mockResolvedValue({ _id: 'user-1', role: 'demo', tenantId: 'tenant-1' });
      mockConvexMutationFn.mockResolvedValue({ _id: 'user-1' });

      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
        method: 'PUT',
        body: JSON.stringify({
          role: 'provider',
        }),
      });

      const response = await PUT(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockConvexMutationFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'user-1',
          role: 'provider',
        })
      );
    });

    it('should update user status (active/inactive)', async () => {
      mockConvexQueryFn.mockResolvedValue({ _id: 'user-1', isActive: true, tenantId: 'tenant-1' });
      mockConvexMutationFn.mockResolvedValue({ _id: 'user-1' });

      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
        method: 'PUT',
        body: JSON.stringify({
          isActive: false,
        }),
      });

      const response = await PUT(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockConvexMutationFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'user-1',
          isActive: false,
        })
      );
    });

    it('should validate email format if email is being updated', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
        method: 'PUT',
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      });

      const response = await PUT(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message?.toLowerCase() || data.error.toLowerCase()).toContain('email');
    });

    it('should return 404 if user not found', async () => {
      mockConvexQueryFn.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/users/non-existent', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      });

      const response = await PUT(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
      expect(mockConvexMutationFn).not.toHaveBeenCalled();
    });
  });
});

describe('DELETE /api/admin/users/[id]', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Dynamically import route after mocks
    const userRoute = await import('@/app/api/admin/users/[id]/route');
    DELETE = userRoute.DELETE;
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'user-1' } });
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

      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });
  });

  describe('User Deletion', () => {
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

    it('should soft delete user (set isActive = false)', async () => {
      // Mock: user exists
      mockConvexQueryFn.mockResolvedValue({ _id: 'user-1', isActive: true, tenantId: 'tenant-1' });
      // Mock: soft delete succeeds
      mockConvexMutationFn.mockResolvedValue({ _id: 'user-1', isActive: false });

      const request = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockConvexQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'user-1' })
      );
      expect(mockConvexMutationFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'user-1',
        })
      );
    });

    it('should return 404 if user not found', async () => {
      mockConvexQueryFn.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/users/non-existent', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
      expect(mockConvexMutationFn).not.toHaveBeenCalled();
    });
  });
});


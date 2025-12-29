/**
 * Tests for Public Profile API Routes
 * 
 * Tests CRUD operations for public provider profiles
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/company/users/[id]/public-profile/route';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    mutation: vi.fn(),
  })),
}));

import { getServerSession } from 'next-auth';
import { ConvexHttpClient } from 'convex/browser';

describe('Public Profile API Routes', () => {
  let mockConvex: any;
  let mockQuery: any;
  let mockMutation: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockQuery = vi.fn();
    mockMutation = vi.fn();

    mockConvex = {
      query: mockQuery,
      mutation: mockMutation,
    };

    // Mock ConvexHttpClient constructor
    vi.mocked(ConvexHttpClient).mockImplementation(() => mockConvex as any);
  });

  const createMockRequest = (
    method: string,
    body?: any,
    params: { id: string } = { id: 'validUserId123456789' }
  ): NextRequest => {
    const request = new NextRequest(`http://localhost/api/company/users/${params.id}/public-profile`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return request;
  };

  const mockSession = {
    user: {
      id: 'validUserId123456789',
      tenantId: 'tenant123',
      email: 'test@example.com',
    },
  };

  describe('GET /api/company/users/[id]/public-profile', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = createMockRequest('GET');
      const response = await GET(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when tenant ID is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'validUserId123456789',
        },
      } as any);

      const request = createMockRequest('GET');
      const response = await GET(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Tenant ID not found in session');
    });

    it('should return 400 for invalid user ID format', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const request = createMockRequest('GET', undefined, { id: 'short' });
      const response = await GET(request, { params: { id: 'short' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid user ID format');
    });

    it('should successfully fetch public profile', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const mockProfile = {
        publicProfile: {
          _id: 'profile123',
          userId: 'validUserId123456789',
          displayName: 'Dr. Test',
        },
      };

      mockQuery.mockResolvedValue(mockProfile);

      const request = createMockRequest('GET');
      const response = await GET(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockProfile);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userId: 'validUserId123456789',
          tenantId: 'tenant123',
        })
      );
    });

    it('should handle query errors gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      mockQuery.mockRejectedValue(new Error('Query failed'));

      const request = createMockRequest('GET');
      const response = await GET(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch public profile');
    });
  });

  describe('POST /api/company/users/[id]/public-profile', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = createMockRequest('POST', { acceptingNewPatients: true });
      const response = await POST(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid request body', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const request = createMockRequest('POST', {
        displayName: 'a'.repeat(101), // Too long
      });
      const response = await POST(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });

    it('should successfully create public profile', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const requestBody = {
        acceptingNewPatients: true,
        bookingEnabled: false,
      };

      const mockResult = {
        _id: 'newProfile123',
        ...requestBody,
      };

      mockMutation.mockResolvedValue(mockResult);

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
      expect(mockMutation).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userId: 'validUserId123456789',
          tenantId: 'tenant123',
          acceptingNewPatients: true,
          bookingEnabled: false,
        })
      );
    });

    it('should handle profile already exists error', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      mockMutation.mockRejectedValue(new Error('Public profile already exists'));

      const request = createMockRequest('POST', { acceptingNewPatients: true });
      const response = await POST(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Profile exists');
    });

    it('should handle no profile error', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      mockMutation.mockRejectedValue(new Error('User does not have a profile'));

      const request = createMockRequest('POST', { acceptingNewPatients: true });
      const response = await POST(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No profile');
    });
  });

  describe('PUT /api/company/users/[id]/public-profile', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = createMockRequest('PUT', { displayName: 'Dr. Updated' });
      const response = await PUT(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid request body', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const request = createMockRequest('PUT', {
        bio: 'a'.repeat(2001), // Too long
      });
      const response = await PUT(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 404 when profile does not exist', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      mockQuery.mockResolvedValue({ publicProfile: null });

      const request = createMockRequest('PUT', { displayName: 'Dr. Updated' });
      const response = await PUT(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Profile not found');
    });

    it('should successfully update public profile', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const existingProfile = {
        publicProfile: {
          _id: 'profile123',
          userId: 'validUserId123456789',
        },
      };

      mockQuery.mockResolvedValue(existingProfile);

      const updateData = {
        displayName: 'Dr. Updated',
        bio: 'Updated bio',
        acceptingNewPatients: false,
      };

      const mockResult = {
        ...existingProfile.publicProfile,
        ...updateData,
      };

      mockMutation.mockResolvedValue(mockResult);

      const request = createMockRequest('PUT', updateData);
      const response = await PUT(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
      expect(mockMutation).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          profileId: 'profile123',
          displayName: 'Dr. Updated',
          bio: 'Updated bio',
          acceptingNewPatients: false,
        })
      );
    });

    it('should trim string fields when updating', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const existingProfile = {
        publicProfile: {
          _id: 'profile123',
          userId: 'validUserId123456789',
        },
      };

      mockQuery.mockResolvedValue(existingProfile);
      mockMutation.mockResolvedValue({});

      const request = createMockRequest('PUT', {
        displayName: '  Dr. Test  ',
        title: '  Title  ',
        bio: '  Bio  ',
      });
      const response = await PUT(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockMutation).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          displayName: 'Dr. Test',
          title: 'Title',
          bio: 'Bio',
        })
      );
    });
  });

  describe('DELETE /api/company/users/[id]/public-profile', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = createMockRequest('DELETE');
      const response = await DELETE(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid user ID format', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const request = createMockRequest('DELETE', undefined, { id: 'short' });
      const response = await DELETE(request, { params: { id: 'short' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid user ID format');
    });

    it('should return 404 when profile does not exist', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      mockQuery.mockResolvedValue({ publicProfile: null });

      const request = createMockRequest('DELETE');
      const response = await DELETE(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Profile not found');
    });

    it('should successfully delete public profile', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const existingProfile = {
        publicProfile: {
          _id: 'profile123',
          userId: 'validUserId123456789',
        },
      };

      mockQuery.mockResolvedValue(existingProfile);
      mockMutation.mockResolvedValue({ success: true });

      const request = createMockRequest('DELETE');
      const response = await DELETE(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockMutation).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          profileId: 'profile123',
        })
      );
    });
  });

  describe('Validation Edge Cases', () => {
    it('should validate photo URL format', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const existingProfile = {
        publicProfile: {
          _id: 'profile123',
          userId: 'validUserId123456789',
        },
      };

      mockQuery.mockResolvedValue(existingProfile);

      const request = createMockRequest('PUT', {
        photo: 'not-a-valid-url',
      });
      const response = await PUT(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });

    it('should accept empty string for photo (clearing photo)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const existingProfile = {
        publicProfile: {
          _id: 'profile123',
          userId: 'validUserId123456789',
        },
      };

      mockQuery.mockResolvedValue(existingProfile);
      mockMutation.mockResolvedValue({});

      const request = createMockRequest('PUT', {
        photo: '',
      });
      const response = await PUT(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockMutation).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          photo: undefined, // Empty string should become undefined
        })
      );
    });

    it('should validate array fields', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const existingProfile = {
        publicProfile: {
          _id: 'profile123',
          userId: 'validUserId123456789',
        },
      };

      mockQuery.mockResolvedValue(existingProfile);

      const request = createMockRequest('PUT', {
        specialties: ['', 'valid'], // Empty string in array
      });
      const response = await PUT(request, { params: { id: 'validUserId123456789' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });
  });
});


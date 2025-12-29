import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProviderAvatar } from '@/hooks/useProviderAvatar';
import { Id } from '@/convex/_generated/dataModel';
import type { ProviderProfile } from '@/types';

// Mock Convex mutations
const mockUpdateProfile = vi.fn();
vi.mock('convex/react', () => ({
  useMutation: vi.fn(() => mockUpdateProfile),
}));

// Mock API
vi.mock('@/convex/_generated/api', () => ({
  api: {
    providerProfiles: {
      updateProviderProfile: 'updateProviderProfile',
    },
  },
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useProviderAvatar', () => {
  const mockSession = {
    user: {
      id: 'test-user-id' as Id<'users'>,
      tenantId: 'test-tenant-id',
    },
  };

  const mockProfile: Partial<ProviderProfile> & { _id: Id<'providerProfiles'> } = {
    _id: 'profile-123' as Id<'providerProfiles'>,
    userId: 'test-user-id' as Id<'users'>,
    tenantId: 'test-tenant-id',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue({});
  });

  describe('Avatar Update', () => {
    it('should update avatar successfully', async () => {
      const { result } = renderHook(() =>
        useProviderAvatar({
          session: mockSession,
          existingProfile: mockProfile,
        })
      );

      await result.current.handleAvatarChange('https://example.com/new-avatar.jpg');

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          profileId: mockProfile._id,
          userId: mockSession.user.id,
          tenantId: mockSession.user.tenantId,
          updates: { professionalPhotoUrl: 'https://example.com/new-avatar.jpg' },
        });
      });
    });

    it('should handle error when profile not found', async () => {
      const { result } = renderHook(() =>
        useProviderAvatar({
          session: mockSession,
          existingProfile: null,
        })
      );

      await result.current.handleAvatarChange('https://example.com/new-avatar.jpg');

      // Should not call updateProfile when profile doesn't exist
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('should handle update errors gracefully', async () => {
      const error = new Error('Network error');
      mockUpdateProfile.mockRejectedValueOnce(error);

      const { result } = renderHook(() =>
        useProviderAvatar({
          session: mockSession,
          existingProfile: mockProfile,
        })
      );

      await result.current.handleAvatarChange('https://example.com/new-avatar.jpg');

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should track updating state during avatar change', async () => {
      let resolveUpdate: () => void;
      const updatePromise = new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      });
      mockUpdateProfile.mockReturnValueOnce(updatePromise);

      const { result } = renderHook(() =>
        useProviderAvatar({
          session: mockSession,
          existingProfile: mockProfile,
        })
      );

      expect(result.current.isUpdatingAvatar).toBe(false);

      const changePromise = result.current.handleAvatarChange('https://example.com/new-avatar.jpg');

      // Should be updating during the operation
      await waitFor(() => {
        expect(result.current.isUpdatingAvatar).toBe(true);
      });

      resolveUpdate!();
      await changePromise;

      // Should be done updating after operation completes
      await waitFor(() => {
        expect(result.current.isUpdatingAvatar).toBe(false);
      });
    });
  });

  describe('Session Validation', () => {
    it('should handle missing session gracefully', async () => {
      const { result } = renderHook(() =>
        useProviderAvatar({
          session: null,
          existingProfile: mockProfile,
        })
      );

      await result.current.handleAvatarChange('https://example.com/new-avatar.jpg');

      // Should not call updateProfile when session is missing
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
  });
});


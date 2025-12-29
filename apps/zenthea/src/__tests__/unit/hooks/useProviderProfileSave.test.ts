import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProviderProfileSave } from '@/hooks/useProviderProfileSave';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';
import { Id } from '@/convex/_generated/dataModel';

// Mock Convex mutations
const mockUpdateProfile = vi.fn();
const mockCreateProfile = vi.fn();

vi.mock('convex/react', () => ({
  useMutation: vi.fn((mutationFn: any) => {
    if (mutationFn === 'updateProviderProfile') {
      return mockUpdateProfile;
    }
    if (mutationFn === 'createProviderProfile') {
      return mockCreateProfile;
    }
    return vi.fn();
  }),
}));

// Mock API
vi.mock('@/convex/_generated/api', () => ({
  api: {
    providerProfiles: {
      updateProviderProfile: 'updateProviderProfile',
      createProviderProfile: 'createProviderProfile',
    },
  },
}));

// Mock toast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

// Mock getDefaultVisibilitySettings
vi.mock('@/lib/profileVisibility', () => ({
  getDefaultVisibilitySettings: vi.fn(() => ({
    bio: 'public',
    detailedBio: 'portal',
    philosophyOfCare: 'public',
    professionalPhoto: 'public',
    introductionVideo: 'public',
    testimonials: 'public',
  })),
}));

describe('useProviderProfileSave', () => {
  const mockSession = {
    user: {
      id: 'test-user-id' as Id<'users'>,
      tenantId: 'test-tenant-id',
    },
  };

  const mockExistingProfile = {
    _id: 'profile-123' as Id<'providerProfiles'>,
    userId: 'test-user-id' as Id<'users'>,
    tenantId: 'test-tenant-id',
  };

  const mockFormData: ProviderProfileUpdateData = {
    specialties: ['Cardiology'],
    languages: ['English'],
    bio: 'Test bio',
    visibility: {
      bio: 'public',
      detailedBio: 'portal',
      philosophyOfCare: 'public',
      professionalPhoto: 'public',
      introductionVideo: 'public',
      testimonials: 'public',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue({});
    mockCreateProfile.mockResolvedValue({});
  });

  describe('Hook Initialization', () => {
    it('should initialize with session and existing profile', () => {
      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: mockSession as any,
          existingProfile: mockExistingProfile as any,
        })
      );

      expect(result.current.saveProfile).toBeDefined();
      expect(result.current.isSaving).toBe(false);
    });

    it('should initialize without existing profile', () => {
      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: mockSession as any,
          existingProfile: null,
        })
      );

      expect(result.current.saveProfile).toBeDefined();
      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('Save Profile - Update Existing', () => {
    it('should call updateProfile when profile exists', async () => {
      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: mockSession as any,
          existingProfile: mockExistingProfile as any,
        })
      );

      await result.current.saveProfile(mockFormData);

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        profileId: mockExistingProfile._id,
        userId: mockSession.user.id,
        tenantId: mockSession.user.tenantId,
        updates: mockFormData,
      });
    });

    it('should show success toast after successful update', async () => {
      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: mockSession as any,
          existingProfile: mockExistingProfile as any,
        })
      );

      await result.current.saveProfile(mockFormData);

      expect(mockToastSuccess).toHaveBeenCalledWith('Profile saved successfully!');
    });

    it('should call onSave callback after successful update', async () => {
      const mockOnSave = vi.fn();
      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: mockSession as any,
          existingProfile: mockExistingProfile as any,
          onSave: mockOnSave,
        })
      );

      await result.current.saveProfile(mockFormData);

      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  describe('Save Profile - Create New', () => {
    it('should call createProfile when profile does not exist', async () => {
      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: mockSession as any,
          existingProfile: null,
        })
      );

      await result.current.saveProfile(mockFormData);

      expect(mockCreateProfile).toHaveBeenCalledWith({
        userId: mockSession.user.id,
        tenantId: mockSession.user.tenantId,
        specialties: mockFormData.specialties || [],
        languages: mockFormData.languages || [],
        visibility: mockFormData.visibility,
      });
    });

    it('should show success toast after successful create', async () => {
      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: mockSession as any,
          existingProfile: null,
        })
      );

      await result.current.saveProfile(mockFormData);

      expect(mockToastSuccess).toHaveBeenCalledWith('Profile saved successfully!');
    });
  });

  describe('Error Handling', () => {
    it('should handle update errors gracefully', async () => {
      const errorMessage = 'Failed to update profile';
      mockUpdateProfile.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: mockSession as any,
          existingProfile: mockExistingProfile as any,
        })
      );

      await result.current.saveProfile(mockFormData);

      expect(mockToastError).toHaveBeenCalledWith(errorMessage);
    });

    it('should handle create errors gracefully', async () => {
      const errorMessage = 'Failed to create profile';
      mockCreateProfile.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: mockSession as any,
          existingProfile: null,
        })
      );

      await result.current.saveProfile(mockFormData);

      expect(mockToastError).toHaveBeenCalledWith(errorMessage);
    });

    it('should handle non-Error exceptions', async () => {
      mockUpdateProfile.mockRejectedValue('String error');

      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: mockSession as any,
          existingProfile: mockExistingProfile as any,
        })
      );

      await result.current.saveProfile(mockFormData);

      expect(mockToastError).toHaveBeenCalledWith('Failed to save profile');
    });
  });

  describe('Loading State', () => {
    it('should set isSaving to true during save', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockUpdateProfile.mockReturnValue(promise);

      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: mockSession as any,
          existingProfile: mockExistingProfile as any,
        })
      );

      const savePromise = result.current.saveProfile(mockFormData);

      await waitFor(() => {
        expect(result.current.isSaving).toBe(true);
      });

      resolvePromise!();
      await savePromise;

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false);
      });
    });
  });

  describe('Session Validation', () => {
    it('should handle missing session gracefully', async () => {
      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: null as any,
          existingProfile: mockExistingProfile as any,
        })
      );

      await result.current.saveProfile(mockFormData);

      expect(mockToastError).toHaveBeenCalledWith('You must be logged in to save your profile');
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('should handle missing user ID gracefully', async () => {
      const { result } = renderHook(() =>
        useProviderProfileSave({
          session: { user: {} } as any,
          existingProfile: mockExistingProfile as any,
        })
      );

      await result.current.saveProfile(mockFormData);

      expect(mockToastError).toHaveBeenCalledWith('You must be logged in to save your profile');
    });
  });
});


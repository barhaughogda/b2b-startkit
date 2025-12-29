/**
 * Custom hook for handling provider avatar uploads
 * 
 * Manages avatar update logic, loading states, and error handling
 */

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import type { ProviderProfile } from '@/types';
import { getDefaultVisibilitySettings } from '@/lib/profileVisibility';

interface UseProviderAvatarOptions {
  session: {
    user: {
      id: string;
      tenantId: string;
    };
  } | null;
  existingProfile: Partial<ProviderProfile> & { _id?: Id<'providerProfiles'> } | null;
}

interface UseProviderAvatarReturn {
  handleAvatarChange: (avatarUrl: string) => Promise<void>;
  isUpdatingAvatar: boolean;
}

/**
 * Hook for managing provider avatar uploads
 * 
 * @param options - Configuration options including session and existing profile
 * @returns Object with avatar change handler and loading state
 * 
 * @example
 * ```tsx
 * const { handleAvatarChange, isUpdatingAvatar } = useProviderAvatar({
 *   session: { user: { id: userId, tenantId } },
 *   existingProfile: profile,
 * });
 * 
 * <PatientAvatarUpload
 *   onAvatarChange={handleAvatarChange}
 *   disabled={isUpdatingAvatar}
 * />
 * ```
 */
export function useProviderAvatar(
  options: UseProviderAvatarOptions
): UseProviderAvatarReturn {
  const { session, existingProfile } = options;
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  const updateProfile = useMutation(api.providerProfiles.updateProviderProfile);
  const createProfile = useMutation(api.providerProfiles.createProviderProfile);

  const handleAvatarChange = async (avatarUrl: string) => {
    if (!session?.user?.id || !session?.user?.tenantId) {
      toast.error('You must be logged in to update your avatar.');
      return;
    }

    setIsUpdatingAvatar(true);
    try {
      // If profile exists, update it
      if (existingProfile?._id) {
        await updateProfile({
          profileId: existingProfile._id as Id<'providerProfiles'>,
          userId: session.user.id as Id<'users'>,
          tenantId: session.user.tenantId,
          updates: { professionalPhotoUrl: avatarUrl },
        });
      } else {
        // If no profile exists, create one with minimal required data and the avatar
        // This allows admin/owner users to upload avatars even without a full profile
        // Note: createProviderProfile requires at least one specialty, so we use a placeholder
        const profileId = await createProfile({
          userId: session.user.id as Id<'users'>,
          tenantId: session.user.tenantId,
          specialties: ['General Practice'], // Required field - placeholder specialty
          languages: [],
          visibility: getDefaultVisibilitySettings(),
        });
        
        // Immediately update the profile with the avatar URL
        await updateProfile({
          profileId: profileId,
          userId: session.user.id as Id<'users'>,
          tenantId: session.user.tenantId,
          updates: { professionalPhotoUrl: avatarUrl },
        });
      }
      toast.success('Profile photo updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile photo. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  return {
    handleAvatarChange,
    isUpdatingAvatar,
  };
}


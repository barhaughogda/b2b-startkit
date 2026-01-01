/**
 * Custom hook for handling provider avatar uploads
 * 
 * Manages avatar update logic, loading states, and error handling
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { useProviderProfile } from './useProviderProfile';
import type { ProviderProfile } from '@/types';

interface UseProviderAvatarOptions {
  session: {
    user: {
      id: string;
      tenantId: string;
    };
  } | null;
  existingProfile?: Partial<ProviderProfile> | null;
}

interface UseProviderAvatarReturn {
  handleAvatarChange: (avatarUrl: string) => Promise<void>;
  isUpdatingAvatar: boolean;
}

/**
 * Hook for managing provider avatar uploads
 */
export function useProviderAvatar(
  options: UseProviderAvatarOptions
): UseProviderAvatarReturn {
  const { session } = options;
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const { updateProfile } = useProviderProfile();

  const handleAvatarChange = async (avatarUrl: string) => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to update your avatar.');
      return;
    }

    setIsUpdatingAvatar(true);
    try {
      await updateProfile({ professionalPhotoUrl: avatarUrl });
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

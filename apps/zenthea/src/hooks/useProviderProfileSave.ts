/**
 * Custom hook for saving provider profile
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { useProviderProfile } from './useProviderProfile';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';
import type { ProviderProfile } from '@/types';
import { logger } from '@/lib/logger';

interface UseProviderProfileSaveOptions {
  session: {
    user: {
      id: string;
      tenantId: string;
    };
  } | null;
  existingProfile?: Partial<ProviderProfile> | null;
  onSave?: () => void;
}

interface UseProviderProfileSaveReturn {
  saveProfile: (data: ProviderProfileUpdateData) => Promise<void>;
  isSaving: boolean;
}

export function useProviderProfileSave(
  options: UseProviderProfileSaveOptions
): UseProviderProfileSaveReturn {
  const { session, onSave } = options;
  const [isSaving, setIsSaving] = useState(false);
  const { updateProfile } = useProviderProfile();

  const saveProfile = async (data: ProviderProfileUpdateData) => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to save your profile');
      return;
    }

    setIsSaving(true);

    try {
      await updateProfile(data as any);
      toast.success('Profile saved successfully!');
      onSave?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile';
      toast.error(errorMessage);
      logger.error('Profile save error:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveProfile,
    isSaving,
  };
}

/**
 * Custom hook for managing provider profile form state
 * 
 * Provides form management, field updates, and visibility settings
 * using React Hook Form with Zod validation.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { providerProfileUpdateSchema, type ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';
import { getDefaultVisibilitySettings } from '@/lib/profileVisibility';
import type { ProviderProfile } from '@/types';

interface UseProviderProfileFormOptions {
  existingProfile?: Partial<ProviderProfile> | null;
}

interface UseProviderProfileFormReturn {
  handleSubmit: ReturnType<typeof useForm<ProviderProfileUpdateData>>['handleSubmit'];
  watch: ReturnType<typeof useForm<ProviderProfileUpdateData>>['watch'];
  setValue: ReturnType<typeof useForm<ProviderProfileUpdateData>>['setValue'];
  formState: ReturnType<typeof useForm<ProviderProfileUpdateData>>['formState'];
  updateField: <K extends keyof ProviderProfileUpdateData>(
    field: K,
    value: ProviderProfileUpdateData[K]
  ) => void;
  updateVisibility: (
    field: keyof ReturnType<typeof getDefaultVisibilitySettings>,
    value: 'public' | 'portal' | 'private'
  ) => void;
}

export function useProviderProfileForm(
  options?: UseProviderProfileFormOptions
): UseProviderProfileFormReturn {
  const form = useForm<ProviderProfileUpdateData>({
    resolver: zodResolver(providerProfileUpdateSchema),
    defaultValues: {
      specialties: [],
      languages: [],
      visibility: getDefaultVisibilitySettings(),
    },
    mode: 'onChange', // Validate on change for better UX
  });

  const { handleSubmit, watch, setValue, formState } = form;

  // Update field helper
  const updateField = <K extends keyof ProviderProfileUpdateData>(
    field: K,
    value: ProviderProfileUpdateData[K]
  ) => {
    setValue(field, value as any, { shouldValidate: true });
  };

  // Update visibility helper
  const updateVisibility = (
    field: keyof ReturnType<typeof getDefaultVisibilitySettings>,
    value: 'public' | 'portal' | 'private'
  ) => {
    const currentFormData = watch();
    const currentVisibility = currentFormData.visibility || getDefaultVisibilitySettings();
    setValue(
      'visibility',
      {
        ...currentVisibility,
        [field]: value,
      },
      { shouldValidate: true }
    );
  };

  return {
    handleSubmit,
    watch,
    setValue,
    formState,
    updateField,
    updateVisibility,
  };
}


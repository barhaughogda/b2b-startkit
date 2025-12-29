import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProviderProfileForm } from '@/hooks/useProviderProfileForm';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';
import { getDefaultVisibilitySettings } from '@/lib/profileVisibility';

// Mock react-hook-form
const mockUseForm = vi.fn();
const mockHandleSubmit = vi.fn();
const mockWatch = vi.fn();
const mockSetValue = vi.fn();
const mockFormState = { errors: {} };

vi.mock('react-hook-form', () => ({
  useForm: (config: any) => mockUseForm(config),
}));

// Mock zodResolver
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn((schema) => schema),
}));

// Mock providerProfileUpdateSchema
vi.mock('@/lib/schemas/providerProfile', () => ({
  providerProfileUpdateSchema: {},
}));

describe('useProviderProfileForm', () => {
  const defaultProfile: Partial<ProviderProfileUpdateData> = {
    specialties: ['Cardiology'],
    languages: ['English'],
    bio: 'Test bio',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseForm.mockReturnValue({
      handleSubmit: mockHandleSubmit,
      watch: mockWatch,
      setValue: mockSetValue,
      formState: mockFormState,
    });
    mockWatch.mockReturnValue({
      specialties: [],
      languages: [],
      visibility: getDefaultVisibilitySettings(),
    });
  });

  describe('Hook Initialization', () => {
    it('should initialize form with default values', () => {
      renderHook(() => useProviderProfileForm());

      expect(mockUseForm).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValues: expect.objectContaining({
            specialties: [],
            languages: [],
            visibility: getDefaultVisibilitySettings(),
          }),
        })
      );
    });

    it('should initialize form with zodResolver', () => {
      renderHook(() => useProviderProfileForm());

      expect(mockUseForm).toHaveBeenCalledWith(
        expect.objectContaining({
          resolver: expect.anything(),
        })
      );
    });

    it('should set mode to onChange', () => {
      renderHook(() => useProviderProfileForm());

      expect(mockUseForm).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'onChange',
        })
      );
    });
  });

  describe('Form State Management', () => {
    it('should return form methods', () => {
      const { result } = renderHook(() => useProviderProfileForm());

      expect(result.current.handleSubmit).toBe(mockHandleSubmit);
      expect(result.current.watch).toBe(mockWatch);
      expect(result.current.setValue).toBe(mockSetValue);
      expect(result.current.formState).toBe(mockFormState);
    });

    it('should return updateField function', () => {
      const { result } = renderHook(() => useProviderProfileForm());

      expect(result.current.updateField).toBeDefined();
      expect(typeof result.current.updateField).toBe('function');
    });

    it('should return updateVisibility function', () => {
      const { result } = renderHook(() => useProviderProfileForm());

      expect(result.current.updateVisibility).toBeDefined();
      expect(typeof result.current.updateVisibility).toBe('function');
    });
  });

  describe('updateField Function', () => {
    it('should call setValue when updateField is called', () => {
      const { result } = renderHook(() => useProviderProfileForm());

      result.current.updateField('bio', 'New bio text');

      expect(mockSetValue).toHaveBeenCalledWith('bio', 'New bio text', {
        shouldValidate: true,
      });
    });

    it('should handle array fields correctly', () => {
      const { result } = renderHook(() => useProviderProfileForm());

      result.current.updateField('specialties', ['Cardiology', 'Neurology']);

      expect(mockSetValue).toHaveBeenCalledWith(
        'specialties',
        ['Cardiology', 'Neurology'],
        { shouldValidate: true }
      );
    });
  });

  describe('updateVisibility Function', () => {
    it('should update visibility settings', () => {
      const currentVisibility = getDefaultVisibilitySettings();
      mockWatch.mockReturnValue({
        visibility: currentVisibility,
      });

      const { result } = renderHook(() => useProviderProfileForm());

      result.current.updateVisibility('bio', 'portal');

      expect(mockSetValue).toHaveBeenCalledWith(
        'visibility',
        expect.objectContaining({
          bio: 'portal',
        }),
        { shouldValidate: true }
      );
    });

    it('should preserve other visibility settings when updating one', () => {
      const currentVisibility = getDefaultVisibilitySettings();
      currentVisibility.bio = 'public';
      currentVisibility.detailedBio = 'portal';

      mockWatch.mockReturnValue({
        visibility: currentVisibility,
      });

      const { result } = renderHook(() => useProviderProfileForm());

      result.current.updateVisibility('philosophyOfCare', 'private');

      expect(mockSetValue).toHaveBeenCalledWith(
        'visibility',
        expect.objectContaining({
          bio: 'public',
          detailedBio: 'portal',
          philosophyOfCare: 'private',
        }),
        { shouldValidate: true }
      );
    });
  });

  describe('Form Data Loading', () => {
    it('should load existing profile data into form', () => {
      const { result } = renderHook(() =>
        useProviderProfileForm({ existingProfile: defaultProfile })
      );

      // Form should be initialized with profile data
      expect(mockUseForm).toHaveBeenCalled();
    });
  });
});


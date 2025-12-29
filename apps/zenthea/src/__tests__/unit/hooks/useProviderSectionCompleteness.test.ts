import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProviderSectionCompleteness } from '@/hooks/useProviderSectionCompleteness';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';
import { ALL_SECTIONS } from '@/components/provider/ProviderProfileCompletenessIndicator';

describe('useProviderSectionCompleteness', () => {
  const defaultFormData: ProviderProfileUpdateData = {
    specialties: [],
    languages: [],
    bio: '',
  };

  describe('Section Completeness Calculation', () => {
    it('should calculate completeness for all sections', () => {
      const formData: ProviderProfileUpdateData = {
        specialties: ['Cardiology'],
        languages: ['English'],
        bio: 'Test bio',
        education: [{ institution: 'Test University', degree: 'MD', year: '2020' }],
        detailedBio: 'Detailed bio',
        conditionsTreated: ['Hypertension'],
        professionalPhotoUrl: 'https://example.com/photo.jpg',
        visibility: {
          bio: 'public' as const,
          detailedBio: 'public' as const,
          philosophyOfCare: 'public' as const,
          professionalPhoto: 'public' as const,
          introductionVideo: 'public' as const,
          testimonials: 'public' as const,
        },
      };

      const { result } = renderHook(() => useProviderSectionCompleteness(formData));

      expect(result.current.sectionCompleteness).toBeDefined();
      expect(result.current.sectionCompleteness.identity).toBe(true);
      expect(result.current.sectionCompleteness.credentials).toBe(true);
      expect(result.current.sectionCompleteness.personal).toBe(true);
      expect(result.current.sectionCompleteness.practice).toBe(true);
      expect(result.current.sectionCompleteness.multimedia).toBe(true);
      expect(result.current.sectionCompleteness.privacy).toBe(true);
    });

    it('should return empty sections completed for empty form data', () => {
      const { result } = renderHook(() => useProviderSectionCompleteness(defaultFormData));

      expect(result.current.sectionsCompleted).toEqual([]);
      expect(result.current.getSectionCompleteness('identity')).toBe(false);
    });

    it('should correctly identify completed sections', () => {
      const formData: ProviderProfileUpdateData = {
        specialties: ['Cardiology'],
        languages: ['English'],
        bio: 'Test bio',
        visibility: {
          bio: 'public' as const,
          detailedBio: 'public' as const,
          philosophyOfCare: 'public' as const,
          professionalPhoto: 'public' as const,
          introductionVideo: 'public' as const,
          testimonials: 'public' as const,
        },
      };

      const { result } = renderHook(() => useProviderSectionCompleteness(formData));

      expect(result.current.sectionsCompleted).toContain('identity');
      expect(result.current.sectionsCompleted).toContain('privacy');
      expect(result.current.getSectionCompleteness('identity')).toBe(true);
      expect(result.current.getSectionCompleteness('credentials')).toBe(false);
    });
  });

  describe('getSectionCompleteness Helper', () => {
    it('should return true for complete sections', () => {
      const formData: ProviderProfileUpdateData = {
        specialties: ['Cardiology'],
        languages: ['English'],
        bio: 'Test bio',
      };

      const { result } = renderHook(() => useProviderSectionCompleteness(formData));

      expect(result.current.getSectionCompleteness('identity')).toBe(true);
    });

    it('should return false for incomplete sections', () => {
      const { result } = renderHook(() => useProviderSectionCompleteness(defaultFormData));

      expect(result.current.getSectionCompleteness('identity')).toBe(false);
      expect(result.current.getSectionCompleteness('credentials')).toBe(false);
    });

    it('should return false for unknown sections', () => {
      const { result } = renderHook(() => useProviderSectionCompleteness(defaultFormData));

      expect(result.current.getSectionCompleteness('unknown-section')).toBe(false);
    });
  });

  describe('Memoization', () => {
    it('should memoize section completeness calculations', () => {
      const formData: ProviderProfileUpdateData = {
        specialties: ['Cardiology'],
        languages: ['English'],
        bio: 'Test bio',
      };

      const { result, rerender } = renderHook(
        (props) => useProviderSectionCompleteness(props),
        { initialProps: formData }
      );

      const firstResult = result.current.sectionCompleteness;

      // Rerender with same data
      rerender(formData);

      // Should return same object reference (memoized)
      expect(result.current.sectionCompleteness).toBe(firstResult);
    });

    it('should recalculate when form data changes', () => {
      const initialFormData: ProviderProfileUpdateData = {
        specialties: [],
        languages: [],
        bio: '',
      };

      const { result, rerender } = renderHook(
        (props) => useProviderSectionCompleteness(props),
        { initialProps: initialFormData }
      );

      expect(result.current.getSectionCompleteness('identity')).toBe(false);

      // Update form data
      const updatedFormData: ProviderProfileUpdateData = {
        specialties: ['Cardiology'],
        languages: ['English'],
        bio: 'Test bio',
      };

      rerender(updatedFormData);

      expect(result.current.getSectionCompleteness('identity')).toBe(true);
    });
  });
});


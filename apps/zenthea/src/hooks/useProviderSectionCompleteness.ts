/**
 * Custom hook for calculating provider profile section completeness
 * 
 * Provides memoized section completeness calculations and helper functions
 * for checking individual section completion status.
 */

import { useMemo } from 'react';
import { calculateProviderSectionCompleteness } from '@/lib/profileCompleteness';
import { ALL_SECTIONS } from '@/components/provider/ProviderProfileCompletenessIndicator';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';

interface UseProviderSectionCompletenessReturn {
  sectionCompleteness: Record<string, boolean>;
  sectionsCompleted: string[];
  getSectionCompleteness: (section: string) => boolean;
}

/**
 * Hook for calculating and accessing provider profile section completeness
 * 
 * @param formData - The form data containing all profile fields
 * @returns Object with section completeness data and helper functions
 * 
 * @example
 * ```tsx
 * const { sectionsCompleted, getSectionCompleteness } = useProviderSectionCompleteness(formData);
 * 
 * // Check if identity section is complete
 * const isIdentityComplete = getSectionCompleteness('identity');
 * 
 * // Get list of completed sections
 * console.log(sectionsCompleted); // ['identity', 'credentials', ...]
 * ```
 */
export function useProviderSectionCompleteness(
  formData: ProviderProfileUpdateData
): UseProviderSectionCompletenessReturn {
  // Memoize section completeness calculations for performance
  // This prevents recalculating completeness on every render
  const sectionCompleteness = useMemo(() => {
    return ALL_SECTIONS.reduce((acc, section) => {
      acc[section] = calculateProviderSectionCompleteness(section, formData);
      return acc;
    }, {} as Record<string, boolean>);
  }, [formData]);

  // Get completed sections list
  const sectionsCompleted = useMemo(() => {
    return ALL_SECTIONS.filter((section) => sectionCompleteness[section]);
  }, [sectionCompleteness]);

  // Helper function to check if a section is complete
  const getSectionCompleteness = (section: string): boolean => {
    return sectionCompleteness[section] || false;
  };

  return {
    sectionCompleteness,
    sectionsCompleted,
    getSectionCompleteness,
  };
}


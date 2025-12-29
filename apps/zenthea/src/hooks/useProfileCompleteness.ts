import { useMemo, useCallback } from 'react';

export interface UseProfileCompletenessReturn {
  getSectionCompleteness: (section: string) => boolean;
  sectionsCompleted: string[];
}

/**
 * Hook to calculate profile section completeness
 * Determines which sections are complete based on patient profile data
 */
export function useProfileCompleteness(patientProfile: any): UseProfileCompletenessReturn {
  const getSectionCompleteness = useCallback((section: string): boolean => {
    if (!patientProfile) return false;
    
    switch (section) {
      case 'demographics':
        return !!(patientProfile.gender && patientProfile.primaryLanguage);
      case 'medicalHistory':
        return !!(patientProfile.medicalHistory && 
          (patientProfile.medicalHistory.chronicConditions?.length > 0 ||
           patientProfile.medicalHistory.surgeries?.length > 0 ||
           patientProfile.medicalHistory.hospitalizations?.length > 0));
      case 'allergies':
        return !!(patientProfile.allergies &&
          (patientProfile.allergies.medications?.length > 0 ||
           patientProfile.allergies.foods?.length > 0 ||
           patientProfile.allergies.environmental?.length > 0 ||
           patientProfile.allergies.other?.length > 0));
      case 'medications':
        return !!(patientProfile.medications && patientProfile.medications.length > 0);
      case 'emergencyContacts':
        return !!(patientProfile.emergencyContacts && patientProfile.emergencyContacts.length > 0);
      case 'healthcareProxy':
        return !!(patientProfile.healthcareProxy && patientProfile.healthcareProxy.name);
      case 'insurance':
        return !!(patientProfile.insurance && patientProfile.insurance.primary?.provider);
      case 'lifestyle':
        return !!(patientProfile.lifestyle && patientProfile.lifestyle.smokingStatus);
      case 'familyHistory':
        return !!(patientProfile.familyHistory && patientProfile.familyHistory.length > 0);
      case 'immunizations':
        return !!(patientProfile.immunizations && patientProfile.immunizations.length > 0);
      case 'advanceDirectives':
        return !!(patientProfile.advanceDirectives &&
          (patientProfile.advanceDirectives.hasLivingWill ||
           patientProfile.advanceDirectives.hasDNR ||
           patientProfile.advanceDirectives.hasPOLST));
      case 'medicalBio':
        return !!(patientProfile.medicalBio && patientProfile.medicalBio.trim().length > 0);
      default:
        return false;
    }
  }, [patientProfile]);

  const sectionsCompleted = useMemo(() => {
    const allSections = [
      'demographics',
      'medicalHistory',
      'allergies',
      'medications',
      'emergencyContacts',
      'healthcareProxy',
      'insurance',
      'lifestyle',
      'familyHistory',
      'immunizations',
      'advanceDirectives',
      'medicalBio',
    ];
    
    return allSections.filter((section) => getSectionCompleteness(section));
  }, [getSectionCompleteness]);

  return {
    getSectionCompleteness,
    sectionsCompleted,
  };
}


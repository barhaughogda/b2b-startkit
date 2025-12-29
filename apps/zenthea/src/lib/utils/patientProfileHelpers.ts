/**
 * Utility functions for patient profile operations
 */

/**
 * Get patient initials from profile or fallback name
 * @param patientProfile - Patient profile object with firstName and lastName
 * @param fallbackName - Fallback name string if profile is not available
 * @returns Uppercase initials string (e.g., "JD" for "John Doe")
 */
export function getPatientInitials(
  patientProfile: { firstName?: string; lastName?: string } | null | undefined,
  fallbackName?: string
): string {
  if (patientProfile) {
    const first = patientProfile.firstName?.[0] || '';
    const last = patientProfile.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  }

  if (fallbackName) {
    return fallbackName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  return 'P'; // Default fallback
}

/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth string (ISO format: YYYY-MM-DD)
 * @returns Age in years or null if date is invalid
 */
export function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;

  try {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    // Validate date
    if (isNaN(birthDate.getTime())) {
      return null;
    }
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  } catch {
    return null;
  }
}


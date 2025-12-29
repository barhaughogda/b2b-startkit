import { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';

/**
 * Calculate whether a specific provider profile section is complete
 * 
 * Each section has specific criteria that must be met to be considered complete:
 * 
 * - Contact: Requires email and phone (phone must have 10-15 digits)
 * - Identity: Requires specialties, languages, and bio
 * - Credentials: Requires at least one of education, board certifications, or certifications
 * - Personal: Requires at least one of detailedBio, philosophyOfCare, or whyIBecameADoctor
 * - Practice: Requires at least one of conditionsTreated or proceduresPerformed
 * - Multimedia: Requires at least one of professionalPhotoUrl or introductionVideoUrl
 * - Privacy: Requires visibility settings object
 * 
 * @param section - The section ID to check (e.g., 'contact', 'identity', 'credentials')
 * @param formData - The form data containing all profile fields
 * @returns true if the section is complete, false otherwise
 */
export function calculateProviderSectionCompleteness(
  section: string,
  formData: ProviderProfileUpdateData
): boolean {
  switch (section) {
    case 'contact':
      // Contact section is complete if:
      // - Email is provided and valid (non-empty)
      // - Phone is provided and valid (non-empty, contains 10-15 digits)
      const hasEmail = !!(formData.email && formData.email.trim().length > 0);
      const hasPhone = !!(formData.phone && formData.phone.trim().length > 0);
      // Validate phone has at least 10 digits
      const phoneDigits = formData.phone ? formData.phone.replace(/\D/g, '') : '';
      const hasValidPhone = phoneDigits.length >= 10 && phoneDigits.length <= 15;
      return hasEmail && hasPhone && hasValidPhone;

    case 'identity':
      // Identity section is complete if:
      // - At least one specialty is provided
      // - At least one language is provided
      // - Bio has non-empty content
      return !!(
        formData.specialties &&
        formData.specialties.length > 0 &&
        formData.languages &&
        formData.languages.length > 0 &&
        formData.bio &&
        formData.bio.trim().length > 0
      );

    case 'credentials':
      // Credentials section is complete if at least one of:
      // - Education entries exist
      // - Board certifications exist
      // - Other certifications exist
      return !!(
        (formData.education && formData.education.length > 0) ||
        (formData.boardCertifications && formData.boardCertifications.length > 0) ||
        (formData.certifications && formData.certifications.length > 0)
      );

    case 'personal':
      // Personal section is complete if at least one of:
      // - Detailed bio is provided
      // - Philosophy of care is provided
      // - "Why I became a doctor" story is provided
      return !!(
        formData.detailedBio ||
        formData.philosophyOfCare ||
        formData.whyIBecameADoctor
      );

    case 'practice':
      // Practice section is complete if at least one of:
      // - Conditions treated list exists
      // - Procedures performed list exists
      return !!(
        (formData.conditionsTreated && formData.conditionsTreated.length > 0) ||
        (formData.proceduresPerformed && formData.proceduresPerformed.length > 0)
      );

    case 'multimedia':
      // Multimedia section is complete if at least one of:
      // - Professional photo URL exists
      // - Introduction video URL exists
      return !!(
        formData.professionalPhotoUrl || formData.introductionVideoUrl
      );

    case 'privacy':
      // Privacy section is complete if visibility settings exist
      return !!formData.visibility;

    default:
      return false;
  }
}


/**
 * Provider Profile Validation Utilities
 * 
 * Provides validation functions for provider profile fields
 * that can be used independently of form libraries.
 */

import { MAX_FIELD_LENGTHS } from '@/lib/constants/providerProfileConstants';

/**
 * Validates specialties array
 */
export function validateSpecialties(specialties: unknown): boolean {
  if (!Array.isArray(specialties)) {
    return false;
  }
  if (specialties.length === 0) {
    return false;
  }
  return specialties.every((s) => typeof s === 'string' && s.trim().length > 0);
}

/**
 * Validates languages array
 */
export function validateLanguages(languages: unknown): boolean {
  if (!Array.isArray(languages)) {
    return false;
  }
  if (languages.length === 0) {
    return false;
  }
  return languages.every((l) => typeof l === 'string' && l.trim().length > 0);
}

/**
 * Validates bio field (required, 10-500 characters)
 */
export function validateBio(bio: unknown): boolean {
  if (typeof bio !== 'string') {
    return false;
  }
  const trimmed = bio.trim();
  return trimmed.length >= 10 && trimmed.length <= MAX_FIELD_LENGTHS.bio;
}

/**
 * Validates detailed bio field (optional, max 5000 characters)
 */
export function validateDetailedBio(detailedBio: unknown): boolean {
  if (detailedBio === undefined || detailedBio === null || detailedBio === '') {
    return true; // Optional field
  }
  if (typeof detailedBio !== 'string') {
    return false;
  }
  return detailedBio.length <= MAX_FIELD_LENGTHS.detailedBio;
}

/**
 * Validates philosophy of care field (optional, max 2000 characters)
 */
export function validatePhilosophyOfCare(philosophyOfCare: unknown): boolean {
  if (philosophyOfCare === undefined || philosophyOfCare === null || philosophyOfCare === '') {
    return true; // Optional field
  }
  if (typeof philosophyOfCare !== 'string') {
    return false;
  }
  return philosophyOfCare.length <= MAX_FIELD_LENGTHS.philosophyOfCare;
}

/**
 * Validates why I became a doctor field (optional, max 2000 characters)
 */
export function validateWhyIBecameADoctor(whyIBecameADoctor: unknown): boolean {
  if (whyIBecameADoctor === undefined || whyIBecameADoctor === null || whyIBecameADoctor === '') {
    return true; // Optional field
  }
  if (typeof whyIBecameADoctor !== 'string') {
    return false;
  }
  return whyIBecameADoctor.length <= MAX_FIELD_LENGTHS.whyIBecameADoctor;
}

/**
 * Formats validation error message
 */
export function formatValidationError(fieldName: string, message: string): string {
  // Convert camelCase to Title Case
  const formattedFieldName = fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
  return `${formattedFieldName}: ${message}`;
}


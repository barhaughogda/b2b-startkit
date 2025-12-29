/**
 * Validation utilities for patient profile forms
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return true; // Optional field
  return /^\+?[\d\s\-\(\)]+$/.test(phone);
}

/**
 * Validate date is in the past
 */
export function validatePastDate(date: string): boolean {
  if (!date) return true; // Optional field
  const dateObj = new Date(date);
  return dateObj < new Date();
}

/**
 * Validate date range (end date after start date)
 */
export function validateDateRange(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return true; // Optional fields
  return new Date(endDate) >= new Date(startDate);
}

/**
 * Validate age is within reasonable range
 */
export function validateAge(age: number | undefined): boolean {
  if (age === undefined) return true; // Optional field
  return age >= 0 && age <= 150;
}

/**
 * Validate dosage format (e.g., "500mg", "10ml")
 */
export function validateDosage(dosage: string): boolean {
  if (!dosage) return false; // Required field
  return /^\d+\.?\d*\s*(mg|ml|g|mcg|units?|tablets?|capsules?|drops?|puffs?|patches?|injections?)$/i.test(dosage.trim());
}

/**
 * Check for duplicate entries in an array
 */
export function hasDuplicates<T>(
  items: T[],
  getKey: (item: T) => string,
  caseSensitive: boolean = false
): boolean {
  const keys = items.map((item) => {
    const key = getKey(item);
    return caseSensitive ? key : key.toLowerCase();
  });
  return new Set(keys).size !== keys.length;
}

/**
 * Validate demographics form
 */
export function validateDemographics(data: {
  gender?: string;
  primaryLanguage?: string;
  cellPhone?: string;
  workPhone?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.primaryLanguage) {
    errors.primaryLanguage = 'Primary language is required';
  }

  if (data.cellPhone && !validatePhone(data.cellPhone)) {
    errors.cellPhone = 'Invalid phone number format';
  }

  if (data.workPhone && !validatePhone(data.workPhone)) {
    errors.workPhone = 'Invalid phone number format';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate medical history entry
 */
export function validateMedicalHistoryEntry(data: {
  condition?: string;
  diagnosisDate?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (data.condition && !data.condition.trim()) {
    errors.condition = 'Condition is required';
  }

  if (data.diagnosisDate && !validatePastDate(data.diagnosisDate)) {
    errors.diagnosisDate = 'Diagnosis date must be in the past';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate allergy entry
 */
export function validateAllergy(data: {
  substance?: string;
  reactionType?: string;
  severity?: string;
  symptoms?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.substance || !data.substance.trim()) {
    errors.substance = 'Substance is required';
  }

  if (!data.reactionType || !data.reactionType.trim()) {
    errors.reactionType = 'Reaction type is required';
  }

  if (!data.severity) {
    errors.severity = 'Severity is required';
  }

  if (!data.symptoms || !data.symptoms.trim()) {
    errors.symptoms = 'Symptoms are required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate medication entry
 */
export function validateMedication(data: {
  name?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Medication name is required';
  }

  if (!data.dosage || !data.dosage.trim()) {
    errors.dosage = 'Dosage is required';
  } else if (!validateDosage(data.dosage)) {
    errors.dosage = 'Invalid dosage format (e.g., 500mg, 10ml)';
  }

  if (!data.frequency || !data.frequency.trim()) {
    errors.frequency = 'Frequency is required';
  }

  if (!data.route) {
    errors.route = 'Route is required';
  }

  if (data.startDate && !validatePastDate(data.startDate)) {
    errors.startDate = 'Start date must be in the past';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate emergency contact
 */
export function validateEmergencyContact(data: {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Name is required';
  }

  if (!data.relationship || !data.relationship.trim()) {
    errors.relationship = 'Relationship is required';
  }

  if (!data.phone || !data.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!validatePhone(data.phone)) {
    errors.phone = 'Invalid phone number format';
  }

  if (data.email && !validateEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate insurance information
 */
export function validateInsurance(data: {
  provider?: string;
  policyNumber?: string;
  subscriberName?: string;
  effectiveDate?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.provider || !data.provider.trim()) {
    errors.provider = 'Insurance provider is required';
  }

  if (!data.policyNumber || !data.policyNumber.trim()) {
    errors.policyNumber = 'Policy number is required';
  }

  if (!data.subscriberName || !data.subscriberName.trim()) {
    errors.subscriberName = 'Subscriber name is required';
  }

  if (!data.effectiveDate) {
    errors.effectiveDate = 'Effective date is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}


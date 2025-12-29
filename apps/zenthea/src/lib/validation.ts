// Validation utilities for provider registration form

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface Step1Data {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface Step2Data {
  specialty: string;
  licenseNumber: string;
  npi: string;
}

export interface Step3Data {
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

// Constants
const MIN_PASSWORD_LENGTH = 8;
const NPI_LENGTH = 10;
const MIN_PHONE_LENGTH = 10;

/**
 * Password complexity regex pattern
 * Requires:
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character (@$!%*?&)
 * - Minimum 8 characters
 */
export const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Validates password complexity
 * @param password - Password to validate
 * @returns true if password meets complexity requirements
 */
export const validatePasswordComplexity = (password: string): boolean => {
  return PASSWORD_COMPLEXITY_REGEX.test(password);
};

/**
 * Gets password complexity error message
 * @returns Error message describing password requirements
 */
export const getPasswordComplexityErrorMessage = (): string => {
  return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)';
};

export const validateStep1 = (data: Step1Data): ValidationResult => {
  const { firstName, lastName, email, phone } = data;
  const errors: string[] = [];

  if (!firstName.trim()) {
    errors.push('First name is required');
  }
  if (!lastName.trim()) {
    errors.push('Last name is required');
  }
  if (!email.trim() || !email.includes('@')) {
    errors.push('Valid email address is required');
  }
  if (!phone.trim()) {
    errors.push('Phone number is required');
  } else if (phone.length < MIN_PHONE_LENGTH) {
    errors.push('Phone number is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateStep2 = (data: Step2Data): ValidationResult => {
  const { specialty, licenseNumber, npi } = data;
  const errors: string[] = [];

  if (!specialty.trim()) {
    errors.push('Specialty is required');
  }
  if (!licenseNumber.trim()) {
    errors.push('License number is required');
  }
  if (!npi.trim() || npi.length !== NPI_LENGTH) {
    errors.push('NPI must be 10 digits');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateStep3 = (data: Step3Data): ValidationResult => {
  const { password, confirmPassword, acceptTerms, acceptPrivacy } = data;
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }
  if (!acceptTerms) {
    errors.push('You must accept the terms of service');
  }
  if (!acceptPrivacy) {
    errors.push('You must accept the privacy policy');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

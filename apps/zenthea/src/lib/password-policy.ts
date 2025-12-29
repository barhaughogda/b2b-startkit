/**
 * Password Policy Validation
 * 
 * Comprehensive password validation with complexity requirements, common password checking,
 * and clear error messages. Designed for HIPAA-compliant healthcare applications.
 * 
 * Features:
 * - Configurable minimum length
 * - Complexity rules (uppercase, lowercase, numbers, special characters)
 * - Common/weak password detection
 * - Clear, user-friendly error messages
 * - Detailed validation results for UI feedback
 */

/**
 * Password policy configuration
 * Can be extended to support tenant-level or platform-wide policies
 */
export interface PasswordPolicyConfig {
  /** Minimum password length (default: 8) */
  minLength: number;
  /** Require at least one uppercase letter (default: true) */
  requireUppercase: boolean;
  /** Require at least one lowercase letter (default: true) */
  requireLowercase: boolean;
  /** Require at least one number (default: true) */
  requireNumber: boolean;
  /** Require at least one special character (default: false) */
  requireSpecialChar: boolean;
  /** Maximum password length (default: 128) */
  maxLength: number;
  /** Check against common passwords (default: true) */
  checkCommonPasswords: boolean;
  /** Maximum consecutive identical characters allowed (default: 3) */
  maxConsecutiveChars: number;
}

/**
 * Default password policy configuration
 * Aligns with HIPAA security requirements and industry best practices
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicyConfig = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Optional for better UX, but can be enabled
  maxLength: 128,
  checkCommonPasswords: true,
  maxConsecutiveChars: 3,
};

/**
 * Detailed password validation result
 */
export interface PasswordValidationResult {
  /** Whether the password is valid */
  valid: boolean;
  /** Human-readable error message (if invalid) */
  error?: string;
  /** Error code for programmatic handling */
  code?: string;
  /** Detailed validation breakdown */
  details?: {
    /** Whether minimum length requirement is met */
    minLength: boolean;
    /** Whether maximum length requirement is met */
    maxLength: boolean;
    /** Whether uppercase requirement is met */
    hasUppercase: boolean;
    /** Whether lowercase requirement is met */
    hasLowercase: boolean;
    /** Whether number requirement is met */
    hasNumber: boolean;
    /** Whether special character requirement is met */
    hasSpecialChar: boolean;
    /** Whether password passes common password check */
    isNotCommon: boolean;
    /** Whether password passes consecutive character check */
    hasValidConsecutiveChars: boolean;
  };
  /** Strength score (0-100) */
  strength?: number;
}

/**
 * List of common/weak passwords to check against
 * Based on common password lists and healthcare-specific weak passwords
 * This is a basic list - in production, consider using a more comprehensive list
 * or an external service for common password checking
 */
const COMMON_PASSWORDS = new Set([
  // Top 10 most common passwords
  'password',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'abc123',
  'password1',
  'Password1',
  'password123',
  'admin123',
  
  // Healthcare-specific weak passwords
  'welcome',
  'welcome123',
  'clinic123',
  'hospital',
  'patient',
  'provider',
  'doctor',
  'nurse',
  'medical',
  'health',
  
  // Common patterns
  '123456',
  '1234567',
  '12345678910',
  'qwerty123',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'passw0rd',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
  
  // Simple patterns
  'aaaaaa',
  'bbbbbb',
  'cccccc',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '000000',
]);

/**
 * Check if password is a common/weak password
 * @param password - Password to check
 * @returns True if password is common/weak
 */
function isCommonPassword(password: string): boolean {
  // Normalize password for comparison (case-insensitive, remove spaces)
  const normalized = password.toLowerCase().trim();
  
  // Check exact match
  if (COMMON_PASSWORDS.has(normalized)) {
    return true;
  }
  
  // Check if password is just a common password with numbers appended
  // e.g., "password123", "password1"
  for (const common of COMMON_PASSWORDS) {
    if (normalized.startsWith(common) && normalized.length <= common.length + 3) {
      // Check if suffix is just numbers
      const suffix = normalized.slice(common.length);
      if (suffix.length > 0 && /^\d+$/.test(suffix)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check for excessive consecutive identical characters
 * @param password - Password to check
 * @param maxConsecutive - Maximum allowed consecutive characters (default: 3)
 * @returns True if password has valid consecutive character pattern
 */
function hasValidConsecutiveChars(password: string, maxConsecutive: number = 3): boolean {
  if (password.length === 0) return true;
  
  let consecutiveCount = 1;
  let lastChar = password[0];
  
  for (let i = 1; i < password.length; i++) {
    if (password[i] === lastChar) {
      consecutiveCount++;
      if (consecutiveCount > maxConsecutive) {
        return false;
      }
    } else {
      consecutiveCount = 1;
      lastChar = password[i];
    }
  }
  
  return true;
}

/**
 * Calculate password strength score (0-100)
 * @param password - Password to score
 * @param details - Validation details
 * @returns Strength score
 */
function calculateStrength(password: string, details: PasswordValidationResult['details']): number {
  if (!details) return 0;
  
  let score = 0;
  
  // Length score (0-30 points)
  if (password.length >= 12) score += 30;
  else if (password.length >= 10) score += 20;
  else if (password.length >= 8) score += 10;
  
  // Character variety score (0-40 points)
  let varietyScore = 0;
  if (details.hasUppercase) varietyScore += 10;
  if (details.hasLowercase) varietyScore += 10;
  if (details.hasNumber) varietyScore += 10;
  if (details.hasSpecialChar) varietyScore += 10;
  score += varietyScore;
  
  // Pattern quality score (0-30 points)
  if (details.isNotCommon) score += 15;
  if (details.hasValidConsecutiveChars) score += 10;
  if (password.length >= 12 && !/^[a-z]+$/i.test(password)) score += 5; // Not all letters
  
  return Math.min(100, score);
}

/**
 * Validate password against policy
 * @param password - Password to validate
 * @param policy - Password policy configuration (defaults to DEFAULT_PASSWORD_POLICY)
 * @returns Detailed validation result
 */
export function validatePasswordPolicy(
  password: string,
  policy: PasswordPolicyConfig = DEFAULT_PASSWORD_POLICY
): PasswordValidationResult {
  // Initialize details object
  const details: PasswordValidationResult['details'] = {
    minLength: password.length >= policy.minLength,
    maxLength: password.length <= policy.maxLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    isNotCommon: !policy.checkCommonPasswords || !isCommonPassword(password),
    hasValidConsecutiveChars: hasValidConsecutiveChars(password, policy.maxConsecutiveChars),
  };
  
  // Check minimum length
  if (!details.minLength) {
    return {
      valid: false,
      error: `Password must be at least ${policy.minLength} characters long`,
      code: 'PASSWORD_TOO_SHORT',
      details,
      strength: calculateStrength(password, details),
    };
  }
  
  // Check maximum length
  if (!details.maxLength) {
    return {
      valid: false,
      error: `Password must be no more than ${policy.maxLength} characters long`,
      code: 'PASSWORD_TOO_LONG',
      details,
      strength: calculateStrength(password, details),
    };
  }
  
  // Check common passwords FIRST (before complexity checks)
  // This is a security issue regardless of complexity
  if (policy.checkCommonPasswords && !details.isNotCommon) {
    return {
      valid: false,
      error: 'Password is too common or easily guessed. Please choose a more unique password.',
      code: 'PASSWORD_TOO_COMMON',
      details,
      strength: calculateStrength(password, details),
    };
  }
  
  // Check uppercase requirement
  if (policy.requireUppercase && !details.hasUppercase) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter (A-Z)',
      code: 'PASSWORD_MISSING_UPPERCASE',
      details,
      strength: calculateStrength(password, details),
    };
  }
  
  // Check lowercase requirement
  if (policy.requireLowercase && !details.hasLowercase) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter (a-z)',
      code: 'PASSWORD_MISSING_LOWERCASE',
      details,
      strength: calculateStrength(password, details),
    };
  }
  
  // Check number requirement
  if (policy.requireNumber && !details.hasNumber) {
    return {
      valid: false,
      error: 'Password must contain at least one number (0-9)',
      code: 'PASSWORD_MISSING_NUMBER',
      details,
      strength: calculateStrength(password, details),
    };
  }
  
  // Check special character requirement
  if (policy.requireSpecialChar && !details.hasSpecialChar) {
    return {
      valid: false,
      error: 'Password must contain at least one special character (!@#$%^&*...)',
      code: 'PASSWORD_MISSING_SPECIAL_CHAR',
      details,
      strength: calculateStrength(password, details),
    };
  }
  
  // Check consecutive characters
  if (!details.hasValidConsecutiveChars) {
    return {
      valid: false,
      error: `Password cannot contain more than ${policy.maxConsecutiveChars} consecutive identical characters`,
      code: 'PASSWORD_TOO_MANY_CONSECUTIVE',
      details,
      strength: calculateStrength(password, details),
    };
  }
  
  // Password is valid
  const strength = calculateStrength(password, details);
  
  return {
    valid: true,
    details,
    strength,
  };
}

/**
 * Get human-readable password requirements based on policy
 * @param policy - Password policy configuration
 * @returns Array of requirement strings
 */
export function getPasswordRequirements(
  policy: PasswordPolicyConfig = DEFAULT_PASSWORD_POLICY
): string[] {
  const requirements: string[] = [];
  
  requirements.push(`At least ${policy.minLength} characters long`);
  
  if (policy.requireUppercase) {
    requirements.push('At least one uppercase letter (A-Z)');
  }
  
  if (policy.requireLowercase) {
    requirements.push('At least one lowercase letter (a-z)');
  }
  
  if (policy.requireNumber) {
    requirements.push('At least one number (0-9)');
  }
  
  if (policy.requireSpecialChar) {
    requirements.push('At least one special character (!@#$%^&*...)');
  }
  
  if (policy.checkCommonPasswords) {
    requirements.push('Not a common or easily guessed password');
  }
  
  requirements.push(`No more than ${policy.maxConsecutiveChars} consecutive identical characters`);
  
  return requirements;
}

/**
 * Validate password (backward compatibility wrapper)
 * Uses the same interface as the existing validatePassword function
 * but with enhanced validation
 * 
 * @param password - Password to validate
 * @returns Validation result compatible with existing code
 */
export function validatePassword(password: string): PasswordValidationResult {
  return validatePasswordPolicy(password, DEFAULT_PASSWORD_POLICY);
}


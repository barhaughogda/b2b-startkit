/**
 * Password validation utility
 * Provides consistent password validation across user creation and update flows
 */

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

/**
 * Validates password strength according to security requirements
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - Special characters are optional but checked
 * 
 * @param password - The password to validate
 * @returns Validation result with error message if invalid
 */
export function validatePassword(password: string): PasswordValidationResult {
  // Check minimum length
  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long",
      code: "PASSWORD_TOO_SHORT",
    };
  }

  // Check for required character types
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  // Validate required complexity
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return {
      valid: false,
      error:
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      code: "PASSWORD_COMPLEXITY_INSUFFICIENT",
    };
  }

  // Password meets all requirements
  return {
    valid: true,
  };
}

/**
 * Validates password and returns error response if invalid
 * Convenience function for use in API routes
 * 
 * @param password - The password to validate
 * @returns NextResponse with error if invalid, null if valid
 */
export function validatePasswordOrReturnError(
  password: string
): { valid: true } | { valid: false; error: string; code: string } {
  const result = validatePassword(password);
  
  if (!result.valid) {
    return {
      valid: false,
      error: result.error || "Invalid password",
      code: result.code || "PASSWORD_VALIDATION_FAILED",
    };
  }
  
  return { valid: true };
}


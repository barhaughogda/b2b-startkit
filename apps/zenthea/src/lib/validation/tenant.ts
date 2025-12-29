/**
 * Shared validation utilities for tenant-related operations
 * Reduces code duplication across API routes
 */

/**
 * Regex pattern for validating hex color codes
 * Supports both 3-digit (#RGB) and 6-digit (#RRGGBB) formats
 */
export const COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * Regex pattern for validating email addresses
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates a hex color code
 * @param color - Color string to validate
 * @returns True if color is valid hex format
 */
export function isValidHexColor(color: string): boolean {
  return COLOR_REGEX.test(color);
}

/**
 * Validates an email address
 * @param email - Email string to validate
 * @returns True if email is valid format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}


/**
 * Claim Validation Utilities (Task 9.2)
 * 
 * Provides validation functions for claim creation form:
 * - CPT code format validation
 * - Date range validation (service dates not in future)
 * - Required field validation
 * - Helpful error messages
 */

/**
 * Validates CPT code format
 * CPT codes are typically 5 digits (e.g., "99213")
 * HCPCS codes can be alphanumeric (e.g., "A0425")
 * Modifiers are 2 characters (e.g., "25", "59")
 * 
 * @param code - CPT or HCPCS code to validate
 * @returns Error message if invalid, null if valid
 */
export function validateCPTCode(code: string): string | null {
  if (!code || code.trim() === '') {
    return 'CPT code is required';
  }

  const trimmed = code.trim();
  
  // CPT codes: 5 digits
  // HCPCS codes: 1 letter + 4 digits (e.g., A0425)
  // Allow both formats
  const cptPattern = /^\d{5}$/; // 5 digits
  const hcpcsPattern = /^[A-Z]\d{4}$/; // 1 letter + 4 digits
  
  if (!cptPattern.test(trimmed) && !hcpcsPattern.test(trimmed)) {
    return 'CPT code must be 5 digits (e.g., 99213) or HCPCS format (e.g., A0425)';
  }

  return null;
}

/**
 * Validates diagnosis code format (ICD-10)
 * ICD-10 codes are alphanumeric, typically 3-7 characters
 * Format: Letter(s) followed by digits, optionally with decimal
 * Examples: "E11.9", "I10", "M79.3"
 * 
 * @param code - ICD-10 diagnosis code to validate
 * @returns Error message if invalid, null if valid
 */
export function validateDiagnosisCode(code: string): string | null {
  if (!code || code.trim() === '') {
    return 'Diagnosis code is required';
  }

  const trimmed = code.trim();
  
  // ICD-10 pattern:
  // - With decimal: Letter + exactly 2 digits + decimal + 1-2 digits (e.g., "E11.9", "M79.3", "Z00.00")
  // - Without decimal: Letter + 2-4 digits (e.g., "I10" = 3 chars, "I250" = 4 chars, max 5 chars total)
  // Note: Codes like "E11" (3 chars without decimal) are valid standalone codes
  // Maximum length without decimal is 5 characters (letter + 4 digits)
  const icd10PatternWithDecimal = /^[A-Z]\d{2}\.\d{1,2}$/; // E11.9, M79.3, Z00.00
  const icd10PatternWithoutDecimal = /^[A-Z]\d{2,4}$/; // I10 (3), I250 (4), max 5 chars total
  
  if (!icd10PatternWithDecimal.test(trimmed) && !icd10PatternWithoutDecimal.test(trimmed)) {
    return 'Diagnosis code must be valid ICD-10 format (e.g., E11.9, I10, M79.3)';
  }

  return null;
}

/**
 * Validates that a date is not in the future
 * 
 * @param dateTimestamp - Date timestamp in milliseconds
 * @returns Error message if invalid, null if valid
 */
export function validateDateNotInFuture(dateTimestamp: number): string | null {
  if (!dateTimestamp || dateTimestamp <= 0) {
    return 'Date is required';
  }

  const now = Date.now();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  
  // Allow dates up to 1 day in the future (for timezone edge cases)
  if (dateTimestamp > now + oneDayInMs) {
    return 'Service date cannot be in the future';
  }

  return null;
}

/**
 * Validates modifier code format
 * Modifiers are 2 characters (numeric or alphanumeric)
 * Examples: "25", "59", "LT", "RT"
 * 
 * @param modifier - Modifier code to validate
 * @returns Error message if invalid, null if valid
 */
export function validateModifier(modifier: string): string | null {
  if (!modifier || modifier.trim() === '') {
    return 'Modifier cannot be empty';
  }

  const trimmed = modifier.trim();
  
  // Modifiers are 2 characters (numeric or alphanumeric)
  const modifierPattern = /^[A-Z0-9]{2}$/;
  
  if (!modifierPattern.test(trimmed)) {
    return 'Modifier must be exactly 2 characters (e.g., 25, 59, LT, RT)';
  }

  return null;
}

/**
 * Validates charge amount
 * 
 * @param amount - Charge amount in cents
 * @returns Error message if invalid, null if valid
 */
export function validateChargeAmount(amount: number): string | null {
  if (amount === undefined || amount === null) {
    return 'Charge amount is required';
  }

  if (!Number.isFinite(amount)) {
    return 'Charge amount must be a valid number';
  }

  if (amount <= 0) {
    return 'Charge amount must be greater than 0';
  }

  return null;
}

/**
 * Validates units
 * 
 * @param units - Number of units
 * @returns Error message if invalid, null if valid
 */
export function validateUnits(units: number): string | null {
  if (units === undefined || units === null) {
    return 'Units are required';
  }

  if (units <= 0) {
    return 'Units must be greater than 0';
  }

  if (!Number.isInteger(units)) {
    return 'Units must be a whole number';
  }

  return null;
}

/**
 * Validates a line item for claim creation
 * 
 * @param lineItem - Line item to validate
 * @returns Object with field errors, empty if valid
 */
export function validateLineItem(lineItem: {
  procedureCode: string;
  modifiers?: string[];
  diagnosisCodes: string[];
  units: number;
  chargeAmount: number;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  // Validate procedure code
  const cptError = validateCPTCode(lineItem.procedureCode);
  if (cptError) {
    errors.procedureCode = cptError;
  }

  // Validate diagnosis codes
  if (!lineItem.diagnosisCodes || lineItem.diagnosisCodes.length === 0) {
    errors.diagnosisCodes = 'At least one diagnosis code is required';
  } else {
    lineItem.diagnosisCodes.forEach((code, index) => {
      const diagError = validateDiagnosisCode(code);
      if (diagError) {
        errors[`diagnosisCodes.${index}`] = diagError;
      }
    });
  }

  // Validate modifiers (if provided)
  if (lineItem.modifiers && lineItem.modifiers.length > 0) {
    lineItem.modifiers.forEach((modifier, index) => {
      const modError = validateModifier(modifier);
      if (modError) {
        errors[`modifiers.${index}`] = modError;
      }
    });
  }

  // Validate units
  const unitsError = validateUnits(lineItem.units);
  if (unitsError) {
    errors.units = unitsError;
  }

  // Validate charge amount
  const amountError = validateChargeAmount(lineItem.chargeAmount);
  if (amountError) {
    errors.chargeAmount = amountError;
  }

  return errors;
}


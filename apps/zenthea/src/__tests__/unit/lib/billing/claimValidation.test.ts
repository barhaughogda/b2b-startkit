/**
 * Claim Validation Utilities Tests (Task 9.2)
 * 
 * Tests for claim creation form validation functions:
 * - CPT code format validation
 * - Diagnosis code format validation
 * - Date range validation
 * - Modifier validation
 * - Units and charge amount validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateCPTCode,
  validateDiagnosisCode,
  validateModifier,
  validateDateNotInFuture,
  validateChargeAmount,
  validateUnits,
  validateLineItem,
} from '@/lib/billing/claimValidation';

describe('validateCPTCode', () => {
  it('should return null for valid 5-digit CPT code', () => {
    expect(validateCPTCode('99213')).toBeNull();
    expect(validateCPTCode('99214')).toBeNull();
    expect(validateCPTCode('99215')).toBeNull();
  });

  it('should return null for valid HCPCS code', () => {
    expect(validateCPTCode('A0425')).toBeNull();
    expect(validateCPTCode('E0424')).toBeNull();
  });

  it('should return error for empty code', () => {
    expect(validateCPTCode('')).toBe('CPT code is required');
    expect(validateCPTCode('   ')).toBe('CPT code is required');
  });

  it('should return error for invalid format', () => {
    expect(validateCPTCode('9921')).toBe('CPT code must be 5 digits (e.g., 99213) or HCPCS format (e.g., A0425)');
    expect(validateCPTCode('992136')).toBe('CPT code must be 5 digits (e.g., 99213) or HCPCS format (e.g., A0425)');
    expect(validateCPTCode('ABC123')).toBe('CPT code must be 5 digits (e.g., 99213) or HCPCS format (e.g., A0425)');
  });

  it('should handle whitespace', () => {
    expect(validateCPTCode(' 99213 ')).toBeNull();
  });
});

describe('validateDiagnosisCode', () => {
  it('should return null for valid ICD-10 codes', () => {
    expect(validateDiagnosisCode('E11.9')).toBeNull();
    expect(validateDiagnosisCode('I10')).toBeNull();
    expect(validateDiagnosisCode('M79.3')).toBeNull();
    expect(validateDiagnosisCode('Z00.00')).toBeNull();
  });

  it('should return error for empty code', () => {
    expect(validateDiagnosisCode('')).toBe('Diagnosis code is required');
    expect(validateDiagnosisCode('   ')).toBe('Diagnosis code is required');
  });

  it('should return error for invalid format', () => {
    // Codes with less than 2 digits after letter
    expect(validateDiagnosisCode('E1.9')).toBe('Diagnosis code must be valid ICD-10 format (e.g., E11.9, I10, M79.3)');
    expect(validateDiagnosisCode('E')).toBe('Diagnosis code must be valid ICD-10 format (e.g., E11.9, I10, M79.3)');
    expect(validateDiagnosisCode('E1')).toBe('Diagnosis code must be valid ICD-10 format (e.g., E11.9, I10, M79.3)');
    // Codes with more than 2 digits after decimal
    expect(validateDiagnosisCode('E11.999')).toBe('Diagnosis code must be valid ICD-10 format (e.g., E11.9, I10, M79.3)');
    // Codes without letter
    expect(validateDiagnosisCode('11.9')).toBe('Diagnosis code must be valid ICD-10 format (e.g., E11.9, I10, M79.3)');
    // Codes with more than 5 digits total (without decimal)
    expect(validateDiagnosisCode('I12345')).toBe('Diagnosis code must be valid ICD-10 format (e.g., E11.9, I10, M79.3)');
  });
});

describe('validateModifier', () => {
  it('should return null for valid 2-character modifiers', () => {
    expect(validateModifier('25')).toBeNull();
    expect(validateModifier('59')).toBeNull();
    expect(validateModifier('LT')).toBeNull();
    expect(validateModifier('RT')).toBeNull();
    expect(validateModifier('A1')).toBeNull();
  });

  it('should return error for empty modifier', () => {
    expect(validateModifier('')).toBe('Modifier cannot be empty');
    expect(validateModifier('   ')).toBe('Modifier cannot be empty');
  });

  it('should return error for invalid length', () => {
    expect(validateModifier('2')).toBe('Modifier must be exactly 2 characters (e.g., 25, 59, LT, RT)');
    expect(validateModifier('259')).toBe('Modifier must be exactly 2 characters (e.g., 25, 59, LT, RT)');
  });

  it('should return error for invalid characters', () => {
    expect(validateModifier('2-')).toBe('Modifier must be exactly 2 characters (e.g., 25, 59, LT, RT)');
    expect(validateModifier('@#')).toBe('Modifier must be exactly 2 characters (e.g., 25, 59, LT, RT)');
  });
});

describe('validateDateNotInFuture', () => {
  it('should return null for past dates', () => {
    const yesterday = Date.now() - (24 * 60 * 60 * 1000);
    expect(validateDateNotInFuture(yesterday)).toBeNull();

    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    expect(validateDateNotInFuture(oneWeekAgo)).toBeNull();
  });

  it('should return null for current date', () => {
    const now = Date.now();
    expect(validateDateNotInFuture(now)).toBeNull();
  });

  it('should return null for dates up to 1 day in future (timezone tolerance)', () => {
    const tomorrow = Date.now() + (12 * 60 * 60 * 1000); // 12 hours in future
    expect(validateDateNotInFuture(tomorrow)).toBeNull();
  });

  it('should return error for dates more than 1 day in future', () => {
    const twoDaysFromNow = Date.now() + (2 * 24 * 60 * 60 * 1000);
    expect(validateDateNotInFuture(twoDaysFromNow)).toBe('Service date cannot be in the future');
  });

  it('should return error for invalid timestamps', () => {
    expect(validateDateNotInFuture(0)).toBe('Date is required');
    expect(validateDateNotInFuture(-1)).toBe('Date is required');
  });
});

describe('validateChargeAmount', () => {
  it('should return null for valid positive amounts', () => {
    expect(validateChargeAmount(100)).toBeNull();
    expect(validateChargeAmount(1000)).toBeNull();
    expect(validateChargeAmount(50000)).toBeNull();
  });

  it('should return error for zero or negative amounts', () => {
    expect(validateChargeAmount(0)).toBe('Charge amount must be greater than 0');
    expect(validateChargeAmount(-100)).toBe('Charge amount must be greater than 0');
  });

  it('should return error for invalid values', () => {
    expect(validateChargeAmount(undefined as any)).toBe('Charge amount is required');
    expect(validateChargeAmount(null as any)).toBe('Charge amount is required');
    expect(validateChargeAmount(Infinity)).toBe('Charge amount must be a valid number');
    expect(validateChargeAmount(-Infinity)).toBe('Charge amount must be a valid number');
  });
});

describe('validateUnits', () => {
  it('should return null for valid positive integers', () => {
    expect(validateUnits(1)).toBeNull();
    expect(validateUnits(2)).toBeNull();
    expect(validateUnits(10)).toBeNull();
  });

  it('should return error for zero or negative units', () => {
    expect(validateUnits(0)).toBe('Units must be greater than 0');
    expect(validateUnits(-1)).toBe('Units must be greater than 0');
  });

  it('should return error for non-integer values', () => {
    expect(validateUnits(1.5)).toBe('Units must be a whole number');
    expect(validateUnits(2.7)).toBe('Units must be a whole number');
  });

  it('should return error for invalid values', () => {
    expect(validateUnits(undefined as any)).toBe('Units are required');
    expect(validateUnits(null as any)).toBe('Units are required');
  });
});

describe('validateLineItem', () => {
  it('should return empty object for valid line item', () => {
    const validItem = {
      procedureCode: '99213',
      modifiers: ['25'],
      diagnosisCodes: ['E11.9'],
      units: 1,
      chargeAmount: 10000,
    };

    expect(validateLineItem(validItem)).toEqual({});
  });

  it('should return errors for missing procedure code', () => {
    const invalidItem = {
      procedureCode: '',
      modifiers: [],
      diagnosisCodes: ['E11.9'],
      units: 1,
      chargeAmount: 10000,
    };

    const errors = validateLineItem(invalidItem);
    expect(errors.procedureCode).toBeDefined();
  });

  it('should return errors for missing diagnosis codes', () => {
    const invalidItem = {
      procedureCode: '99213',
      modifiers: [],
      diagnosisCodes: [],
      units: 1,
      chargeAmount: 10000,
    };

    const errors = validateLineItem(invalidItem);
    expect(errors.diagnosisCodes).toBeDefined();
  });

  it('should return errors for invalid units', () => {
    const invalidItem = {
      procedureCode: '99213',
      modifiers: [],
      diagnosisCodes: ['E11.9'],
      units: 0,
      chargeAmount: 10000,
    };

    const errors = validateLineItem(invalidItem);
    expect(errors.units).toBeDefined();
  });

  it('should return errors for invalid charge amount', () => {
    const invalidItem = {
      procedureCode: '99213',
      modifiers: [],
      diagnosisCodes: ['E11.9'],
      units: 1,
      chargeAmount: 0,
    };

    const errors = validateLineItem(invalidItem);
    expect(errors.chargeAmount).toBeDefined();
  });

  it('should return errors for invalid diagnosis codes', () => {
    const invalidItem = {
      procedureCode: '99213',
      modifiers: [],
      diagnosisCodes: ['E1', 'INVALID'],
      units: 1,
      chargeAmount: 10000,
    };

    const errors = validateLineItem(invalidItem);
    expect(errors['diagnosisCodes.0']).toBeDefined();
    expect(errors['diagnosisCodes.1']).toBeDefined();
  });

  it('should return errors for invalid modifiers', () => {
    const invalidItem = {
      procedureCode: '99213',
      modifiers: ['2', 'INVALID'],
      diagnosisCodes: ['E11.9'],
      units: 1,
      chargeAmount: 10000,
    };

    const errors = validateLineItem(invalidItem);
    expect(errors['modifiers.0']).toBeDefined();
    expect(errors['modifiers.1']).toBeDefined();
  });

  it('should validate multiple diagnosis codes', () => {
    const validItem = {
      procedureCode: '99213',
      modifiers: [],
      diagnosisCodes: ['E11.9', 'I10', 'M79.3'],
      units: 1,
      chargeAmount: 10000,
    };

    expect(validateLineItem(validItem)).toEqual({});
  });
});


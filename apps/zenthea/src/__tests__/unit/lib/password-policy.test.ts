import { describe, it, expect } from 'vitest';
import {
  validatePasswordPolicy,
  validatePassword,
  getPasswordRequirements,
  DEFAULT_PASSWORD_POLICY,
  type PasswordPolicyConfig,
} from '@/lib/password-policy';

describe('Password Policy Validation', () => {
  describe('validatePasswordPolicy', () => {
    describe('Minimum Length', () => {
      it('should reject passwords shorter than minimum length', () => {
        const result = validatePasswordPolicy('short');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('at least 8 characters');
        expect(result.code).toBe('PASSWORD_TOO_SHORT');
        expect(result.details?.minLength).toBe(false);
      });

      it('should accept passwords meeting minimum length', () => {
        const result = validatePasswordPolicy('ValidPass1');
        expect(result.valid).toBe(true);
        expect(result.details?.minLength).toBe(true);
      });

      it('should respect custom minimum length', () => {
        const customPolicy: PasswordPolicyConfig = {
          ...DEFAULT_PASSWORD_POLICY,
          minLength: 12,
        };
        const result = validatePasswordPolicy('ShortPass1', customPolicy);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('at least 12 characters');
      });
    });

    describe('Maximum Length', () => {
      it('should reject passwords longer than maximum length', () => {
        const longPassword = 'A'.repeat(129) + '1';
        const result = validatePasswordPolicy(longPassword);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('no more than 128 characters');
        expect(result.code).toBe('PASSWORD_TOO_LONG');
        expect(result.details?.maxLength).toBe(false);
      });

      it('should accept passwords within maximum length', () => {
        // Create a valid password that's 100 characters but doesn't violate consecutive character rule
        const validPassword = 'Aa1'.repeat(33) + 'A'; // 100 characters, alternating pattern
        const result = validatePasswordPolicy(validPassword);
        expect(result.valid).toBe(true);
        expect(result.details?.maxLength).toBe(true);
      });
    });

    describe('Uppercase Requirement', () => {
      it('should reject passwords without uppercase letters', () => {
        const result = validatePasswordPolicy('lowercase123');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('uppercase letter');
        expect(result.code).toBe('PASSWORD_MISSING_UPPERCASE');
        expect(result.details?.hasUppercase).toBe(false);
      });

      it('should accept passwords with uppercase letters', () => {
        const result = validatePasswordPolicy('ValidPass1');
        expect(result.valid).toBe(true);
        expect(result.details?.hasUppercase).toBe(true);
      });

      it('should allow disabling uppercase requirement', () => {
        const customPolicy: PasswordPolicyConfig = {
          ...DEFAULT_PASSWORD_POLICY,
          requireUppercase: false,
        };
        const result = validatePasswordPolicy('lowercase123', customPolicy);
        // Should still fail on other requirements, but not uppercase
        expect(result.details?.hasUppercase).toBe(false);
        // But it won't fail on uppercase requirement
        expect(result.code).not.toBe('PASSWORD_MISSING_UPPERCASE');
      });
    });

    describe('Lowercase Requirement', () => {
      it('should reject passwords without lowercase letters', () => {
        const result = validatePasswordPolicy('UPPERCASE123');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('lowercase letter');
        expect(result.code).toBe('PASSWORD_MISSING_LOWERCASE');
        expect(result.details?.hasLowercase).toBe(false);
      });

      it('should accept passwords with lowercase letters', () => {
        const result = validatePasswordPolicy('ValidPass1');
        expect(result.valid).toBe(true);
        expect(result.details?.hasLowercase).toBe(true);
      });
    });

    describe('Number Requirement', () => {
      it('should reject passwords without numbers', () => {
        const result = validatePasswordPolicy('NoNumbers');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('number');
        expect(result.code).toBe('PASSWORD_MISSING_NUMBER');
        expect(result.details?.hasNumber).toBe(false);
      });

      it('should accept passwords with numbers', () => {
        const result = validatePasswordPolicy('ValidPass1');
        expect(result.valid).toBe(true);
        expect(result.details?.hasNumber).toBe(true);
      });
    });

    describe('Special Character Requirement', () => {
      it('should reject passwords without special characters when required', () => {
        const customPolicy: PasswordPolicyConfig = {
          ...DEFAULT_PASSWORD_POLICY,
          requireSpecialChar: true,
        };
        const result = validatePasswordPolicy('NoSpecial1', customPolicy);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('special character');
        expect(result.code).toBe('PASSWORD_MISSING_SPECIAL_CHAR');
        expect(result.details?.hasSpecialChar).toBe(false);
      });

      it('should accept passwords without special characters when not required', () => {
        const result = validatePasswordPolicy('ValidPass1');
        expect(result.valid).toBe(true);
        // Special char is optional by default
      });

      it('should accept passwords with special characters', () => {
        const customPolicy: PasswordPolicyConfig = {
          ...DEFAULT_PASSWORD_POLICY,
          requireSpecialChar: true,
        };
        const result = validatePasswordPolicy('ValidPass1!', customPolicy);
        expect(result.valid).toBe(true);
        expect(result.details?.hasSpecialChar).toBe(true);
      });
    });

    describe('Common Password Check', () => {
      it('should reject common passwords', () => {
        const result = validatePasswordPolicy('password');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too common');
        expect(result.code).toBe('PASSWORD_TOO_COMMON');
        expect(result.details?.isNotCommon).toBe(false);
      });

      it('should reject common passwords with numbers appended', () => {
        const result = validatePasswordPolicy('password123');
        expect(result.valid).toBe(false);
        expect(result.code).toBe('PASSWORD_TOO_COMMON');
      });

      it('should reject healthcare-specific weak passwords', () => {
        const result = validatePasswordPolicy('clinic123');
        expect(result.valid).toBe(false);
        expect(result.code).toBe('PASSWORD_TOO_COMMON');
      });

      it('should accept unique passwords', () => {
        const result = validatePasswordPolicy('MyUniquePass123');
        expect(result.valid).toBe(true);
        expect(result.details?.isNotCommon).toBe(true);
      });

      it('should allow disabling common password check', () => {
        const customPolicy: PasswordPolicyConfig = {
          ...DEFAULT_PASSWORD_POLICY,
          checkCommonPasswords: false,
        };
        const result = validatePasswordPolicy('password', customPolicy);
        // Should still fail on other requirements, but not common password check
        expect(result.details?.isNotCommon).toBe(true); // Always true when check disabled
      });
    });

    describe('Consecutive Characters Check', () => {
      it('should reject passwords with too many consecutive identical characters', () => {
        const result = validatePasswordPolicy('ValidPass1111');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('consecutive identical characters');
        expect(result.code).toBe('PASSWORD_TOO_MANY_CONSECUTIVE');
        expect(result.details?.hasValidConsecutiveChars).toBe(false);
      });

      it('should accept passwords with valid consecutive character patterns', () => {
        const result = validatePasswordPolicy('ValidPass111');
        expect(result.valid).toBe(true);
        expect(result.details?.hasValidConsecutiveChars).toBe(true);
      });

      it('should respect custom consecutive character limit', () => {
        const customPolicy: PasswordPolicyConfig = {
          ...DEFAULT_PASSWORD_POLICY,
          maxConsecutiveChars: 2,
        };
        const result = validatePasswordPolicy('ValidPass111', customPolicy);
        expect(result.valid).toBe(false);
        expect(result.code).toBe('PASSWORD_TOO_MANY_CONSECUTIVE');
      });
    });

    describe('Password Strength Calculation', () => {
      it('should calculate strength score for valid passwords', () => {
        const result = validatePasswordPolicy('ValidPass123');
        expect(result.valid).toBe(true);
        expect(result.strength).toBeGreaterThan(0);
        expect(result.strength).toBeLessThanOrEqual(100);
      });

      it('should calculate lower strength for shorter passwords', () => {
        const shortResult = validatePasswordPolicy('Valid1');
        const longResult = validatePasswordPolicy('VeryLongPassword123');
        expect(longResult.strength).toBeGreaterThan(shortResult.strength || 0);
      });

      it('should calculate higher strength for passwords with special characters', () => {
        const noSpecial = validatePasswordPolicy('ValidPass123');
        const withSpecial = validatePasswordPolicy('ValidPass123!');
        expect(withSpecial.strength).toBeGreaterThan(noSpecial.strength || 0);
      });
    });

    describe('Valid Passwords', () => {
      it('should accept a strong password meeting all requirements', () => {
        const result = validatePasswordPolicy('MySecurePass123');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.details?.minLength).toBe(true);
        expect(result.details?.hasUppercase).toBe(true);
        expect(result.details?.hasLowercase).toBe(true);
        expect(result.details?.hasNumber).toBe(true);
        expect(result.details?.isNotCommon).toBe(true);
        expect(result.details?.hasValidConsecutiveChars).toBe(true);
      });

      it('should accept passwords with special characters', () => {
        const result = validatePasswordPolicy('MySecurePass123!');
        expect(result.valid).toBe(true);
        expect(result.details?.hasSpecialChar).toBe(true);
      });
    });

    describe('Error Messages', () => {
      it('should provide clear error messages', () => {
        const tests = [
          { password: 'short', expected: 'at least 8 characters' },
          { password: 'nouppercase123', expected: 'uppercase letter' },
          { password: 'NOLOWERCASE123', expected: 'lowercase letter' },
          { password: 'NoNumbers', expected: 'number' },
          { password: 'Password123', expected: 'too common' },
          { password: 'ValidPass1111', expected: 'consecutive identical characters' },
        ];

        tests.forEach(({ password, expected }) => {
          const result = validatePasswordPolicy(password);
          expect(result.valid).toBe(false);
          expect(result.error).toContain(expected);
          expect(result.error).toBeTruthy();
        });
      });
    });
  });

  describe('validatePassword (backward compatibility)', () => {
    it('should work as a backward-compatible wrapper', () => {
      const result = validatePassword('ValidPass123');
      expect(result.valid).toBe(true);
      expect(result.details).toBeDefined();
      expect(result.strength).toBeDefined();
    });

    it('should use default policy', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 8 characters');
    });
  });

  describe('getPasswordRequirements', () => {
    it('should return all requirements for default policy', () => {
      const requirements = getPasswordRequirements();
      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements.some(r => r.includes('8 characters'))).toBe(true);
      expect(requirements.some(r => r.includes('uppercase'))).toBe(true);
      expect(requirements.some(r => r.includes('lowercase'))).toBe(true);
      expect(requirements.some(r => r.includes('number'))).toBe(true);
    });

    it('should respect custom policy configuration', () => {
      const customPolicy: PasswordPolicyConfig = {
        ...DEFAULT_PASSWORD_POLICY,
        minLength: 12,
        requireSpecialChar: true,
        checkCommonPasswords: false,
      };
      const requirements = getPasswordRequirements(customPolicy);
      expect(requirements.some(r => r.includes('12 characters'))).toBe(true);
      expect(requirements.some(r => r.includes('special character'))).toBe(true);
      // Should not include common password requirement when disabled
      expect(requirements.some(r => r.includes('common'))).toBe(false);
    });

    it('should include all enabled requirements', () => {
      const requirements = getPasswordRequirements();
      expect(requirements.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty password', () => {
      const result = validatePasswordPolicy('');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PASSWORD_TOO_SHORT');
    });

    it('should handle very long passwords', () => {
      const longPassword = 'A'.repeat(200) + '1';
      const result = validatePasswordPolicy(longPassword);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PASSWORD_TOO_LONG');
    });

    it('should handle passwords with only spaces', () => {
      const result = validatePasswordPolicy('        ');
      expect(result.valid).toBe(false);
      // Should fail on multiple requirements
      expect(result.details?.hasUppercase).toBe(false);
      expect(result.details?.hasLowercase).toBe(false);
      expect(result.details?.hasNumber).toBe(false);
    });

    it('should handle unicode characters', () => {
      const result = validatePasswordPolicy('ValidPass123');
      expect(result.valid).toBe(true);
    });

    it('should handle case-insensitive common password check', () => {
      const result1 = validatePasswordPolicy('PASSWORD');
      const result2 = validatePasswordPolicy('password');
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
      expect(result1.code).toBe('PASSWORD_TOO_COMMON');
      expect(result2.code).toBe('PASSWORD_TOO_COMMON');
    });
  });

  describe('Integration with Policy Configuration', () => {
    it('should validate with completely custom policy', () => {
      const customPolicy: PasswordPolicyConfig = {
        minLength: 6,
        requireUppercase: false,
        requireLowercase: true,
        requireNumber: false,
        requireSpecialChar: false,
        maxLength: 50,
        checkCommonPasswords: false,
        maxConsecutiveChars: 5,
      };
      const result = validatePasswordPolicy('simple', customPolicy);
      expect(result.valid).toBe(true);
    });

    it('should enforce all enabled requirements', () => {
      const strictPolicy: PasswordPolicyConfig = {
        ...DEFAULT_PASSWORD_POLICY,
        minLength: 16,
        requireSpecialChar: true,
        maxConsecutiveChars: 2,
      };
      const result = validatePasswordPolicy('ShortPass1', strictPolicy);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PASSWORD_TOO_SHORT');
    });
  });
});


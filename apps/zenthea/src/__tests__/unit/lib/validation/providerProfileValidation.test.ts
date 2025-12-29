import { describe, it, expect } from 'vitest';
import {
  validateSpecialties,
  validateLanguages,
  validateBio,
  validateDetailedBio,
  validatePhilosophyOfCare,
  validateWhyIBecameADoctor,
  formatValidationError,
} from '@/lib/validation/providerProfileValidation';

describe('providerProfileValidation', () => {
  describe('validateSpecialties', () => {
    it('should return true for valid specialties array', () => {
      expect(validateSpecialties(['Cardiology', 'Internal Medicine'])).toBe(true);
    });

    it('should return false for empty array', () => {
      expect(validateSpecialties([])).toBe(false);
    });

    it('should return false for array with empty strings', () => {
      expect(validateSpecialties(['', 'Cardiology'])).toBe(false);
    });

    it('should return false for non-array input', () => {
      expect(validateSpecialties('Cardiology' as any)).toBe(false);
    });
  });

  describe('validateLanguages', () => {
    it('should return true for valid languages array', () => {
      expect(validateLanguages(['English', 'Spanish'])).toBe(true);
    });

    it('should return false for empty array', () => {
      expect(validateLanguages([])).toBe(false);
    });

    it('should return false for array with empty strings', () => {
      expect(validateLanguages(['', 'English'])).toBe(false);
    });

    it('should return false for non-array input', () => {
      expect(validateLanguages('English' as any)).toBe(false);
    });
  });

  describe('validateBio', () => {
    it('should return true for valid bio (10-500 characters)', () => {
      expect(validateBio('This is a valid bio that meets the requirements.')).toBe(true);
    });

    it('should return false for bio shorter than 10 characters', () => {
      expect(validateBio('Short')).toBe(false);
    });

    it('should return false for bio longer than 500 characters', () => {
      const longBio = 'a'.repeat(501);
      expect(validateBio(longBio)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateBio('')).toBe(false);
    });
  });

  describe('validateDetailedBio', () => {
    it('should return true for valid detailed bio (under 5000 characters)', () => {
      const validBio = 'a'.repeat(1000);
      expect(validateDetailedBio(validBio)).toBe(true);
    });

    it('should return true for empty string (optional field)', () => {
      expect(validateDetailedBio('')).toBe(true);
    });

    it('should return false for bio longer than 5000 characters', () => {
      const longBio = 'a'.repeat(5001);
      expect(validateDetailedBio(longBio)).toBe(false);
    });
  });

  describe('validatePhilosophyOfCare', () => {
    it('should return true for valid philosophy (under 2000 characters)', () => {
      const validPhilosophy = 'a'.repeat(500);
      expect(validatePhilosophyOfCare(validPhilosophy)).toBe(true);
    });

    it('should return true for empty string (optional field)', () => {
      expect(validatePhilosophyOfCare('')).toBe(true);
    });

    it('should return false for philosophy longer than 2000 characters', () => {
      const longPhilosophy = 'a'.repeat(2001);
      expect(validatePhilosophyOfCare(longPhilosophy)).toBe(false);
    });
  });

  describe('validateWhyIBecameADoctor', () => {
    it('should return true for valid story (under 2000 characters)', () => {
      const validStory = 'a'.repeat(500);
      expect(validateWhyIBecameADoctor(validStory)).toBe(true);
    });

    it('should return true for empty string (optional field)', () => {
      expect(validateWhyIBecameADoctor('')).toBe(true);
    });

    it('should return false for story longer than 2000 characters', () => {
      const longStory = 'a'.repeat(2001);
      expect(validateWhyIBecameADoctor(longStory)).toBe(false);
    });
  });

  describe('formatValidationError', () => {
    it('should format field name correctly', () => {
      expect(formatValidationError('specialties', 'Required')).toBe('Specialties: Required');
    });

    it('should capitalize field name', () => {
      expect(formatValidationError('bio', 'Too short')).toBe('Bio: Too short');
    });

    it('should handle camelCase field names', () => {
      expect(formatValidationError('whyIBecameADoctor', 'Too long')).toBe(
        'Why I Became A Doctor: Too long'
      );
    });
  });
});


import { describe, it, expect } from 'vitest';
import {
  getPatientInitials,
  calculateAge,
} from '@/lib/utils/patientProfileHelpers';

describe('patientProfileHelpers', () => {
  describe('getPatientInitials', () => {
    it('should extract initials from patient profile', () => {
      const patientProfile = {
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = getPatientInitials(patientProfile);
      expect(result).toBe('JD');
    });

    it('should handle missing first name', () => {
      const patientProfile = {
        firstName: '',
        lastName: 'Doe',
      };

      const result = getPatientInitials(patientProfile);
      expect(result).toBe('D');
    });

    it('should handle missing last name', () => {
      const patientProfile = {
        firstName: 'John',
        lastName: '',
      };

      const result = getPatientInitials(patientProfile);
      expect(result).toBe('J');
    });

    it('should handle missing both names', () => {
      const patientProfile = {
        firstName: '',
        lastName: '',
      };

      const result = getPatientInitials(patientProfile);
      expect(result).toBe('');
    });

    it('should use fallback name when profile is null', () => {
      const fallbackName = 'John Doe';
      const result = getPatientInitials(null, fallbackName);
      expect(result).toBe('JD');
    });

    it('should use fallback name when profile is undefined', () => {
      const fallbackName = 'Jane Smith';
      const result = getPatientInitials(undefined, fallbackName);
      expect(result).toBe('JS');
    });

    it('should handle single word fallback name', () => {
      const fallbackName = 'John';
      const result = getPatientInitials(null, fallbackName);
      expect(result).toBe('J');
    });

    it('should handle empty fallback name', () => {
      const result = getPatientInitials(null, '');
      expect(result).toBe('P'); // Default fallback
    });

    it('should uppercase initials', () => {
      const patientProfile = {
        firstName: 'john',
        lastName: 'doe',
      };

      const result = getPatientInitials(patientProfile);
      expect(result).toBe('JD');
    });
  });

  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = '1990-01-01';
      const result = calculateAge(birthDate);
      
      // Age should be approximately 34-35 years old in 2024-2025
      expect(result).toBeGreaterThan(30);
      expect(result).toBeLessThan(40);
    });

    it('should handle recent birth date', () => {
      const currentYear = new Date().getFullYear();
      const birthDate = `${currentYear - 1}-01-01`;
      const result = calculateAge(birthDate);
      
      expect(result).toBe(1);
    });

    it('should handle birthday not yet occurred this year', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 25;
      const birthDate = `${birthYear}-12-31`; // Future date this year
      
      const result = calculateAge(birthDate);
      
      // Should be 24 if birthday hasn't occurred yet, 25 if it has
      expect(result).toBeGreaterThanOrEqual(24);
      expect(result).toBeLessThanOrEqual(25);
    });

    it('should return null for invalid date', () => {
      const result = calculateAge('invalid-date');
      expect(result).toBeNull();
    });

    it('should return null for null date', () => {
      const result = calculateAge(null as any);
      expect(result).toBeNull();
    });

    it('should return null for undefined date', () => {
      const result = calculateAge(undefined as any);
      expect(result).toBeNull();
    });

    it('should handle date string format', () => {
      const birthDate = '2000-06-15';
      const result = calculateAge(birthDate);
      
      // Should be approximately 24-25 years old
      expect(result).toBeGreaterThan(20);
      expect(result).toBeLessThan(30);
    });
  });
});


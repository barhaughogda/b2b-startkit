import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SPECIALTIES,
  DEFAULT_LANGUAGES,
  FIELD_LABELS,
  FIELD_PLACEHOLDERS,
  FIELD_HELP_TEXT,
  MAX_FIELD_LENGTHS,
} from '@/lib/constants/providerProfileConstants';

describe('providerProfileConstants', () => {
  describe('DEFAULT_SPECIALTIES', () => {
    it('should be an empty array', () => {
      expect(Array.isArray(DEFAULT_SPECIALTIES)).toBe(true);
      expect(DEFAULT_SPECIALTIES.length).toBe(0);
    });
  });

  describe('DEFAULT_LANGUAGES', () => {
    it('should be an empty array', () => {
      expect(Array.isArray(DEFAULT_LANGUAGES)).toBe(true);
      expect(DEFAULT_LANGUAGES.length).toBe(0);
    });
  });

  describe('FIELD_LABELS', () => {
    it('should contain labels for all required fields', () => {
      expect(FIELD_LABELS.specialties).toBeDefined();
      expect(FIELD_LABELS.languages).toBeDefined();
      expect(FIELD_LABELS.bio).toBeDefined();
    });

    it('should contain labels for optional fields', () => {
      expect(FIELD_LABELS.detailedBio).toBeDefined();
      expect(FIELD_LABELS.philosophyOfCare).toBeDefined();
      expect(FIELD_LABELS.whyIBecameADoctor).toBeDefined();
    });

    it('should have correct label text', () => {
      expect(FIELD_LABELS.specialties).toBe('Specialties');
      expect(FIELD_LABELS.languages).toBe('Languages Spoken');
      expect(FIELD_LABELS.bio).toBe('Professional Bio');
    });
  });

  describe('FIELD_PLACEHOLDERS', () => {
    it('should contain placeholders for all fields', () => {
      expect(FIELD_PLACEHOLDERS.specialties).toBeDefined();
      expect(FIELD_PLACEHOLDERS.languages).toBeDefined();
      expect(FIELD_PLACEHOLDERS.bio).toBeDefined();
    });

    it('should have helpful placeholder text', () => {
      expect(FIELD_PLACEHOLDERS.specialties).toContain('e.g.');
      expect(FIELD_PLACEHOLDERS.languages).toContain('e.g.');
    });
  });

  describe('FIELD_HELP_TEXT', () => {
    it('should contain help text for all fields', () => {
      expect(FIELD_HELP_TEXT.specialties).toBeDefined();
      expect(FIELD_HELP_TEXT.languages).toBeDefined();
      expect(FIELD_HELP_TEXT.bio).toBeDefined();
    });

    it('should provide helpful instructions', () => {
      expect(FIELD_HELP_TEXT.specialties).toContain('comma');
      expect(FIELD_HELP_TEXT.languages).toContain('language');
    });
  });

  describe('MAX_FIELD_LENGTHS', () => {
    it('should define max lengths for all text fields', () => {
      expect(MAX_FIELD_LENGTHS.bio).toBe(500);
      expect(MAX_FIELD_LENGTHS.detailedBio).toBe(5000);
      expect(MAX_FIELD_LENGTHS.philosophyOfCare).toBe(2000);
      expect(MAX_FIELD_LENGTHS.whyIBecameADoctor).toBe(2000);
    });

    it('should have reasonable max lengths', () => {
      expect(MAX_FIELD_LENGTHS.bio).toBeGreaterThan(0);
      expect(MAX_FIELD_LENGTHS.detailedBio).toBeGreaterThan(MAX_FIELD_LENGTHS.bio);
    });
  });
});


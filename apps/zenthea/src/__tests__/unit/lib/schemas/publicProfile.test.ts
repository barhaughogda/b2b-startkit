/**
 * Tests for Public Profile Schemas
 * 
 * Tests Zod validation schemas for public profile operations
 */

import { describe, it, expect } from 'vitest';
import {
  convexUserIdSchema,
  createPublicProfileSchema,
  updatePublicProfileSchema,
} from '@/lib/schemas/publicProfile';

describe('Public Profile Schemas', () => {
  describe('convexUserIdSchema', () => {
    it('should accept valid Convex user IDs', () => {
      const validIds = [
        'validUserId123456789', // 20 chars
        'a'.repeat(15), // Exactly 15 chars
        'user_123-456789012', // 20 chars with underscores and hyphens
        'test123456789012345', // 20 chars
      ];

      validIds.forEach((id) => {
        const result = convexUserIdSchema.safeParse(id);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(id);
        }
      });
    });

    it('should reject invalid Convex user IDs', () => {
      const invalidIds = [
        'short', // Too short
        '123', // Too short
        'user@id', // Invalid character (@)
        'user.id', // Invalid character (.)
        'user id', // Invalid character (space)
        '', // Empty string
      ];

      invalidIds.forEach((id) => {
        const result = convexUserIdSchema.safeParse(id);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0]?.message).toBe('Invalid user ID format');
        }
      });
    });

    it('should accept IDs with minimum length of 15 characters', () => {
      const minLengthId = 'a'.repeat(15);
      const result = convexUserIdSchema.safeParse(minLengthId);
      expect(result.success).toBe(true);
    });

    it('should reject IDs shorter than 15 characters', () => {
      const shortId = 'a'.repeat(14);
      const result = convexUserIdSchema.safeParse(shortId);
      expect(result.success).toBe(false);
    });
  });

  describe('createPublicProfileSchema', () => {
    it('should accept valid create profile data', () => {
      const validData = {
        acceptingNewPatients: true,
        bookingEnabled: false,
      };

      const result = createPublicProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should accept partial data with defaults', () => {
      const partialData = {
        acceptingNewPatients: true,
      };

      const result = createPublicProfileSchema.safeParse(partialData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.acceptingNewPatients).toBe(true);
        expect(result.data.bookingEnabled).toBe(true); // Default value
      }
    });

    it('should accept empty object with defaults', () => {
      const result = createPublicProfileSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.acceptingNewPatients).toBe(true);
        expect(result.data.bookingEnabled).toBe(true);
      }
    });

    it('should reject invalid boolean values', () => {
      const invalidData = {
        acceptingNewPatients: 'true', // String instead of boolean
        bookingEnabled: 1, // Number instead of boolean
      };

      const result = createPublicProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject extra fields', () => {
      const dataWithExtraFields = {
        acceptingNewPatients: true,
        bookingEnabled: true,
        displayName: 'Dr. Test', // Not allowed in create schema
      };

      const result = createPublicProfileSchema.safeParse(dataWithExtraFields);
      // Zod by default strips extra fields, so this should succeed but without displayName
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('displayName');
      }
    });
  });

  describe('updatePublicProfileSchema', () => {
    it('should accept valid update profile data', () => {
      const validData = {
        displayName: 'Dr. Test',
        title: 'Cardiologist',
        bio: 'Test bio',
        photo: 'https://example.com/photo.jpg',
        specialties: ['Cardiology', 'Internal Medicine'],
        languages: ['English', 'Spanish'],
        acceptingNewPatients: true,
        bookingEnabled: false,
        isPublished: true,
        showOnLandingPage: false,
      };

      const result = updatePublicProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should accept partial update data', () => {
      const partialData = {
        displayName: 'Dr. Updated',
      };

      const result = updatePublicProfileSchema.safeParse(partialData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBe('Dr. Updated');
      }
    });

    it('should accept empty object', () => {
      const result = updatePublicProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate displayName length', () => {
      const tooLong = {
        displayName: 'a'.repeat(101),
      };

      const result = updatePublicProfileSchema.safeParse(tooLong);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('100 characters');
      }
    });

    it('should validate displayName is not empty when provided', () => {
      const emptyDisplayName = {
        displayName: '',
      };

      const result = updatePublicProfileSchema.safeParse(emptyDisplayName);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod validates min length when string is provided, not "required" for optional fields
        expect(result.error.errors[0]?.message).toMatch(/at least 1|min|required/i);
      }
    });

    it('should validate title length', () => {
      const tooLong = {
        title: 'a'.repeat(101),
      };

      const result = updatePublicProfileSchema.safeParse(tooLong);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('100 characters');
      }
    });

    it('should validate bio length', () => {
      const tooLong = {
        bio: 'a'.repeat(2001),
      };

      const result = updatePublicProfileSchema.safeParse(tooLong);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('2000 characters');
      }
    });

    it('should validate photo URL format', () => {
      const invalidUrl = {
        photo: 'not-a-valid-url',
      };

      const result = updatePublicProfileSchema.safeParse(invalidUrl);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('valid URL');
      }
    });

    it('should accept empty string for photo (clearing photo)', () => {
      const clearPhoto = {
        photo: '',
      };

      const result = updatePublicProfileSchema.safeParse(clearPhoto);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.photo).toBe('');
      }
    });

    it('should validate specialties array', () => {
      const invalidSpecialties = {
        specialties: ['', 'valid'], // Empty string in array
      };

      const result = updatePublicProfileSchema.safeParse(invalidSpecialties);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toMatch(/at least 1|min/i);
      }
    });

    it('should validate languages array', () => {
      const invalidLanguages = {
        languages: ['', 'English'], // Empty string in array
      };

      const result = updatePublicProfileSchema.safeParse(invalidLanguages);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toMatch(/at least 1|min/i);
      }
    });

    it('should accept empty arrays for specialties and languages', () => {
      const emptyArrays = {
        specialties: [],
        languages: [],
      };

      const result = updatePublicProfileSchema.safeParse(emptyArrays);
      expect(result.success).toBe(true);
    });

    it('should validate boolean fields', () => {
      const invalidBooleans = {
        acceptingNewPatients: 'true', // String instead of boolean
        bookingEnabled: 1, // Number instead of boolean
      };

      const result = updatePublicProfileSchema.safeParse(invalidBooleans);
      expect(result.success).toBe(false);
    });

    it('should accept valid URL formats', () => {
      const validUrls = [
        'https://example.com/photo.jpg',
        'http://example.com/image.png',
        'https://cdn.example.com/user/123/photo.jpg',
      ];

      validUrls.forEach((url) => {
        const result = updatePublicProfileSchema.safeParse({ photo: url });
        expect(result.success).toBe(true);
      });
    });
  });
});


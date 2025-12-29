/**
 * Provider Profile Visibility System Tests
 */

import { describe, it, expect } from 'vitest';
import {
  getDefaultVisibilitySettings,
  isFieldVisible,
  filterProfileByVisibility,
  calculateCompletionPercentage,
  getVisibilityLabel,
  getVisibilityDescription
} from '@/lib/profileVisibility';
import { ProviderProfile } from '@/types';

describe('Profile Visibility System', () => {
  describe('getDefaultVisibilitySettings', () => {
    it('should return default visibility settings', () => {
      const defaults = getDefaultVisibilitySettings();
      
      expect(defaults.npi).toBe('private');
      expect(defaults.licenseNumber).toBe('private');
      expect(defaults.specialties).toBe('public');
      expect(defaults.bio).toBe('public');
      expect(defaults.detailedBio).toBe('portal');
      expect(defaults.philosophyOfCare).toBe('portal');
      expect(defaults.professionalPhoto).toBe('public');
      expect(defaults.introductionVideo).toBe('portal');
    });
  });

  describe('isFieldVisible', () => {
    const visibility = getDefaultVisibilitySettings();

    it('should allow admins to see all fields', () => {
      expect(isFieldVisible('npi', visibility, 'admin')).toBe(true);
      expect(isFieldVisible('bio', visibility, 'admin')).toBe(true);
    });

    it('should allow providers to see all fields', () => {
      expect(isFieldVisible('npi', visibility, 'provider')).toBe(true);
      expect(isFieldVisible('bio', visibility, 'provider')).toBe(true);
    });

    it('should restrict public viewers to public fields only', () => {
      expect(isFieldVisible('specialties', visibility, 'public')).toBe(true);
      expect(isFieldVisible('bio', visibility, 'public')).toBe(true);
      expect(isFieldVisible('detailedBio', visibility, 'public')).toBe(false);
      expect(isFieldVisible('npi', visibility, 'public')).toBe(false);
    });

    it('should allow patient viewers to see public and portal fields', () => {
      expect(isFieldVisible('specialties', visibility, 'patient')).toBe(true);
      expect(isFieldVisible('bio', visibility, 'patient')).toBe(true);
      expect(isFieldVisible('detailedBio', visibility, 'patient')).toBe(true);
      expect(isFieldVisible('philosophyOfCare', visibility, 'patient')).toBe(true);
      expect(isFieldVisible('npi', visibility, 'patient')).toBe(false);
    });
  });

  describe('filterProfileByVisibility', () => {
    const mockProfile: Partial<ProviderProfile> = {
      _id: 'test-id',
      userId: 'user-id',
      tenantId: 'tenant-id',
      specialties: ['Internal Medicine'],
      languages: ['English', 'Spanish'],
      bio: 'Public bio',
      detailedBio: 'Portal-only detailed bio',
      philosophyOfCare: 'Portal-only philosophy',
      npi: '1234567890',
      visibility: getDefaultVisibilitySettings(),
      completionPercentage: 50,
      isVerified: false,
      isPublished: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    it('should filter profile for public viewers', () => {
      const filtered = filterProfileByVisibility(mockProfile as ProviderProfile, 'public');
      
      expect(filtered.bio).toBe('Public bio');
      expect(filtered.detailedBio).toBeUndefined();
      expect(filtered.philosophyOfCare).toBeUndefined();
      expect(filtered.npi).toBeUndefined();
      expect(filtered.specialties).toEqual(['Internal Medicine']);
    });

    it('should filter profile for patient viewers', () => {
      const filtered = filterProfileByVisibility(mockProfile as ProviderProfile, 'patient');
      
      expect(filtered.bio).toBe('Public bio');
      expect(filtered.detailedBio).toBe('Portal-only detailed bio');
      expect(filtered.philosophyOfCare).toBe('Portal-only philosophy');
      expect(filtered.npi).toBeUndefined();
    });

    it('should not filter for admin viewers', () => {
      const filtered = filterProfileByVisibility(mockProfile as ProviderProfile, 'admin');
      
      expect(filtered.bio).toBe('Public bio');
      expect(filtered.detailedBio).toBe('Portal-only detailed bio');
      expect(filtered.npi).toBe('1234567890');
    });
  });

  describe('calculateCompletionPercentage', () => {
    it('should calculate completion for minimal profile', () => {
      const profile: Partial<ProviderProfile> = {
        specialties: ['Internal Medicine'],
        bio: 'Test bio',
        professionalPhotoUrl: 'https://example.com/photo.jpg',
        visibility: getDefaultVisibilitySettings()
      };
      
      const percentage = calculateCompletionPercentage(profile);
      expect(percentage).toBeGreaterThan(0);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    it('should calculate higher completion for complete profile', () => {
      const profile: Partial<ProviderProfile> = {
        specialties: ['Internal Medicine', 'Cardiology'],
        bio: 'Test bio',
        detailedBio: 'Detailed bio',
        philosophyOfCare: 'Philosophy',
        professionalPhotoUrl: 'https://example.com/photo.jpg',
        boardCertifications: [],
        education: [],
        languages: ['English', 'Spanish'],
        hospitalAffiliations: [],
        insuranceAccepted: ['Blue Cross'],
        conditionsTreated: ['Diabetes'],
        introductionVideoUrl: 'https://youtube.com/video',
        visibility: getDefaultVisibilitySettings()
      };
      
      const percentage = calculateCompletionPercentage(profile);
      expect(percentage).toBeGreaterThan(60);
    });
  });

  describe('getVisibilityLabel', () => {
    it('should return correct labels', () => {
      expect(getVisibilityLabel('public')).toBe('Public Website');
      expect(getVisibilityLabel('portal')).toBe('Patient Portal');
      expect(getVisibilityLabel('private')).toBe('Private (Admin Only)');
    });
  });

  describe('getVisibilityDescription', () => {
    it('should return correct descriptions', () => {
      expect(getVisibilityDescription('public')).toContain('public website');
      expect(getVisibilityDescription('portal')).toContain('patients logged');
      expect(getVisibilityDescription('private')).toContain('administrators');
    });
  });
});


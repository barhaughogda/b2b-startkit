/**
 * Zod Schemas for Provider Profile
 * 
 * Provides type-safe validation for provider profile data
 */

import { z } from 'zod';

// Visibility settings schema
export const visibilitySettingsSchema = z.object({
  npi: z.enum(['public', 'portal', 'private']),
  licenseNumber: z.enum(['public', 'portal', 'private']),
  specialties: z.enum(['public', 'portal', 'private']),
  boardCertifications: z.enum(['public', 'portal', 'private']),
  education: z.enum(['public', 'portal', 'private']),
  certifications: z.enum(['public', 'portal', 'private']),
  bio: z.enum(['public', 'portal', 'private']),
  detailedBio: z.enum(['public', 'portal', 'private']),
  philosophyOfCare: z.enum(['public', 'portal', 'private']),
  communicationStyle: z.enum(['public', 'portal', 'private']),
  whyIBecameADoctor: z.enum(['public', 'portal', 'private']),
  languages: z.enum(['public', 'portal', 'private']),
  personalInterests: z.enum(['public', 'portal', 'private']),
  communityInvolvement: z.enum(['public', 'portal', 'private']),
  professionalPhoto: z.enum(['public', 'portal', 'private']),
  introductionVideo: z.enum(['public', 'portal', 'private']),
  hospitalAffiliations: z.enum(['public', 'portal', 'private']),
  insuranceAccepted: z.enum(['public', 'portal', 'private']),
  conditionsTreated: z.enum(['public', 'portal', 'private']),
  proceduresPerformed: z.enum(['public', 'portal', 'private']),
  researchInterests: z.enum(['public', 'portal', 'private']),
  publications: z.enum(['public', 'portal', 'private']),
  testimonials: z.enum(['public', 'portal', 'private']),
});

// Provider profile schema
export const providerProfileSchema = z.object({
  // Basic Identity fields
  title: z.enum(['Dr.', 'Mr.', 'Ms.', 'Mrs.', 'Prof.']).optional(),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name must be less than 100 characters'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name must be less than 100 characters'),
  email: z.string().email('Valid email address is required').max(255, 'Email must be less than 255 characters'),
  phone: z.string()
    .max(20, 'Phone number must be less than 20 characters')
    .refine((val) => {
      // Allow empty strings (for clearing the field)
      if (!val || val.trim() === '') return true;
      
      // Extract digits only for validation (E.164 format: 10-15 digits)
      const digits = val.replace(/\D/g, '');
      
      // Must contain 10-15 digits (E.164 international format)
      if (digits.length < 10 || digits.length > 15) return false;
      
      // Must match phone format (allows formatting characters)
      return /^\+?[\d\s\-\(\)]+$/.test(val);
    }, {
      message: 'Phone number must contain 10-15 digits',
    }),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']).optional(),
  dateOfBirth: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const dateObj = new Date(date);
      const minDate = new Date('1900-01-01');
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      return dateObj >= minDate && dateObj <= today;
    }, 'Date of birth must be between 1900 and today'), // ISO date string
  
  // Professional Identity fields
  specialties: z.array(z.string().min(1)).min(1, 'At least one specialty is required'),
  languages: z.array(z.string().min(1)).min(1, 'At least one language is required'),
  bio: z.string().min(10, 'Bio must be at least 10 characters').max(500, 'Bio must be less than 500 characters'),
  
  // Provider credentials (optional - available to all clinic users)
  npi: z.string().regex(/^\d{10}$/, 'NPI must be exactly 10 digits').optional().or(z.literal('')),
  licenseNumber: z.string().optional(),
  licenseState: z.string().max(2, 'License state must be 2 characters').optional(),
  
  // Optional detailed fields
  detailedBio: z.string().max(5000, 'Detailed bio must be less than 5000 characters').optional(),
  philosophyOfCare: z.string().max(2000, 'Philosophy of care must be less than 2000 characters').optional(),
  communicationStyle: z.string().max(1000, 'Communication style must be less than 1000 characters').optional(),
  whyIBecameADoctor: z.string().max(2000, 'Story must be less than 2000 characters').optional(),
  
  // Practice information
  conditionsTreated: z.array(z.string()).optional(),
  proceduresPerformed: z.array(z.string()).optional(),
  hospitalAffiliations: z.array(z.string()).optional(),
  insuranceAccepted: z.array(z.string()).optional(),
  
  // Media
  professionalPhotoUrl: z.string().url('Must be a valid URL').optional(),
  introductionVideoUrl: z.string().url('Must be a valid URL').optional(),
  
  // Credentials (arrays of objects - simplified for now)
  boardCertifications: z.array(z.unknown()).optional(),
  education: z.array(z.unknown()).optional(),
  certifications: z.array(z.unknown()).optional(),
  publications: z.array(z.unknown()).optional(),
  
  // Personal
  personalInterests: z.array(z.string()).optional(),
  communityInvolvement: z.string().max(1000).optional(),
  researchInterests: z.array(z.string()).optional(),
  
  // Visibility settings
  visibility: visibilitySettingsSchema.optional(),
  
  // System fields (not editable by user)
  isPublished: z.boolean().optional(),
  completionPercentage: z.number().optional(),
});

// Partial schema for updates (all fields optional)
export const providerProfileUpdateSchema = providerProfileSchema.partial();

// Type exports
export type ProviderProfileFormData = z.infer<typeof providerProfileSchema>;
export type ProviderProfileUpdateData = z.infer<typeof providerProfileUpdateSchema>;
export type VisibilitySettings = z.infer<typeof visibilitySettingsSchema>;


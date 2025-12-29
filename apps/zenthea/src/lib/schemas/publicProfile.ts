/**
 * Zod Schemas for Public Profile
 * 
 * Provides type-safe validation for public profile data
 */

import { z } from 'zod';

/**
 * Schema for validating Convex user IDs
 * Convex IDs are base64url-encoded strings (typically 15-30 characters)
 */
export const convexUserIdSchema = z.string().regex(
  /^[a-zA-Z0-9_-]{15,}$/,
  'Invalid user ID format'
);

/**
 * Schema for creating a public profile
 */
export const createPublicProfileSchema = z.object({
  acceptingNewPatients: z.boolean().optional().default(true),
  bookingEnabled: z.boolean().optional().default(true),
});

/**
 * Schema for updating a public profile
 */
export const updatePublicProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100, 'Display name must be less than 100 characters').optional(),
  title: z.string().max(100, 'Title must be less than 100 characters').optional(),
  bio: z.string().max(2000, 'Bio must be less than 2000 characters').optional(),
  photo: z.string().url('Photo must be a valid URL').optional().or(z.literal('')),
  specialties: z.array(z.string().min(1)).optional(),
  languages: z.array(z.string().min(1)).optional(),
  acceptingNewPatients: z.boolean().optional(),
  bookingEnabled: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  showOnLandingPage: z.boolean().optional(),
});

/**
 * Type exports
 */
export type CreatePublicProfileInput = z.infer<typeof createPublicProfileSchema>;
export type UpdatePublicProfileInput = z.infer<typeof updatePublicProfileSchema>;


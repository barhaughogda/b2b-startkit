/**
 * Zod Schemas for Tenant Creation
 * 
 * Provides type-safe validation for tenant creation data
 */

import { z } from 'zod';

// Address schema
export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  country: z.string().min(1, 'Country is required'),
});

// Contact info schema
export const contactInfoSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email format'),
  address: addressSchema,
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
});

// Subscription schema
export const subscriptionSchema = z.object({
  plan: z.enum(['demo', 'basic', 'premium', 'enterprise']).optional(),
  maxUsers: z.number().min(1, 'Max users must be at least 1').max(10000, 'Max users cannot exceed 10,000').optional(),
  maxPatients: z.number().min(1, 'Max patients must be at least 1').max(100000, 'Max patients cannot exceed 100,000').optional(),
});

// Branding schema
export const brandingSchema = z.object({
  logo: z.string().url('Invalid logo URL').optional().or(z.literal('')).optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Primary color must be a valid hex color').optional(),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Secondary color must be a valid hex color').optional(),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Accent color must be a valid hex color').optional(),
  customDomain: z.string().min(1, 'Custom domain cannot be empty').optional().or(z.literal('')).optional(),
  favicon: z.string().url('Invalid favicon URL').optional().or(z.literal('')).optional(),
  customCss: z.string().optional(),
});

// Tenant creation schema
export const createTenantSchema = z.object({
  id: z.string()
    .min(1, 'Tenant ID is required')
    .max(50, 'Tenant ID cannot exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Tenant ID can only contain lowercase letters, numbers, and hyphens'),
  name: z.string().min(1, 'Tenant name is required').max(255, 'Tenant name cannot exceed 255 characters'),
  type: z.enum(['clinic', 'hospital', 'practice', 'group'], {
    errorMap: () => ({ message: 'Valid tenant type is required (clinic, hospital, practice, group)' }),
  }),
  contactInfo: contactInfoSchema,
  subscription: subscriptionSchema.optional(),
  branding: brandingSchema.optional(),
});

export type CreateTenantData = z.infer<typeof createTenantSchema>;
export type AddressData = z.infer<typeof addressSchema>;
export type ContactInfoData = z.infer<typeof contactInfoSchema>;
export type SubscriptionData = z.infer<typeof subscriptionSchema>;
export type BrandingData = z.infer<typeof brandingSchema>;


/**
 * Shared constants for provider profile field filtering
 * 
 * These constants define which fields belong to the users table vs providerProfiles table.
 * They are used by both client-side and server-side code to ensure consistent filtering.
 * 
 * IMPORTANT: When updating these lists, update both:
 * - Client-side: src/lib/utils/providerProfileHelpers.ts
 * - Server-side: convex/providerProfiles.ts
 */

/**
 * Fields that belong to the users table, not providerProfiles table
 * These should be filtered out before saving to providerProfiles
 * 
 * NOTE: title and gender are stored in providerProfiles, not users table
 */
export const USER_IDENTITY_FIELDS = [
  'dateOfBirth',
  'firstName',
  'lastName',
  'phone',
  'email',
] as const;

/**
 * System-managed fields that should not be updated via form data
 */
export const SYSTEM_MANAGED_FIELDS = [
  'userId',
  'providerId',
  'tenantId',
  'createdAt',
  'updatedAt',
] as const;

/**
 * All fields that should be filtered out from providerProfiles updates
 * Combines user identity fields and system-managed fields
 */
export const INVALID_PROVIDER_PROFILE_FIELDS = [
  ...USER_IDENTITY_FIELDS,
  ...SYSTEM_MANAGED_FIELDS,
] as const;

/**
 * Type helper for field names
 */
export type UserIdentityField = typeof USER_IDENTITY_FIELDS[number];
export type SystemManagedField = typeof SYSTEM_MANAGED_FIELDS[number];
export type InvalidProviderProfileField = typeof INVALID_PROVIDER_PROFILE_FIELDS[number];


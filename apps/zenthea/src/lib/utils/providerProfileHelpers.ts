/**
 * Utility functions for provider profile operations
 */

import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';
import { USER_IDENTITY_FIELDS, SYSTEM_MANAGED_FIELDS } from '@/lib/constants/providerProfileFields';

/**
 * Filter out user identity fields and system-managed fields from profile update data
 * These fields don't belong in the providerProfiles table schema
 * 
 * @param data - Raw form data that may contain invalid fields
 * @returns Filtered data with only valid providerProfiles fields
 */
export function filterProviderProfileFields(
  data: ProviderProfileUpdateData
): Partial<ProviderProfileUpdateData> {
  const filtered = { ...data };
  
  // Remove user identity fields (belong in users table)
  for (const field of USER_IDENTITY_FIELDS) {
    delete filtered[field as keyof typeof filtered];
  }
  
  // Remove system-managed fields
  for (const field of SYSTEM_MANAGED_FIELDS) {
    delete filtered[field as keyof typeof filtered];
  }
  
  return filtered;
}


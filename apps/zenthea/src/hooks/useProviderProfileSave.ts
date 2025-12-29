/**
 * Custom hook for saving provider profile
 * 
 * Handles both creating new profiles and updating existing ones
 * with proper error handling and loading states.
 * 
 * Partial Save Behavior:
 * This hook implements a partial save strategy for better user experience:
 * - User identity fields (firstName, lastName, phone, email, dateOfBirth) are saved to the users table
 * - Provider profile fields are saved to the providerProfiles table
 * - If user update fails with a validation error, the entire save operation fails (fail-fast)
 * - If user update fails with a network/temporary error, the profile update still proceeds (partial save)
 * - If profile update fails, the entire operation fails (critical error)
 * 
 * This design allows transient network issues to not block profile updates while ensuring
 * data integrity for validation errors.
 */

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { getDefaultVisibilitySettings } from '@/lib/profileVisibility';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';
import type { ProviderProfile } from '@/types';
import { filterProviderProfileFields } from '@/lib/utils/providerProfileHelpers';
import { logger } from '@/lib/logger';

interface UseProviderProfileSaveOptions {
  session: {
    user: {
      id: string;
      tenantId: string;
    };
  } | null;
  existingProfile: Partial<ProviderProfile> & { _id?: Id<'providerProfiles'> } | null;
  onSave?: () => void;
}

interface UseProviderProfileSaveReturn {
  saveProfile: (data: ProviderProfileUpdateData) => Promise<void>;
  isSaving: boolean;
}

export function useProviderProfileSave(
  options: UseProviderProfileSaveOptions
): UseProviderProfileSaveReturn {
  const { session, existingProfile, onSave } = options;
  const [isSaving, setIsSaving] = useState(false);

  const updateProfile = useMutation(api.providerProfiles.updateProviderProfile);
  const createProfile = useMutation(api.providerProfiles.createProviderProfile);
  const updateUserMutation = useMutation(api.users.updateUserMutation);

  const saveProfile = async (data: ProviderProfileUpdateData) => {
    if (!session?.user?.id || !session?.user?.tenantId) {
      toast.error('You must be logged in to save your profile');
      return;
    }

    logger.debug('[Profile Save] Starting save with data:', {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      dateOfBirth: data.dateOfBirth,
      title: data.title,
      gender: data.gender,
      userId: session.user.id,
      tenantId: session.user.tenantId,
    });

    setIsSaving(true);

    let userUpdateErrorMessage: string | null = null;
    let profileUpdateErrorMessage: string | null = null;

    try {
      // Extract user identity fields that belong in the users table
      // Use type-safe builder pattern to construct update object
      type UserUpdateFields = {
        firstName?: string;
        lastName?: string;
        phone?: string;
        email?: string;
        dateOfBirth?: string;
        name?: string;
      };

      const userUpdates: UserUpdateFields = {};

      // Include fields if they exist in the data (including empty strings)
      // This allows updating fields even if they're being cleared
      if (data.firstName !== undefined) {
        userUpdates.firstName = data.firstName;
      }
      if (data.lastName !== undefined) {
        userUpdates.lastName = data.lastName;
      }
      if (data.phone !== undefined) {
        userUpdates.phone = data.phone;
      }
      if (data.email !== undefined) {
        userUpdates.email = data.email;
      }
      if (data.dateOfBirth !== undefined) {
        userUpdates.dateOfBirth = data.dateOfBirth;
      }
      
      // Update name if firstName, lastName, or title changed
      // Always rebuild the name when any of these fields are present in the update
      // This ensures the name includes the title when available
      if (data.firstName !== undefined || data.lastName !== undefined || data.title !== undefined) {
        // Get title from form data or existing profile
        const title = data.title !== undefined 
          ? data.title 
          : (existingProfile?.title as 'Dr.' | 'Mr.' | 'Ms.' | 'Mrs.' | 'Prof.' | undefined);
        
        // Get firstName and lastName from form data (they should always be present)
        // Fallback to empty string if not provided (shouldn't happen in normal flow)
        const firstName = data.firstName !== undefined ? data.firstName : '';
        const lastName = data.lastName !== undefined ? data.lastName : '';
        
        // Build name with title prefix if available
        const nameParts: string[] = [];
        if (title) {
          nameParts.push(title);
        }
        if (firstName) {
          nameParts.push(firstName);
        }
        if (lastName) {
          nameParts.push(lastName);
        }
        userUpdates.name = nameParts.filter(Boolean).join(' ').trim();
      }

      // Save user identity fields to users table
      if (Object.keys(userUpdates).length > 0) {
        // Use updateUserMutation which now supports all user identity fields
        // Type-safe construction using spread operator with conditional properties
        const userUpdateData: {
          name?: string;
          email?: string;
          firstName?: string;
          lastName?: string;
          phone?: string;
          dateOfBirth?: string;
        } = {
          ...(userUpdates.name && { name: userUpdates.name }),
          ...(userUpdates.email && { email: userUpdates.email }),
          ...(userUpdates.firstName && { firstName: userUpdates.firstName }),
          ...(userUpdates.lastName && { lastName: userUpdates.lastName }),
          ...(userUpdates.phone && { phone: userUpdates.phone }),
          ...(userUpdates.dateOfBirth && { dateOfBirth: userUpdates.dateOfBirth }),
        };

        if (Object.keys(userUpdateData).length > 0) {
          try {
            logger.debug('[Profile Save] Updating user fields:', userUpdateData);
            await updateUserMutation({
              id: session.user.id as Id<'users'>,
              ...userUpdateData,
            });
            logger.debug('[Profile Save] User fields updated successfully');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Check if this is a validation error that should prevent save
            // Validation errors indicate data issues that won't resolve on retry
            const isValidationError = 
              errorMessage.includes('Validation') ||
              errorMessage.includes('Invalid') ||
              errorMessage.includes('required') ||
              errorMessage.includes('must be');
            
            if (isValidationError) {
              // Fail fast for validation errors - these indicate data problems
              logger.error('[Profile Save] Validation error in user update:', error);
              throw error;
            }
            
            // For network/temporary errors, continue to attempt profile update
            // This allows partial saves for transient failures
            userUpdateErrorMessage = errorMessage;
            logger.error('[Profile Save] Failed to update user identity fields (non-validation error):', error);
            logger.debug('[Profile Save] Error details:', {
              error,
              userUpdateData,
              userId: session.user.id,
            });
          }
        } else {
          logger.debug('[Profile Save] No user fields to update');
        }
      }

      // Filter out fields that don't belong in providerProfiles schema
      const filteredUpdates = filterProviderProfileFields(data);

      try {
        if (existingProfile?._id) {
          // Update existing profile
          await updateProfile({
            profileId: existingProfile._id as Id<'providerProfiles'>,
            userId: session.user.id as Id<'users'>,
            tenantId: session.user.tenantId,
            updates: filteredUpdates,
          });
        } else {
          // Create new profile with minimal required fields
          const newProfileId = await createProfile({
            userId: session.user.id as Id<'users'>,
            tenantId: session.user.tenantId,
            specialties: data.specialties || [],
            languages: data.languages || [],
            visibility: data.visibility || getDefaultVisibilitySettings(),
          });
          
          // Immediately update with all other fields if there are any
          if (Object.keys(filteredUpdates).length > 0) {
            await updateProfile({
              profileId: newProfileId,
              userId: session.user.id as Id<'users'>,
              tenantId: session.user.tenantId,
              updates: filteredUpdates,
            });
          }
        }
      } catch (error) {
        profileUpdateErrorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to update provider profile:', error);
        // Re-throw profile update errors as they're critical
        throw error;
      }

      // Report success or partial success
      if (userUpdateErrorMessage && !profileUpdateErrorMessage) {
        toast.warning('Profile saved, but some user information could not be updated. Please try again.');
        logger.warn('Partial save: Profile updated but user identity fields failed:', userUpdateErrorMessage);
      } else if (!userUpdateErrorMessage && !profileUpdateErrorMessage) {
        toast.success('Profile saved successfully!');
      }

      onSave?.();
    } catch (error) {
      // Handle critical errors (profile update failures)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile';
      
      // Provide more specific error messages
      if (profileUpdateErrorMessage) {
        toast.error(`Failed to save profile: ${profileUpdateErrorMessage}`);
      } else if (userUpdateErrorMessage) {
        toast.error(`Failed to update user information: ${userUpdateErrorMessage}`);
      } else {
        toast.error(errorMessage);
      }
      
      logger.error('Profile save error:', error);
      // Re-throw to allow caller to handle if needed
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveProfile,
    isSaving,
  };
}


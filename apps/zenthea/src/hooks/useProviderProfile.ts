/**
 * Provider Profile Hook
 * 
 * React hook for managing provider profile data with appointment and messaging integration
 */

import { useQuery, useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ProviderProfile } from '@/types';
import { filterProfileByVisibility } from '@/lib/profileVisibility';
import { canUseConvexQuery } from '@/lib/convexIdValidation';
import { isClinicUser } from '@/lib/auth-utils';

export function useProviderProfile(profileId?: string) {
  const { data: session } = useSession();
  
  // Check if we can use Convex queries (user ID must be valid Convex ID, not demo ID)
  const canQueryByUserId = canUseConvexQuery(session?.user?.id, session?.user?.tenantId);
  
  // Get profile by user ID (for provider editing their own profile)
  const profileData = useQuery(
    api.providerProfiles.getProviderProfileByUserId,
    canQueryByUserId
      ? {
          userId: session!.user!.id as Id<'users'>,
          tenantId: session!.user!.tenantId!
        }
      : 'skip'
  );
  
  // Check if profileId is valid Convex ID
  const canQueryByProfileId = profileId && 
    canUseConvexQuery(profileId, session?.user?.tenantId);
  
  // Get specific profile by ID (for viewing)
  const specificProfile = useQuery(
    api.providerProfiles.getProviderProfile,
    canQueryByProfileId
      ? {
          profileId: profileId as Id<'providerProfiles'>,
          viewerRole: isClinicUser(session!.user!) ? (session!.user!.role === 'admin' ? 'admin' : 'provider') : 'patient',
          tenantId: session!.user!.tenantId!
        }
      : 'skip'
  );
  
  const updateProfile = useMutation(api.providerProfiles.updateProviderProfile);
  const createProfile = useMutation(api.providerProfiles.createProviderProfile);
  
  const profile = profileId ? specificProfile : profileData;
  
  return {
    profile: profile as ProviderProfile | null | undefined,
    isLoading: profile === undefined,
    isDemoMode: !canQueryByUserId, // Indicate if we're in demo mode
    updateProfile: async (updates: Partial<ProviderProfile>) => {
      if (!session?.user?.id || !session?.user?.tenantId) {
        throw new Error('Not authenticated');
      }
      
      // In demo mode, don't try to update Convex
      if (!canUseConvexQuery(session.user.id, session.user.tenantId)) {
        throw new Error('Cannot update profile in demo mode. Please use a real Convex account.');
      }
      
      if (profile?._id) {
        return await updateProfile({
          profileId: profile._id as Id<'providerProfiles'>,
          userId: session.user.id as Id<'users'>,
          tenantId: session.user.tenantId,
          updates
        });
      } else {
        return await createProfile({
          userId: session.user.id as Id<'users'>,
          tenantId: session.user.tenantId,
          specialties: updates.specialties || [],
          languages: updates.languages || [],
          visibility: updates.visibility
        });
      }
    }
  };
}

/**
 * Hook for getting provider profile with appointment scheduling integration
 */
export function useProviderProfileWithScheduling(providerId: string) {
  const { profile, isLoading } = useProviderProfile(providerId);
  const { data: session } = useSession();
  
  const scheduleAppointment = (providerId: string) => {
    // Navigate to appointment booking with provider pre-selected
    if (typeof window !== 'undefined') {
      window.location.href = `/patient/appointments?providerId=${providerId}`;
    }
  };
  
  return {
    profile,
    isLoading,
    scheduleAppointment: () => scheduleAppointment(providerId),
    canSchedule: !!session && session.user.role === 'patient'
  };
}

/**
 * Hook for getting provider profile with messaging integration
 */
export function useProviderProfileWithMessaging(providerId: string) {
  const { profile, isLoading } = useProviderProfile(providerId);
  const { data: session } = useSession();
  
  const sendMessage = (providerId: string) => {
    // Navigate to messaging with provider pre-selected
    if (typeof window !== 'undefined') {
      window.location.href = `/patient/messages?providerId=${providerId}`;
    }
  };
  
  return {
    profile,
    isLoading,
    sendMessage: () => sendMessage(providerId),
    canMessage: !!session && session.user.role === 'patient'
  };
}


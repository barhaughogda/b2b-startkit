/**
 * Provider Profile Hook
 * 
 * React hook for managing provider profile data with appointment and messaging integration
 */

import useSWR from 'swr';
import { useZentheaSession } from './useZentheaSession';
import { ProviderProfile } from '@/types';

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch provider profile');
  }
  return res.json();
});

export function useProviderProfile(profileId?: string) {
  const { data: session } = useZentheaSession();
  
  // Use SWR to fetch profile data from the new API
  // If profileId is provided, we might need a different endpoint, but for now 
  // let's assume the API handles the current user's profile.
  const { data, error, isLoading, mutate } = useSWR(
    session ? `/api/provider/profile${profileId ? `?id=${profileId}` : ''}` : null,
    fetcher
  );
  
  const updateProfile = async (updates: Partial<ProviderProfile>) => {
    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch('/api/provider/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update profile');
    }
    
    const result = await response.json();
    await mutate();
    return result.provider;
  };

  return {
    profile: data?.provider as ProviderProfile | null | undefined,
    isLoading,
    isDemoMode: false,
    updateProfile,
    refreshProfile: mutate,
  };
}

/**
 * Hook for getting provider profile with appointment scheduling integration
 */
export function useProviderProfileWithScheduling(providerId: string) {
  const { profile, isLoading } = useProviderProfile(providerId);
  const { data: session } = useZentheaSession();
  
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
  const { data: session } = useZentheaSession();
  
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


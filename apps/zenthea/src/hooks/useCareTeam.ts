/**
 * Care Team Hook
 * 
 * React hook for fetching a patient's care team (providers they have appointments with)
 * Includes primary provider information for prominent display
 */

import useSWR from 'swr';
import { useZentheaSession } from './useZentheaSession';

export interface CareTeamMember {
  id: string;
  userId: string;
  name: string;
  role: string;
  specialty?: string;
  professionalPhotoUrl?: string;
  status: 'available' | 'away' | 'offline';
  isPrimaryProvider?: boolean;
  source?: 'explicit' | 'medical_record' | 'appointment';
}

export interface PrimaryProviderInfo {
  userId: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch care team');
  }
  return res.json();
})

export function useCareTeam(patientId?: string) {
  const { data: session } = useZentheaSession();
  
  const { data, error, isLoading } = useSWR(
    session && patientId ? `/api/patients/${patientId}/care-team` : null,
    fetcher
  );

  const careTeam: CareTeamMember[] = (data?.members || []).map((m: any) => ({
    id: m.userId,
    userId: m.userId,
    name: m.name,
    role: m.role,
    professionalPhotoUrl: m.avatar,
    status: 'available',
    isPrimaryProvider: m.userId === data?.primaryProvider?.userId,
    source: m.source,
  }));

  return {
    careTeam,
    primaryProvider: data?.primaryProvider,
    hasPrimaryProvider: !!data?.primaryProvider,
    isLoading,
    error,
  };
}


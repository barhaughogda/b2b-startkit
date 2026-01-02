import useSWR from 'swr';
import { useZentheaSession } from './useZentheaSession';

export interface UsePatientProfileDataReturn {
  patientId: string | null | undefined;
  patientProfile: any | null | undefined;
  isLoading: boolean;
  error: any;
  patientEmail: string;
  tenantId: string;
}

const fetcher = (url: string, tenantId: string) => 
  fetch(url, {
    headers: { 'X-Tenant-ID': tenantId }
  }).then(async (res) => {
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch patient profile');
    }
    return res.json();
  });

/**
 * Hook to fetch patient profile data from Postgres
 * Handles patient profile retrieval for the current tenant
 */
export function usePatientProfileData(): UsePatientProfileDataReturn {
  const { data: session } = useZentheaSession();
  
  const patientEmail = session?.user?.email?.trim() || '';
  const tenantId = session?.user?.tenantId?.trim() || 'demo-tenant';
  
  const { data, error, isLoading } = useSWR(
    session ? ['/api/patient/profile', tenantId] : null,
    ([url, tId]) => fetcher(url, tId)
  );

  return {
    patientId: data?.id,
    patientProfile: data,
    isLoading,
    error,
    patientEmail,
    tenantId,
  };
}


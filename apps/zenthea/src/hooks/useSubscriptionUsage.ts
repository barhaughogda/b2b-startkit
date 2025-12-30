import useSWR from 'swr';

export interface SubscriptionUsage {
  plan: string;
  activeProviders: number;
  providerLimit: number;
  activePatients: number;
  patientLimit: number;
  needsUpgrade: boolean;
  isNearLimit: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook to fetch current subscription usage and limits for Zenthea.
 * Used to trigger upgrade prompts and enforce plan boundaries.
 */
export function useSubscriptionUsage() {
  const { data, error, isLoading, mutate } = useSWR<SubscriptionUsage>(
    '/api/subscription/usage',
    fetcher
  );

  return {
    usage: data,
    isLoading,
    isError: error,
    mutate,
  };
}

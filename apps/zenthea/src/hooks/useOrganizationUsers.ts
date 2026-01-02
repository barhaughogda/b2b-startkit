import useSWR from 'swr'
import { useZentheaSession } from './useZentheaSession'

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch users');
  }
  return res.json();
})

export function useOrganizationUsers() {
  const { data: session } = useZentheaSession()
  const organizationId = session?.user?.tenantId

  const { data, error, isLoading, mutate } = useSWR<any[]>(
    session && organizationId ? `/api/organizations/${organizationId}/users` : null,
    fetcher
  )

  return {
    users: data || [],
    isLoading,
    error,
    refreshUsers: mutate,
  }
}

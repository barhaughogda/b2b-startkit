import useSWR from 'swr'
import { useMemo } from 'react'
import { useZentheaSession } from './useZentheaSession'

const fetcher = (url: string, tenantId: string) => 
  fetch(url, {
    headers: { 'X-Tenant-ID': tenantId }
  }).then(async (res) => {
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch conversations');
    }
    return res.json();
  })

export function useConversations() {
  const { data: session } = useZentheaSession()
  const tenantId = session?.user?.tenantId || 'demo-tenant'
  
  const { data, error, isLoading, mutate } = useSWR<any[]>(
    session ? ['/api/patient/conversations', tenantId] : null,
    ([url, tId]) => fetcher(url, tId)
  )

  const conversations = useMemo(() => data || [], [data])

  return {
    conversations,
    isLoading,
    error,
    refreshConversations: mutate,
  }
}

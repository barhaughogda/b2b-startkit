import useSWR from 'swr'
import { useZentheaSession } from './useZentheaSession'

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch conversations');
  }
  return res.json();
})

export function useConversations() {
  const { data: session } = useZentheaSession()
  
  const { data, error, isLoading, mutate } = useSWR<any[]>(
    session ? '/api/messages/conversations' : null,
    fetcher
  )

  return {
    conversations: data || [],
    isLoading,
    error,
    refreshConversations: mutate,
  }
}

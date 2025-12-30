import useSWR from 'swr'
import { useZentheaSession } from './useZentheaSession'

/**
 * Core message data structure
 */
export interface Message {
  id: string
  fromUserId: string
  toUserId?: string
  subject?: string
  content?: string
  messageType: string
  priority: string
  status: string
  isRead: boolean
  readAt?: string
  threadId?: string
  parentMessageId?: string
  attachments?: any
  organizationId: string
  createdAt: string
  updatedAt: string
  fromUserName?: string
  toUserName?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * Custom hook for fetching and managing message data from Postgres
 */
export function useMessages() {
  const { data: session } = useZentheaSession()
  
  const { data, error, isLoading, mutate } = useSWR<Message[]>(
    session ? '/api/messages' : null,
    fetcher
  )

  /**
   * Send a new message
   */
  const sendMessage = async (messageData: Partial<Message>) => {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to send message')
    }
    
    const newMessage = await response.json()
    await mutate()
    return newMessage
  }

  return {
    messages: data || [],
    isLoading,
    error,
    sendMessage,
    refreshMessages: mutate,
  }
}

/**
 * Custom hook for a single message thread
 */
export function useThread(threadId: string) {
  const { data: session } = useZentheaSession()
  
  const { data, error, isLoading, mutate } = useSWR<Message[]>(
    session && threadId ? `/api/messages/thread/${threadId}` : null,
    fetcher
  )

  const replyToThread = async (content: string) => {
    if (!data || data.length === 0) return
    const lastMessage = data[data.length - 1]
    
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        threadId,
        toUserId: lastMessage?.fromUserId, // Reply to the sender of the last message
        subject: `Re: ${lastMessage?.subject || 'No Subject'}`,
        messageType: lastMessage?.messageType || 'general',
      }),
    })
    
    if (!response.ok) {
      throw new Error('Failed to reply to thread')
    }
    
    const newMessage = await response.json()
    await mutate()
    return newMessage
  }

  return {
    thread: data || [],
    isLoading,
    error,
    replyToThread,
  }
}

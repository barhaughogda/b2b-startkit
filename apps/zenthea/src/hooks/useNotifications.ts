/**
 * Notifications Hook
 * 
 * Fetches and manages user notifications.
 * Fix: Added robust array check to prevent UI crash when API returns an error object.
 */

import useSWR from 'swr'
import { useZentheaSession } from './useZentheaSession'

/**
 * Core notification data structure
 */
export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  resourceType?: string
  resourceId?: string
  metadata?: any
  isRead: boolean
  readAt?: string
  organizationId: string
  createdAt: string
  expiresAt?: string
}

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch notifications');
  }
  return res.json();
})

/**
 * Custom hook for fetching and managing notification data from Postgres
 */
export function useNotifications() {
  const { data: session } = useZentheaSession()
  
  const { data, error, isLoading, mutate } = useSWR<Notification[]>(
    session ? '/api/notifications' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  )

  const markAsRead = async (id: string) => {
    const response = await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
    })
    
    if (!response.ok) {
      throw new Error('Failed to mark notification as read')
    }
    
    await mutate()
    return await response.json()
  }

  const markAllAsRead = async () => {
    const response = await fetch('/api/notifications/read-all', {
      method: 'POST',
    })
    
    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read')
    }
    
    await mutate()
    return await response.json()
  }

  // Ensure notifications is always an array to prevent .filter crashes
  const notifications = Array.isArray(data) ? data : [];

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.isRead).length,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications: mutate,
  }
}

/**
 * Specialty hook for calendar-related notifications
 */
export function useCalendarNotifications() {
  const { notifications } = useNotifications()
  
  // Ensure notifications is an array
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  
  const calendarNotifications = safeNotifications.filter(n => 
    n.type.startsWith('appointment_') || n.resourceType === 'appointment'
  )
  
  return {
    notifications: calendarNotifications,
    count: calendarNotifications.filter(n => !n.isRead).length,
    hasUnread: calendarNotifications.some(n => !n.isRead),
  }
}

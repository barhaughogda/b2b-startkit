'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useZentheaSession } from './useZentheaSession';
import { useCallback } from 'react';

/**
 * Hook to manage notifications for the current user
 */
export function useNotifications(options?: {
  limit?: number;
  includeRead?: boolean;
}) {
  const { data: session } = useZentheaSession();
  const userId = session?.user?.id as Id<'users'> | undefined;
  const tenantId = session?.user?.tenantId;

  // Get notifications
  const notifications = useQuery(
    api.notifications.getUserNotifications,
    userId && tenantId
      ? {
          userId,
          tenantId,
          limit: options?.limit,
          includeRead: options?.includeRead,
        }
      : 'skip'
  );

  // Get unread count
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    userId && tenantId
      ? { userId, tenantId }
      : 'skip'
  );

  // Mutations
  const markAsReadMutation = useMutation(api.notifications.markAsRead);
  const markMultipleAsReadMutation = useMutation(api.notifications.markMultipleAsRead);
  const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead);
  const deleteNotificationMutation = useMutation(api.notifications.deleteNotification);

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId: Id<'notifications'>) => {
      await markAsReadMutation({ notificationId });
    },
    [markAsReadMutation]
  );

  // Mark multiple notifications as read
  const markMultipleAsRead = useCallback(
    async (notificationIds: Id<'notifications'>[]) => {
      await markMultipleAsReadMutation({ notificationIds });
    },
    [markMultipleAsReadMutation]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(
    async (type?: 'appointment_invite' | 'appointment_update' | 'appointment_cancelled' | 'appointment_reminder' | 'member_added' | 'member_removed' | 'message_received' | 'task_assigned' | 'system') => {
      if (!userId || !tenantId) return;
      await markAllAsReadMutation({ userId, tenantId, type });
    },
    [userId, tenantId, markAllAsReadMutation]
  );

  // Delete a notification
  const deleteNotification = useCallback(
    async (notificationId: Id<'notifications'>) => {
      if (!tenantId) {
        throw new Error('Tenant ID is required to delete notifications');
      }
      await deleteNotificationMutation({ notificationId, tenantId });
    },
    [deleteNotificationMutation, tenantId]
  );

  return {
    notifications: notifications || [],
    unreadCount: unreadCount?.count || 0,
    hasUnread: unreadCount?.hasUnread || false,
    isLoading: notifications === undefined,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

/**
 * Hook specifically for calendar/appointment notifications
 */
export function useCalendarNotifications() {
  const { data: session } = useZentheaSession();
  const userId = session?.user?.id as Id<'users'> | undefined;
  const tenantId = session?.user?.tenantId;

  // Get unread appointment notification count
  const appointmentNotifications = useQuery(
    api.notifications.getUnreadAppointmentCount,
    userId && tenantId
      ? { userId, tenantId }
      : 'skip'
  );

  // Mark all appointment notifications as read
  const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead);

  const markAllAppointmentNotificationsAsRead = useCallback(async () => {
    if (!userId || !tenantId) return;
    
    const appointmentTypes = [
      'appointment_invite',
      'appointment_update',
      'appointment_cancelled',
      'appointment_reminder',
    ] as const;

    for (const type of appointmentTypes) {
      await markAllAsReadMutation({ userId, tenantId, type });
    }
  }, [userId, tenantId, markAllAsReadMutation]);

  return {
    count: appointmentNotifications?.count || 0,
    hasUnread: appointmentNotifications?.hasUnread || false,
    isLoading: appointmentNotifications === undefined,
    markAllAsRead: markAllAppointmentNotificationsAsRead,
  };
}


'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  type: 'message' | 'appointment' | 'system' | 'urgent';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast notification
    const toastType = notification.priority === 'urgent' ? 'error' : 
                     notification.priority === 'high' ? 'warning' : 'info';
    
    toast[toastType](notification.title, {
      description: notification.message,
      action: notification.actionUrl ? {
        label: 'View',
        onClick: () => window.open(notification.actionUrl, '_blank')
      } : undefined,
      duration: notification.priority === 'urgent' ? 0 : 5000, // Urgent notifications don't auto-dismiss
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(notif => !notif.read).length;

  // Auto-mark old notifications as read after 24 hours
  useEffect(() => {
    const interval = setInterval(() => {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      setNotifications(prev => 
        prev.map(notif => 
          notif.timestamp < oneDayAgo && !notif.read ? 
            { ...notif, read: true } : notif
        )
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Hook for real-time message notifications
export function useMessageNotifications() {
  // Add error handling for context initialization
  let addNotification;
  try {
    const context = useNotifications();
    addNotification = context.addNotification;
  } catch (error) {
    // If context is not available, use a no-op function
    addNotification = () => {};
  }

  const notifyNewMessage = useCallback((message: {
    fromUser: { firstName: string; lastName: string; role: string };
    content: string;
    priority: string;
    threadId: string;
  }) => {
    const isUrgent = message.priority === 'urgent';
    const isFromProvider = message.fromUser.role !== 'patient';
    
    addNotification({
      type: 'message',
      title: isFromProvider ? 
        `New message from ${message.fromUser.firstName} ${message.fromUser.lastName}` :
        'New message',
      message: message.content,
      priority: isUrgent ? 'urgent' : 'normal',
      actionUrl: `/patient/messages?thread=${message.threadId}`,
      metadata: {
        threadId: message.threadId,
        fromUser: message.fromUser
      }
    });
  }, [addNotification]);

  const notifyAppointmentReminder = useCallback((appointment: {
    date: string;
    time: string;
    provider: string;
    type: string;
  }) => {
    addNotification({
      type: 'appointment',
      title: 'Appointment Reminder',
      message: `You have an appointment with ${appointment.provider} on ${appointment.date} at ${appointment.time}`,
      priority: 'normal',
      actionUrl: '/patient/appointments',
      metadata: {
        appointment
      }
    });
  }, [addNotification]);

  return {
    notifyNewMessage,
    notifyAppointmentReminder
  };
}

// Hook for calendar-specific notifications
export function useCalendarNotifications() {
  let addNotification;
  try {
    const context = useNotifications();
    addNotification = context.addNotification;
  } catch (error) {
    addNotification = () => {};
  }

  const notifyAdminCalendarEdit = useCallback((details: {
    appointmentId: string;
    adminName: string;
    changes: string[];
    appointmentTime: string;
  }) => {
    addNotification({
      type: 'system',
      title: 'Calendar Updated by Admin',
      message: `${details.adminName} modified your appointment scheduled for ${details.appointmentTime}. Changes: ${details.changes.join(', ')}`,
      priority: 'high',
      actionUrl: `/provider/calendar?appointment=${details.appointmentId}`,
      metadata: {
        appointmentId: details.appointmentId,
        adminName: details.adminName,
        changes: details.changes,
      },
    });
  }, [addNotification]);

  const notifyAvailabilityConflict = useCallback((details: {
    appointmentTime: string;
    conflictReason: string;
    suggestions?: string[];
  }) => {
    const message = details.suggestions && details.suggestions.length > 0
      ? `Conflict detected for ${details.appointmentTime}: ${details.conflictReason}. Suggested times: ${details.suggestions.join(', ')}`
      : `Conflict detected for ${details.appointmentTime}: ${details.conflictReason}`;

    addNotification({
      type: 'urgent',
      title: 'Availability Conflict',
      message,
      priority: 'high',
      actionUrl: '/provider/calendar',
      metadata: {
        appointmentTime: details.appointmentTime,
        conflictReason: details.conflictReason,
        suggestions: details.suggestions,
      },
    });
  }, [addNotification]);

  const notifyCalendarSyncStatus = useCallback((details: {
    status: 'success' | 'error' | 'warning';
    syncType: string;
    message: string;
    syncedCount?: number;
    errorCount?: number;
  }) => {
    const priority = details.status === 'error' ? 'high' : 
                    details.status === 'warning' ? 'normal' : 'low';
    
    addNotification({
      type: 'system',
      title: `Calendar Sync ${details.status === 'success' ? 'Completed' : details.status === 'error' ? 'Failed' : 'Warning'}`,
      message: details.message,
      priority,
      actionUrl: '/provider/calendar?tab=sync',
      metadata: {
        syncType: details.syncType,
        syncedCount: details.syncedCount,
        errorCount: details.errorCount,
      },
    });
  }, [addNotification]);

  return {
    notifyAdminCalendarEdit,
    notifyAvailabilityConflict,
    notifyCalendarSyncStatus,
  };
}

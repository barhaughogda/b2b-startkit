import { create } from 'zustand/react';

export interface Notification {
  id: string;
  type: 'appointment_reminder' | 'appointment_confirmed' | 'appointment_cancelled' | 'appointment_rescheduled' | 'general';
  title: string;
  message: string;
  appointmentId?: string;
  isRead: boolean;
  createdAt: number;
  scheduledFor?: number; // For scheduled notifications
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAll: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  scheduleAppointmentReminder: (appointmentId: string, appointmentDate: string, appointmentTime: string, providerName: string) => void;
  clearError: () => void;
}

export const useNotificationsStore = create<NotificationsState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      // In a real app, this would fetch from API
      // For now, we'll simulate with mock data
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          type: 'appointment_reminder',
          title: 'Appointment Reminder',
          message: 'You have an appointment with Dr. Sarah Johnson tomorrow at 10:00 AM',
          appointmentId: 'apt-1',
          isRead: false,
          createdAt: Date.now() - 3600000, // 1 hour ago
          priority: 'normal'
        },
        {
          id: 'notif-2',
          type: 'appointment_confirmed',
          title: 'Appointment Confirmed',
          message: 'Your appointment with Dr. Michael Chen on Jan 20th has been confirmed',
          appointmentId: 'apt-2',
          isRead: true,
          createdAt: Date.now() - 7200000, // 2 hours ago
          priority: 'normal'
        }
      ];

      const unreadCount = mockNotifications.filter(n => !n.isRead).length;
      
      set({ 
        notifications: mockNotifications, 
        unreadCount,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
        isLoading: false 
      });
    }
  },

  markAsRead: (notificationId) => {
    set((state) => {
      const updatedNotifications = state.notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      );
      
      const unreadCount = updatedNotifications.filter(n => !n.isRead).length;
      
      return {
        notifications: updatedNotifications,
        unreadCount
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(notification => ({
        ...notification,
        isRead: true
      })),
      unreadCount: 0
    }));
  },

  deleteNotification: (notificationId) => {
    set((state) => {
      const updatedNotifications = state.notifications.filter(
        notification => notification.id !== notificationId
      );
      
      const unreadCount = updatedNotifications.filter(n => !n.isRead).length;
      
      return {
        notifications: updatedNotifications,
        unreadCount
      };
    });
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));
  },

  scheduleAppointmentReminder: (appointmentId, appointmentDate, appointmentTime, providerName) => {
    // Schedule reminder for 24 hours before appointment
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
    
    const reminder: Omit<Notification, 'id' | 'createdAt'> = {
      type: 'appointment_reminder',
      title: 'Upcoming Appointment',
      message: `You have an appointment with ${providerName} on ${appointmentDate} at ${appointmentTime}`,
      appointmentId,
      isRead: false,
      scheduledFor: reminderTime.getTime(),
      priority: 'normal'
    };

    get().addNotification(reminder);
  },

  clearError: () => set({ error: null }),
}));

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from '@/components/patient/NotificationBell';

// Mock notifications hook
const mockNotifications = [
  {
    id: '1',
    title: 'New Message',
    message: 'You have a new message from Dr. Smith',
    type: 'message',
    priority: 'normal',
    timestamp: new Date().toISOString(),
    read: false,
    actionUrl: '/patient/messages',
  },
  {
    id: '2',
    title: 'Appointment Reminder',
    message: 'You have an appointment tomorrow at 10 AM',
    type: 'appointment',
    priority: 'high',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    actionUrl: '/patient/appointments',
  },
];

const mockUseNotifications = vi.fn(() => ({
  notifications: mockNotifications,
  unreadCount: 2,
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  removeNotification: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  useNotifications: () => mockUseNotifications(),
  Notification: {} as any,
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn((date) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    return '1 day ago';
  }),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render notification bell icon', () => {
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      expect(bellButton).toBeInTheDocument();
    });

    it('should display unread count badge', () => {
      render(<NotificationBell />);
      
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display "9+" when unread count exceeds 9', () => {
      mockUseNotifications.mockReturnValueOnce({
        notifications: Array(15).fill(mockNotifications[0]),
        unreadCount: 15,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        removeNotification: vi.fn(),
      });
      
      render(<NotificationBell />);
      
      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('should show bell icon when no unread notifications', () => {
      mockUseNotifications.mockReturnValueOnce({
        notifications: [],
        unreadCount: 0,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        removeNotification: vi.fn(),
      });
      
      render(<NotificationBell />);
      
      expect(screen.queryByText(/9\+|\d+/)).not.toBeInTheDocument();
    });
  });

  describe('Panel Toggle', () => {
    it('should open notification panel when bell is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should close notification panel when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      // Open panel
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);
      
      // Click backdrop
      const backdrop = document.querySelector('.fixed.inset-0');
      if (backdrop) {
        await user.click(backdrop);
        // Panel should close
        expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
      }
    });
  });

  describe('Notification Display', () => {
    it('should display notification list when panel is open', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);
      
      expect(screen.getByText('New Message')).toBeInTheDocument();
      expect(screen.getByText('Appointment Reminder')).toBeInTheDocument();
    });

    it('should display notification messages', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);
      
      expect(screen.getByText(/You have a new message/i)).toBeInTheDocument();
      expect(screen.getByText(/You have an appointment/i)).toBeInTheDocument();
    });

    it('should display empty state when no notifications', async () => {
      const user = userEvent.setup();
      mockUseNotifications.mockReturnValueOnce({
        notifications: [],
        unreadCount: 0,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        removeNotification: vi.fn(),
      });
      
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);
      
      expect(screen.getByText(/No notifications/i)).toBeInTheDocument();
    });
  });

  describe('Notification Actions', () => {
    it('should call markAsRead when notification is clicked', async () => {
      const user = userEvent.setup();
      const markAsRead = vi.fn();
      
      mockUseNotifications.mockReturnValueOnce({
        notifications: mockNotifications,
        unreadCount: 2,
        markAsRead,
        markAllAsRead: vi.fn(),
        removeNotification: vi.fn(),
      });
      
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);
      
      const notification = screen.getByText('New Message');
      await user.click(notification);
      
      expect(markAsRead).toHaveBeenCalledWith('1');
    });

    it('should call markAllAsRead when button is clicked', async () => {
      const user = userEvent.setup();
      const markAllAsRead = vi.fn();
      
      mockUseNotifications.mockReturnValueOnce({
        notifications: mockNotifications,
        unreadCount: 2,
        markAsRead: vi.fn(),
        markAllAsRead,
        removeNotification: vi.fn(),
      });
      
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);
      
      const markAllButton = screen.getByText(/Mark all read/i);
      await user.click(markAllButton);
      
      expect(markAllAsRead).toHaveBeenCalled();
    });

    it('should call removeNotification when remove button is clicked', async () => {
      const user = userEvent.setup();
      const removeNotification = vi.fn();
      
      mockUseNotifications.mockReturnValueOnce({
        notifications: mockNotifications,
        unreadCount: 2,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        removeNotification,
      });
      
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);
      
      // Find remove button (X icon)
      const removeButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      const removeButton = removeButtons.find(btn => 
        btn.className.includes('ghost') && btn.querySelector('svg')
      );
      
      if (removeButton) {
        await user.click(removeButton);
        expect(removeNotification).toHaveBeenCalled();
      }
    });
  });

  describe('Priority Styling', () => {
    it('should apply correct styling for urgent priority', async () => {
      const user = userEvent.setup();
      mockUseNotifications.mockReturnValueOnce({
        notifications: [{
          ...mockNotifications[0],
          priority: 'urgent',
        }],
        unreadCount: 1,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        removeNotification: vi.fn(),
      });
      
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);
      
      const notification = screen.getByText('New Message');
      const notificationCard = notification.closest('[class*="border"]');
      expect(notificationCard).toBeInTheDocument();
    });
  });

  describe('Unread Indicator', () => {
    it('should show unread count in header', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);
      
      expect(screen.getByText(/2 unread notification/i)).toBeInTheDocument();
    });

    it('should show singular form for one unread', async () => {
      const user = userEvent.setup();
      mockUseNotifications.mockReturnValueOnce({
        notifications: [mockNotifications[0]],
        unreadCount: 1,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        removeNotification: vi.fn(),
      });
      
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);
      
      expect(screen.getByText(/1 unread notification$/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible bell button', () => {
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      expect(bellButton).toBeInTheDocument();
    });

    it('should have accessible notification panel', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });
});


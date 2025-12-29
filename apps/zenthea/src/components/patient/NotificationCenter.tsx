'use client';

import React, { useState, useEffect } from 'react';
import { useNotificationsStore } from '@/stores/notificationsStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Clock,
  User,
  AlertCircle,
  Info,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearError
  } = useNotificationsStore();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') {
      return !notification.isRead;
    }
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_reminder':
        return <BellRing className="h-4 w-4 text-status-info" />;
      case 'appointment_confirmed':
        return <Check className="h-4 w-4 text-status-success" />;
      case 'appointment_cancelled':
        return <X className="h-4 w-4 text-status-error" />;
      case 'appointment_rescheduled':
        return <Clock className="h-4 w-4 text-status-warning" />;
      default:
        return <Info className="h-4 w-4 text-text-tertiary" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-status-error-bg text-status-error border border-status-error border-opacity-30';
      case 'high':
        return 'bg-status-warning-bg text-status-warning border border-status-warning border-opacity-30';
      case 'normal':
        return 'bg-status-info-bg text-status-info border border-status-info border-opacity-30';
      case 'low':
        return 'bg-surface-secondary text-text-primary border-border-primary';
      default:
        return 'bg-surface-secondary text-text-primary border-border-primary';
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleDelete = (notificationId: string) => {
    deleteNotification(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Stay updated with your appointment reminders and healthcare notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filter and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread
              </Button>
            </div>
            
            {notifications.length > 0 && (
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark All Read
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Card className="border-status-error bg-status-error-bg">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-status-error">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading notifications...</p>
              </CardContent>
            </Card>
          )}

          {/* Notifications List */}
          {!isLoading && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                    <p className="text-muted-foreground">
                      {filter === 'unread' 
                        ? 'You have no unread notifications'
                        : 'You don\'t have any notifications yet'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredNotifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`transition-all duration-200 ${
                      !notification.isRead 
                        ? 'border-l-4 border-l-status-info bg-status-info-bg' 
                        : 'opacity-75'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm">
                                  {notification.title}
                                </h4>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getPriorityColor(notification.priority)}`}
                                >
                                  {notification.priority}
                                </Badge>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-status-info rounded-full"></div>
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-2">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                                </div>
                                {notification.appointmentId && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Appointment
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(notification.id)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-status-error"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

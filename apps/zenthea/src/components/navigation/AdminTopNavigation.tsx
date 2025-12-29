'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Calendar, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBadgeWrapper } from '@/components/ui/NotificationBadge';
import { useCalendarNotifications } from '@/hooks/useNotifications';

interface AdminTopNavigationProps {
  className?: string;
}

export function AdminTopNavigation({ className = "" }: AdminTopNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const calendarNotifications = useCalendarNotifications();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  // Determine if we're in company context (for unified access system)
  const isCompanyContext = pathname.startsWith('/company');
  
  const navigationItems = [
    {
      path: isCompanyContext ? '/company/calendar' : '/admin/calendar',
      icon: Calendar,
      label: isCompanyContext ? 'Today' : 'Calendar',
      ariaLabel: isCompanyContext ? 'Today' : 'Calendar',
      showBadge: true, // Calendar has notification badge
    },
    {
      path: isCompanyContext ? '/company/patients' : '/admin/patients',
      icon: Users,
      label: 'Patients',
      ariaLabel: 'Patients',
      showBadge: false,
    },
    {
      path: isCompanyContext ? '/company/messages' : '/admin/messages',
      icon: MessageSquare,
      label: 'Messages',
      ariaLabel: 'Messages',
      showBadge: false,
    }
  ];

  return (
    <nav 
      className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] ${className}`}
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="bg-surface-elevated/90 backdrop-blur-md rounded-full px-6 py-3 shadow-lg h-12">
        <div className="flex items-center space-x-4 h-full">
          {navigationItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            const IconComponent = item.icon;
            
            const buttonContent = (
              <Button
                key={item.path}
                variant="ghost"
                size="icon"
                onClick={() => handleNavigation(item.path)}
                className={`h-10 w-10 rounded-full hover:bg-surface-interactive transition-colors ${
                  isActive ? 'bg-surface-interactive' : ''
                }`}
                aria-label={item.ariaLabel}
                title={item.label}
              >
                <IconComponent className="h-5 w-5 text-text-primary" />
              </Button>
            );
            
            // Wrap calendar with notification badge
            if (item.showBadge && calendarNotifications.hasUnread) {
              return (
                <NotificationBadgeWrapper
                  key={item.path}
                  count={calendarNotifications.count}
                  size="sm"
                  variant="dot"
                  pulse={true}
                >
                  {buttonContent}
                </NotificationBadgeWrapper>
              );
            }
            
            return buttonContent;
          })}
        </div>
      </div>
    </nav>
  );
}


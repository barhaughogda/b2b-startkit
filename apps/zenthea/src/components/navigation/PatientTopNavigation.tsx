'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Calendar, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PatientTopNavigationProps {
  className?: string;
}

export function PatientTopNavigation({ className = "" }: PatientTopNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const navigationItems = [
    {
      path: '/patient/calendar',
      icon: Calendar,
      label: 'Calendar',
      ariaLabel: 'Calendar'
    },
    {
      path: '/patient/records',
      icon: User,
      label: 'Medical Records',
      ariaLabel: 'Medical Records'
    },
    {
      path: '/patient/messages',
      icon: MessageSquare,
      label: 'Messages',
      ariaLabel: 'Messages'
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
            return (
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
                <item.icon className="h-5 w-5 text-text-primary" />
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}


'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProviderTopNavigationProps {
  className?: string;
}

export function ProviderTopNavigation({ className = "" }: ProviderTopNavigationProps) {
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] ${className}`}>
      <div className="bg-surface-elevated/90 backdrop-blur-md rounded-full px-6 py-3 shadow-lg h-12">
        <div className="flex items-center space-x-4 h-full">
          {/* Navigation buttons only - no avatar */}

          {/* Navigation buttons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigation('/company/today')}
            className="h-10 w-10 rounded-full hover:bg-surface-interactive transition-colors"
            aria-label="Dashboard"
            title="Dashboard"
          >
            <Calendar className="h-5 w-5 text-text-primary" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigation('/company/patients')}
            className="h-10 w-10 rounded-full hover:bg-surface-interactive transition-colors"
            aria-label="Patients"
            title="Patients"
          >
            <Users className="h-5 w-5 text-text-primary" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigation('/company/messages')}
            className="h-10 w-10 rounded-full hover:bg-surface-interactive transition-colors"
            aria-label="Messages"
            title="Messages"
          >
            <MessageSquare className="h-5 w-5 text-text-primary" />
          </Button>
        </div>
      </div>
    </div>
  );
}

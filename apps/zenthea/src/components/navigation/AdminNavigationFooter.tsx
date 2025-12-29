'use client';

import React from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface AdminNavigationFooterProps {
  className?: string;
}

export function AdminNavigationFooter({ className }: AdminNavigationFooterProps) {
  return (
    <footer 
      className={`fixed bottom-0 left-0 right-0 z-[70] flex h-16 items-center bg-transparent ${className || ''}`}
      role="contentinfo"
    >
      {/* Left side - Theme settings only */}
      <div 
        className="flex items-center gap-2 px-4"
        data-testid="settings-container"
      >
        <ThemeToggle 
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-surface-interactive transition-colors"
        />
      </div>
    </footer>
  );
}


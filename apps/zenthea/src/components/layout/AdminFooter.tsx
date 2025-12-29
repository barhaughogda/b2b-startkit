'use client';

import React from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

interface AdminFooterProps {
  /** Custom className */
  className?: string;
}

/**
 * Admin footer component
 * Displays copyright, version, and theme toggle
 */
export function AdminFooter({ className }: AdminFooterProps) {
  const currentYear = new Date().getFullYear();
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';

  return (
    <footer
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 flex h-12 items-center justify-between border-t border-border-primary bg-surface-elevated px-4',
        className
      )}
      role="contentinfo"
      data-testid="admin-footer"
    >
      {/* Left side - Copyright and version */}
      <div className="flex items-center gap-4 text-xs text-text-tertiary">
        <p>
          © {currentYear} Zenthea. All rights reserved.
        </p>
        <span className="hidden sm:inline">•</span>
        <p className="hidden sm:inline">Version {version}</p>
      </div>

      {/* Right side - Theme toggle */}
      <div className="flex items-center gap-2">
        <ThemeToggle
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-surface-interactive transition-colors"
        />
      </div>
    </footer>
  );
}


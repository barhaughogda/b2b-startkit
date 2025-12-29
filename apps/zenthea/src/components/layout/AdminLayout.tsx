'use client';

import React from 'react';
import { ZentheaThemeProvider } from '@/lib/theme-context';
import { AdminNavigationLayout } from '@/components/navigation/AdminNavigationLayout';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  /** Custom className for the main content area */
  contentClassName?: string;
  /** Whether to show search button */
  showSearch?: boolean;
}

/**
 * Admin layout component
 * Main wrapper for all admin pages with new navigation structure
 * Matches Provider/Patient navigation style (no sidebar)
 *
 * Note: ZentheaThemeProvider is nested here for consistency with other layouts
 * (e.g., PatientPortalLayout) and to support potential tenant-specific theming.
 * The root layout also provides ZentheaThemeProvider, but this nesting allows
 * for layout-specific theme overrides if needed in the future.
 */
export function AdminLayout({
  children,
  contentClassName,
  showSearch = true,
}: AdminLayoutProps) {
  return (
    <ZentheaThemeProvider>
      <div className="min-h-screen bg-background-primary flex flex-col" data-testid="admin-layout">
        <AdminNavigationLayout 
          contentClassName={cn('px-6', contentClassName)}
          showSearch={showSearch}
        >
          {children}
        </AdminNavigationLayout>
      </div>
    </ZentheaThemeProvider>
  );
}


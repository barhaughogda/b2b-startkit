'use client';

import React from 'react';
import { ZentheaThemeProvider } from '@/lib/theme-context';
import { ClinicNavigationLayout } from '@/components/navigation/ClinicNavigationLayout';
import { cn } from '@/lib/utils';

interface ClinicLayoutProps {
  children: React.ReactNode;
  /** Custom className for the main content area */
  contentClassName?: string;
  /** Whether to show search button */
  showSearch?: boolean;
  /** Whether to hide navigation elements (top nav and footer) */
  hideNavigation?: boolean;
  /** Whether to hide the header (for full-screen experiences like builders) */
  hideHeader?: boolean;
}

/**
 * Clinic layout component
 * Main wrapper for all clinic pages with new navigation structure
 * Matches Provider/Patient navigation style (no sidebar)
 *
 * Note: ZentheaThemeProvider is nested here for consistency with other layouts
 * (e.g., PatientPortalLayout) and to support potential tenant-specific theming.
 * The root layout also provides ZentheaThemeProvider, but this nesting allows
 * for layout-specific theme overrides if needed in the future.
 */
export function ClinicLayout({
  children,
  contentClassName,
  showSearch = true,
  hideNavigation = false,
  hideHeader = false,
}: ClinicLayoutProps) {
  return (
    <ZentheaThemeProvider>
      <div className="min-h-screen bg-background-primary flex flex-col" data-testid="clinic-layout">
        <ClinicNavigationLayout 
          contentClassName={cn('px-6', contentClassName)}
          showSearch={showSearch}
          hideNavigation={hideNavigation}
          hideHeader={hideHeader}
        >
          {children}
        </ClinicNavigationLayout>
      </div>
    </ZentheaThemeProvider>
  );
}


'use client';

import React from 'react';
import { ClinicNavigationHeader } from './ClinicNavigationHeader';
import { ClinicNavigationFooter } from './ClinicNavigationFooter';
import { AdminTopNavigation } from './AdminTopNavigation';
import { NavigationErrorBoundary } from './NavigationErrorBoundary';

interface ClinicNavigationLayoutProps {
  children: React.ReactNode;
  /** Whether to show the full layout or just the header */
  showFullLayout?: boolean;
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
 * Clinic navigation layout component
 * Provides consistent navigation structure across all clinic pages
 * Matches the Provider/Patient navigation style
 */
export function ClinicNavigationLayout({
  children,
  showFullLayout = true,
  contentClassName = '',
  showSearch = true,
  hideNavigation = false,
  hideHeader = false,
}: ClinicNavigationLayoutProps) {
  if (!showFullLayout) {
    return (
      <div className="min-h-screen bg-background-primary">
        {!hideHeader && <ClinicNavigationHeader showSearch={showSearch} />}
        <main className={`${hideHeader ? '' : 'pt-24'} pb-24 ${contentClassName}`}>
          {children}
        </main>
        {!hideNavigation && (
          <>
            <AdminTopNavigation />
            <ClinicNavigationFooter />
          </>
        )}
      </div>
    );
  }

  return (
    <NavigationErrorBoundary>
      <div className="min-h-screen bg-background-primary relative overflow-hidden">
        {/* Navigation Header */}
        {!hideHeader && <ClinicNavigationHeader showSearch={showSearch} />}
        
        {/* Main Content */}
        <main className={`flex-1 ${hideHeader ? '' : 'pt-24'} pb-24 ${contentClassName}`}>
          {children}
        </main>
        
        {/* Navigation buttons in center */}
        {!hideNavigation && <AdminTopNavigation />}
        
        {/* Footer with clinic menu */}
        {!hideNavigation && <ClinicNavigationFooter />}
      </div>
    </NavigationErrorBoundary>
  );
}


'use client';

import React from 'react';
import { AdminNavigationHeader } from './AdminNavigationHeader';
import { AdminNavigationFooter } from './AdminNavigationFooter';
import { AdminTopNavigation } from './AdminTopNavigation';
import { NavigationErrorBoundary } from './NavigationErrorBoundary';

interface AdminNavigationLayoutProps {
  children: React.ReactNode;
  /** Whether to show the full layout or just the header */
  showFullLayout?: boolean;
  /** Custom className for the main content area */
  contentClassName?: string;
  /** Whether to show search button */
  showSearch?: boolean;
}

/**
 * Admin navigation layout component
 * Provides consistent navigation structure across all admin pages
 * Matches the Provider/Patient navigation style
 */
export function AdminNavigationLayout({
  children,
  showFullLayout = true,
  contentClassName = '',
  showSearch = true,
}: AdminNavigationLayoutProps) {
  if (!showFullLayout) {
    return (
      <div className="min-h-screen bg-background-primary">
        <AdminNavigationHeader showSearch={showSearch} />
        <main className={`pt-24 pb-24 ${contentClassName}`}>
          {children}
        </main>
        <AdminTopNavigation />
        <AdminNavigationFooter />
      </div>
    );
  }

  return (
    <NavigationErrorBoundary>
      <div className="min-h-screen bg-background-primary relative overflow-hidden">
        {/* Navigation Header */}
        <AdminNavigationHeader showSearch={showSearch} />
        
        {/* Main Content */}
        <main className={`flex-1 pt-24 pb-24 ${contentClassName}`}>
          {children}
        </main>
        
        {/* Navigation buttons in center */}
        <AdminTopNavigation />
        
        {/* Footer with theme toggle */}
        <AdminNavigationFooter />
      </div>
    </NavigationErrorBoundary>
  );
}


'use client';

import React from 'react';
import { ProviderNavigationHeader } from './ProviderNavigationHeader';
import { ProviderNavigationFooter } from './ProviderNavigationFooter';
import { ProviderTopNavigation } from './ProviderTopNavigation';
import { NavigationErrorBoundary } from './NavigationErrorBoundary';
import { NavigationLoading } from './NavigationLoading';
import { NavigationHeaderProps } from '@/types/navigation';
import { CardControlBar } from '@/components/cards/CardControlBar';

interface ProviderNavigationLayoutProps extends NavigationHeaderProps {
  children: React.ReactNode;
  /** Whether to show the full layout or just the header */
  showFullLayout?: boolean;
  /** Custom className for the main content area */
  contentClassName?: string;
}

/**
 * Shared navigation layout component for provider pages
 * Provides consistent navigation structure across all provider pages
 */
export function ProviderNavigationLayout({
  children,
  showFullLayout = true,
  contentClassName = '',
  ...headerProps
}: ProviderNavigationLayoutProps) {
  if (!showFullLayout) {
    return (
      <div className="min-h-screen bg-background-primary">
        <ProviderNavigationHeader {...headerProps} />
        <main className={`pt-24 pb-24 ${contentClassName}`}>
          {children}
        </main>
        <ProviderTopNavigation />
        <ProviderNavigationFooter />
        {/* Card Control Panel - Floating control bar for card management */}
        <CardControlBar />
      </div>
    );
  }

  return (
    <NavigationErrorBoundary>
      <div className="min-h-screen bg-background-primary relative overflow-hidden">
        {/* Navigation Header */}
        <ProviderNavigationHeader {...headerProps} />
        
        {/* Main Content */}
        <main className={`flex-1 pt-24 pb-24 ${contentClassName}`}>
          {children}
        </main>
        
        {/* Navigation buttons in center */}
        <ProviderTopNavigation />
        
        {/* Footer with theme and language settings */}
        <ProviderNavigationFooter />
        
        {/* Card Control Panel - Floating control bar for card management */}
        <CardControlBar />
      </div>
    </NavigationErrorBoundary>
  );
}

/**
 * Higher-order component for provider pages with navigation
 * Provides consistent navigation structure
 */
export function withProviderNavigation<P extends object>(
  Component: React.ComponentType<P>,
  navigationProps: Partial<NavigationHeaderProps> = {}
) {
  return function ProviderNavigationWrapper(props: P) {
    const defaultProps: NavigationHeaderProps = {
      pageTitle: 'Provider Portal',
      pagePath: '/provider',
      showSearch: false,
      showNotifications: false,
      ...navigationProps
    };
    
    return (
      <ProviderNavigationLayout {...defaultProps}>
        <Component {...props} />
      </ProviderNavigationLayout>
    );
  };
}

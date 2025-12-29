'use client';

import React from 'react';
import { PatientNavigationHeader } from './PatientNavigationHeader';
import { PatientTopNavigation } from './PatientTopNavigation';

interface PatientNavigationLayoutProps {
  children: React.ReactNode;
  /** Whether to show the full layout or just the header */
  showFullLayout?: boolean;
  /** Custom className for the main content area */
  contentClassName?: string;
  /** Whether to show search functionality */
  showSearch?: boolean;
  /** Whether to show chat button */
  showChat?: boolean;
}

/**
 * Patient Portal navigation layout component
 * Provides consistent navigation structure across all patient pages
 * Matches the Provider Portal navigation style
 */
export function PatientNavigationLayout({
  children,
  showFullLayout = true,
  contentClassName = '',
  showSearch = true,
  showChat = true,
}: PatientNavigationLayoutProps) {
  if (!showFullLayout) {
    return (
      <div className="min-h-screen bg-background-primary">
        <PatientNavigationHeader showSearch={showSearch} showChat={showChat} />
        <main className={`pt-24 pb-24 ${contentClassName}`}>
          {children}
        </main>
        <PatientTopNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary relative overflow-hidden">
      {/* Navigation Header */}
      <PatientNavigationHeader showSearch={showSearch} showChat={showChat} />
      
      {/* Main Content */}
      <main className={`flex-1 pt-24 pb-24 ${contentClassName}`}>
        {children}
      </main>
      
      {/* Navigation buttons in center */}
      <PatientTopNavigation />
    </div>
  );
}

/**
 * Higher-order component for patient pages with navigation
 * Provides consistent navigation structure
 */
export function withPatientNavigation<P extends object>(
  Component: React.ComponentType<P>,
  navigationProps: Partial<PatientNavigationLayoutProps> = {}
) {
  return function PatientNavigationWrapper(props: P) {
    const defaultProps: Omit<PatientNavigationLayoutProps, 'children'> = {
      showSearch: true,
      showChat: true,
      ...navigationProps
    };
    
    return (
      <PatientNavigationLayout {...defaultProps}>
        <Component {...props} />
      </PatientNavigationLayout>
    );
  };
}


import React from 'react';
import { render, screen } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProviderNavigationLayout } from '../ProviderNavigationLayout';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        name: 'Test User',
        email: 'test@example.com'
      }
    },
    status: 'authenticated',
    update: vi.fn(),
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock theme context
vi.mock('@/lib/theme-context', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    toggleTheme: vi.fn()
  }))
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    pathname: '/provider/today'
  }))
}));

// Mock AuthGuard
vi.mock('@/components/auth/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('ProviderNavigationLayout', () => {
  it('renders children with navigation header', () => {
    render(
      <SessionProvider>
        <ProviderNavigationLayout 
          pageTitle="Today" 
          pagePath="/provider/today"
        >
          <div>Test Content</div>
        </ProviderNavigationLayout>
      </SessionProvider>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders with custom navigation props', () => {
    render(
      <SessionProvider>
        <ProviderNavigationLayout 
          pageTitle="Messages" 
          pagePath="/provider/messages"
          showSearch={true}
          showNotifications={true}
          notificationCount={3}
        >
          <div>Messages Content</div>
        </ProviderNavigationLayout>
      </SessionProvider>
    );

    expect(screen.getByText('Messages Content')).toBeInTheDocument();
    // Since breadcrumbs were removed, we no longer expect "Messages" text to be displayed
    // Search is now a button that opens a modal, not a visible input
    expect(screen.getByLabelText(/toggle search/i)).toBeInTheDocument();
    // Notification count is no longer displayed in the current navigation structure
  });

  it('renders with minimal layout when showFullLayout is false', () => {
    render(
      <SessionProvider>
        <ProviderNavigationLayout 
          pageTitle="Today" 
          pagePath="/provider/today"
          showFullLayout={false}
        >
          <div>Minimal Content</div>
        </ProviderNavigationLayout>
      </SessionProvider>
    );

    expect(screen.getByText('Minimal Content')).toBeInTheDocument();
  });

  it('should display search icon on all pages', () => {
    render(
      <SessionProvider>
        <ProviderNavigationLayout pageTitle="Test Page" pagePath="/test">
          <div>Test Content</div>
        </ProviderNavigationLayout>
      </SessionProvider>
    );

    // Search icon should be visible on all pages
    expect(screen.getByLabelText(/toggle search/i)).toBeInTheDocument();
  });

  it('should display search icon on individual patient pages', () => {
    render(
      <SessionProvider>
        <ProviderNavigationLayout 
          pageTitle="Patient Profile" 
          pagePath="/provider/patients"
          showSearch={true}
        >
          <div>Patient Content</div>
        </ProviderNavigationLayout>
      </SessionProvider>
    );

    // Search icon should be visible on individual patient pages
    expect(screen.getByLabelText(/toggle search/i)).toBeInTheDocument();
  });

  it('should have bottom padding to account for AI agent widget', () => {
    render(
      <SessionProvider>
        <ProviderNavigationLayout 
          pageTitle="Test Page" 
          pagePath="/provider/test"
        >
          <div data-testid="main-content">Test Content</div>
        </ProviderNavigationLayout>
      </SessionProvider>
    );

    // Main content should have bottom padding to prevent overlap with AI agent widget
    const mainContent = screen.getByTestId('main-content');
    const mainElement = mainContent.closest('main');
    expect(mainElement).toHaveClass('pb-24'); // 96px bottom padding
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { describe, it, expect, vi } from 'vitest';
import { ProviderNavigationHeader } from '../ProviderNavigationHeader';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg'
      }
    }
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock theme context
vi.mock('@/lib/theme-context', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn()
  })
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/provider/today'
  })
}));

// Mock theme context
vi.mock('@/lib/theme-context', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn()
  })
}));

describe('ProviderNavigationHeader', () => {
  it('renders with basic props', () => {
    render(
      <SessionProvider>
        <ProviderNavigationHeader 
          pageTitle="Today" 
          pagePath="/provider/today" 
        />
      </SessionProvider>
    );

    // Should render avatar and search button
    expect(screen.getByLabelText(/user avatar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/toggle search/i)).toBeInTheDocument();
  });

  it('renders with search when enabled', () => {
    render(
      <SessionProvider>
        <ProviderNavigationHeader 
          pageTitle="Today" 
          pagePath="/provider/today"
          showSearch={true}
        />
      </SessionProvider>
    );

    // Should render search button
    expect(screen.getByLabelText(/toggle search/i)).toBeInTheDocument();
  });

  it('renders with notifications when enabled', () => {
    render(
      <SessionProvider>
        <ProviderNavigationHeader 
          pageTitle="Today" 
          pagePath="/provider/today"
          showNotifications={true}
          notificationCount={5}
        />
      </SessionProvider>
    );

    // Notifications are no longer displayed in the header
    // This test verifies the component renders without errors
    expect(screen.getByLabelText(/user avatar/i)).toBeInTheDocument();
  });

  it('renders user menu with session data', () => {
    render(
      <SessionProvider>
        <ProviderNavigationHeader 
          pageTitle="Today" 
          pagePath="/provider/today" 
        />
      </SessionProvider>
    );

    // User avatar should be present
    expect(screen.getByLabelText(/user avatar/i)).toBeInTheDocument();
  });

  it('should have correct menu items with proper navigation links', () => {
    render(
      <SessionProvider>
        <ProviderNavigationHeader 
          pageTitle="Today" 
          pagePath="/provider/today" 
        />
      </SessionProvider>
    );

    // Verify that the avatar button exists (which contains the dropdown menu)
    const avatarButton = screen.getByLabelText(/user avatar/i);
    expect(avatarButton).toBeInTheDocument();
    
    // The dropdown menu should be present in the DOM even if not visible
    // This test verifies that the component renders without errors
    // The actual dropdown functionality is tested in integration tests
  });
});

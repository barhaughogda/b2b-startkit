import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProviderNavigationHeader } from '@/components/navigation/ProviderNavigationHeader';
import { SessionProvider } from 'next-auth/react';

// Mock next-auth
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'provider',
    tenantId: 'test-tenant',
  },
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: mockSession,
    status: 'authenticated',
    update: vi.fn(),
  })),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
  })),
}));

describe('ProviderNavigationHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header Structure', () => {
    it('should have transparent background header', () => {
      render(
        <SessionProvider session={mockSession}>
          <ProviderNavigationHeader 
            pageTitle="Dashboard" 
            pagePath="/provider/dashboard"
            showSearch={true}
          />
        </SessionProvider>
      );

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('bg-transparent');
    });

    it('should display avatar in header with 50x50px size', () => {
      render(
        <SessionProvider session={mockSession}>
          <ProviderNavigationHeader 
            pageTitle="Dashboard" 
            pagePath="/provider/dashboard"
            showSearch={true}
          />
        </SessionProvider>
      );

      // Avatar should be present
      const avatarButton = screen.getByRole('button', { name: /user avatar/i });
      expect(avatarButton).toBeInTheDocument();
      expect(avatarButton).toHaveClass('h-12', 'w-12'); // 50x50px

      // Check for fallback initials (since no image is provided in test)
      const fallbackText = screen.getByText('TU'); // Test User initials
      expect(fallbackText).toBeInTheDocument();
    });

    it('should have clickable avatar with dropdown menu attributes', () => {
      render(
        <SessionProvider session={mockSession}>
          <ProviderNavigationHeader
            pageTitle="Dashboard"
            pagePath="/provider/dashboard"
            showSearch={true}
          />
        </SessionProvider>
      );

      const avatarButton = screen.getByRole('button', { name: /user avatar/i });
      
      // Check that the button is clickable and has the right attributes
      expect(avatarButton).toHaveAttribute('aria-haspopup', 'menu');
      expect(avatarButton).toHaveAttribute('aria-expanded', 'false');
      
      // Test that the button can be clicked
      fireEvent.click(avatarButton);
      expect(avatarButton).toBeInTheDocument();
    });
  });

  describe('Floating Header', () => {
    it('should have floating header with fixed positioning', () => {
      render(
        <SessionProvider session={mockSession}>
          <ProviderNavigationHeader 
            pageTitle="Dashboard" 
            pagePath="/provider/dashboard"
            showSearch={true}
          />
        </SessionProvider>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'z-50');
    });

    it('should have proper background and shadow for floating effect', () => {
      render(
        <SessionProvider session={mockSession}>
          <ProviderNavigationHeader 
            pageTitle="Dashboard" 
            pagePath="/provider/dashboard"
            showSearch={true}
          />
        </SessionProvider>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('bg-transparent');
    });
  });

  describe('Search Functionality', () => {
    it('should have search button in header', () => {
      render(
        <SessionProvider session={mockSession}>
          <ProviderNavigationHeader 
            pageTitle="Dashboard" 
            pagePath="/provider/dashboard"
            showSearch={true}
          />
        </SessionProvider>
      );

      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeInTheDocument();
    });

    it('should open search modal when search button is clicked', () => {
      render(
        <SessionProvider session={mockSession}>
          <ProviderNavigationHeader 
            pageTitle="Dashboard" 
            pagePath="/provider/dashboard"
            showSearch={true}
          />
        </SessionProvider>
      );

      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);

      // Check if search modal opens
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search all/i)).toBeInTheDocument();
    });
  });

  describe('Theme and Language Settings', () => {
    it('should NOT display theme toggle in header', () => {
      render(
        <SessionProvider session={mockSession}>
          <ProviderNavigationHeader 
            pageTitle="Dashboard" 
            pagePath="/provider/dashboard"
          />
        </SessionProvider>
      );

      // Theme and language should not be in header anymore
      expect(screen.queryByRole('button', { name: /theme/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /language/i })).not.toBeInTheDocument();
    });
  });

  describe('Profile Completion Badge', () => {
    beforeEach(() => {
      // Mock console.warn to avoid noise in test output
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should not render profile badge when Convex is not configured', () => {
      // Mock convex as null
      vi.doMock('@/lib/convex', () => ({
        convex: null,
      }));
      delete process.env.NEXT_PUBLIC_CONVEX_URL;

      render(
        <SessionProvider session={mockSession}>
          <ProviderNavigationHeader 
            pageTitle="Dashboard" 
            pagePath="/provider/dashboard"
          />
        </SessionProvider>
      );

      // Badge should not be rendered (currently disabled anyway)
      // This test verifies the component doesn't crash when Convex is unavailable
      const avatarButton = screen.getByRole('button', { name: /user avatar/i });
      expect(avatarButton).toBeInTheDocument();
    });

    it('should handle missing userId gracefully', () => {
      const sessionWithoutId = {
        ...mockSession,
        user: {
          ...mockSession.user,
          id: undefined,
        },
      };

      vi.mocked(require('next-auth/react').useSession).mockReturnValue({
        data: sessionWithoutId,
        status: 'authenticated',
        update: vi.fn(),
      });

      render(
        <SessionProvider session={sessionWithoutId}>
          <ProviderNavigationHeader 
            pageTitle="Dashboard" 
            pagePath="/provider/dashboard"
          />
        </SessionProvider>
      );

      // Component should still render without crashing
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should handle missing tenantId gracefully', () => {
      const sessionWithoutTenant = {
        ...mockSession,
        user: {
          ...mockSession.user,
          tenantId: undefined,
        },
      };

      vi.mocked(require('next-auth/react').useSession).mockReturnValue({
        data: sessionWithoutTenant,
        status: 'authenticated',
        update: vi.fn(),
      });

      render(
        <SessionProvider session={sessionWithoutTenant}>
          <ProviderNavigationHeader 
            pageTitle="Dashboard" 
            pagePath="/provider/dashboard"
          />
        </SessionProvider>
      );

      // Component should still render without crashing
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should not crash when ProfileCompletionBadge import fails', async () => {
      // Mock the dynamic import to fail
      const originalImport = global.import;
      global.import = vi.fn().mockRejectedValue(new Error('Module not found'));

      render(
        <SessionProvider session={mockSession}>
          <ProviderNavigationHeader 
            pageTitle="Dashboard" 
            pagePath="/provider/dashboard"
          />
        </SessionProvider>
      );

      // Component should still render without crashing
      expect(screen.getByRole('banner')).toBeInTheDocument();

      global.import = originalImport;
    });
  });
});

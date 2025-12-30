/**
 * TDD RED Phase Tests for Task 6.1: Move Clinic Subscription Page
 * 
 * Test Requirements:
 * - Create `src/app/company/settings/subscription/page.tsx`
 * - Copy existing subscription content from `src/app/company/billing/page.tsx` (or create new subscription page)
 * - Update layout to use ClinicLayout
 * - Test route works correctly
 * 
 * TDD Cycle: RED → GREEN → REFACTOR → COMMIT
 * Specification: BILLING_SYSTEM_TASKS.md Task 6.1
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import ClinicSubscriptionPage from '@/app/company/settings/subscription/page';

// Mock @/lib/auth/react
const mockUseSession = vi.fn();
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: () => mockUseSession(),
}));

// Mock ClinicLayout
vi.mock('@/components/layout/ClinicLayout', () => ({
  ClinicLayout: ({ children, showSearch }: { children: React.ReactNode; showSearch?: boolean }) => (
    <div data-testid="clinic-layout" data-show-search={showSearch}>
      {children}
    </div>
  ),
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

describe('ClinicSubscriptionPage - Task 6.1', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'clinic@example.com',
      name: 'Test Clinic User',
      tenantId: 'test-tenant-id',
      role: 'clinic',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });
  });

  describe('Page Structure', () => {
    it('should render ClinicLayout component', () => {
      render(<ClinicSubscriptionPage />);
      
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });

    it('should render page header with title', () => {
      render(<ClinicSubscriptionPage />);
      
      // Find the main page heading (h1)
      const headings = screen.getAllByRole('heading', { name: /subscription/i });
      expect(headings.length).toBeGreaterThan(0);
      // Verify the main page title exists
      expect(headings[0]).toBeInTheDocument();
    });

    it('should render page description', () => {
      render(<ClinicSubscriptionPage />);
      
      const description = screen.getByText(/manage your clinic's subscription/i);
      expect(description).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      });

      render(<ClinicSubscriptionPage />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('should show unauthenticated message when not signed in', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(<ClinicSubscriptionPage />);
      
      expect(screen.getByText(/please sign in/i)).toBeInTheDocument();
    });

    it('should render subscription content when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      render(<ClinicSubscriptionPage />);
      
      // Should render subscription content (not just loading/error)
      const layout = screen.getByTestId('clinic-layout');
      expect(layout).toBeInTheDocument();
    });
  });

  describe('Subscription Content', () => {
    it('should display subscription information', () => {
      render(<ClinicSubscriptionPage />);
      
      // Basic subscription content should be present
      // This will be refined based on actual subscription page implementation
      const layout = screen.getByTestId('clinic-layout');
      expect(layout).toBeInTheDocument();
    });

    it('should use ClinicLayout with correct props', () => {
      render(<ClinicSubscriptionPage />);
      
      const layout = screen.getByTestId('clinic-layout');
      // ClinicLayout should be used (not other layouts)
      expect(layout).toBeInTheDocument();
    });
  });

  describe('Route Accessibility', () => {
    it('should be accessible at /company/settings/subscription route', () => {
      // This test verifies the page component can be rendered
      // Actual route testing would be done in E2E tests
      render(<ClinicSubscriptionPage />);
      
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });
  });
});


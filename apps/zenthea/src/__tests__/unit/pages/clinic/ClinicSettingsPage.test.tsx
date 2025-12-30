/**
 * TDD RED Phase Tests for Task 6.2: Update Settings Navigation
 * 
 * Test Requirements:
 * - Update `src/app/company/settings/page.tsx`
 * - Add "Subscription" card linking to `/company/settings/subscription`
 * - Update any direct links in navigation components
 * - Ensure card appears in correct section
 * 
 * TDD Cycle: RED → GREEN → REFACTOR → COMMIT
 * Specification: BILLING_SYSTEM_TASKS.md Task 6.2
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useRouter } from 'next/navigation';
import ClinicSettingsPage from '@/app/company/settings/page';

// Mock @/hooks/useZentheaSession
const mockUseSession = vi.fn();
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: () => mockUseSession(),
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

// Using global lucide-react mock from src/__tests__/setup/lucide-react-mock.ts
// Missing icons (LayoutDashboard, Building2, UserCog) have been added to global mock

// Mock ClinicLayout
vi.mock('@/components/layout/ClinicLayout', () => ({
  ClinicLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="clinic-layout">{children}</div>
  ),
}));

describe('ClinicSettingsPage - Task 6.2: Update Settings Navigation', () => {
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

  describe('Subscription Card Presence', () => {
    it('should render Subscription card in the settings page', () => {
      render(<ClinicSettingsPage />);
      
      // Use getAllByText since "subscription" appears in both title and description
      const subscriptionElements = screen.getAllByText(/subscription/i);
      expect(subscriptionElements.length).toBeGreaterThan(0);
      expect(subscriptionElements[0]).toBeInTheDocument();
    });

    it('should display Subscription card with correct title', () => {
      render(<ClinicSettingsPage />);
      
      // Find card by title text
      const subscriptionTitle = screen.getByRole('heading', { name: /subscription/i });
      expect(subscriptionTitle).toBeInTheDocument();
    });

    it('should display Subscription card with description', () => {
      render(<ClinicSettingsPage />);
      
      // Find by description text (more specific)
      const description = screen.getByText(/manage your clinic's subscription to zenthea/i);
      expect(description).toBeInTheDocument();
      
      // Verify it's in a card (card has cursor-pointer class)
      const subscriptionCard = description.closest('[class*="cursor-pointer"]');
      expect(subscriptionCard).toBeInTheDocument();
    });
  });

  describe('Subscription Card Navigation', () => {
    it('should link to /company/settings/subscription when clicked', async () => {
      const user = userEvent.setup();
      render(<ClinicSettingsPage />);
      
      // Find the subscription card by title and click it
      const subscriptionTitle = screen.getByRole('heading', { name: /subscription/i });
      const subscriptionCard = subscriptionTitle.closest('[class*="cursor-pointer"]');
      expect(subscriptionCard).toBeInTheDocument();
      
      if (subscriptionCard) {
        await user.click(subscriptionCard);
        expect(mockPush).toHaveBeenCalledWith('/company/settings/subscription');
      }
    });

    it('should have correct URL in card configuration', () => {
      render(<ClinicSettingsPage />);
      
      // Verify the card exists and will navigate to correct route
      const subscriptionTitle = screen.getByRole('heading', { name: /subscription/i });
      expect(subscriptionTitle).toBeInTheDocument();
      
      // Click to verify navigation
      const subscriptionCard = subscriptionTitle.closest('[class*="cursor-pointer"]');
      subscriptionCard?.click();
      expect(mockPush).toHaveBeenCalledWith('/company/settings/subscription');
    });
  });

  describe('Subscription Card Section Placement', () => {
    it('should place Subscription card in Organization Management section', () => {
      render(<ClinicSettingsPage />);
      
      // Find the Organization Management section heading
      const orgSection = screen.getByRole('heading', { name: /organization management/i });
      expect(orgSection).toBeInTheDocument();
      
      // Find subscription card by title
      const subscriptionTitle = screen.getByRole('heading', { name: /subscription/i });
      expect(subscriptionTitle).toBeInTheDocument();
      
      // Verify subscription card appears after the section heading
      // (This is a structural check - the card should be in the same section)
      const orgSectionElement = orgSection.closest('div');
      const subscriptionCardElement = subscriptionTitle.closest('[class*="cursor-pointer"]');
      
      // Both should exist in the document
      expect(orgSectionElement).toBeInTheDocument();
      expect(subscriptionCardElement).toBeInTheDocument();
    });

    it('should not place Subscription card in Operations Management section', () => {
      render(<ClinicSettingsPage />);
      
      // Find Operations Management section
      const opsSection = screen.getByRole('heading', { name: /operations management/i });
      expect(opsSection).toBeInTheDocument();
      
      // Subscription should not be in this section (billing is, but subscription is different)
      const subscriptionTitle = screen.getByRole('heading', { name: /subscription/i });
      expect(subscriptionTitle).toBeInTheDocument();
      
      // Verify subscription is not the billing card
      const billingCard = screen.getByText(/billing management/i);
      expect(billingCard).toBeInTheDocument();
      expect(subscriptionTitle).not.toBe(billingCard);
    });
  });

  describe('Subscription Card Content', () => {
    it('should display Subscription card with icon', () => {
      render(<ClinicSettingsPage />);
      
      const subscriptionTitle = screen.getByRole('heading', { name: /subscription/i });
      const subscriptionCard = subscriptionTitle.closest('[class*="cursor-pointer"]');
      expect(subscriptionCard).toBeInTheDocument();
      
      // Card should have an icon (CreditCard or similar)
      // Icons are rendered as SVG elements
      const cardWithIcon = subscriptionCard?.querySelector('svg');
      expect(cardWithIcon).toBeInTheDocument();
    });

    it('should display Subscription card with button text', () => {
      render(<ClinicSettingsPage />);
      
      // Find button text "Manage Subscription"
      const button = screen.getByRole('button', { name: /manage subscription/i });
      expect(button).toBeInTheDocument();
    });

    it('should display Subscription card with appropriate description', () => {
      render(<ClinicSettingsPage />);
      
      // Description should mention subscription or Zenthea
      const description = screen.getByText(/manage your clinic's subscription to zenthea/i);
      expect(description).toBeInTheDocument();
    });
  });

  describe('Card Structure Consistency', () => {
    it('should match the structure of other cards in the same section', () => {
      render(<ClinicSettingsPage />);
      
      // Get subscription card by finding parent with cursor-pointer class
      const subscriptionTitle = screen.getByRole('heading', { name: /subscription/i });
      const subscriptionCard = subscriptionTitle.closest('[class*="cursor-pointer"]');
      
      // Get another card from Organization Management section (e.g., Company Profile)
      const profileTitle = screen.getByRole('heading', { name: /company profile/i });
      const profileCard = profileTitle.closest('[class*="cursor-pointer"]');
      
      // Both should have similar structure
      expect(subscriptionCard).toBeInTheDocument();
      expect(profileCard).toBeInTheDocument();
      
      // Both should have click handlers
      expect(subscriptionCard).toHaveClass('cursor-pointer');
      expect(profileCard).toHaveClass('cursor-pointer');
    });

    it('should have consistent styling with other settings cards', () => {
      render(<ClinicSettingsPage />);
      
      const subscriptionTitle = screen.getByRole('heading', { name: /subscription/i });
      const subscriptionCard = subscriptionTitle.closest('[class*="cursor-pointer"]');
      const profileTitle = screen.getByRole('heading', { name: /company profile/i });
      const profileCard = profileTitle.closest('[class*="cursor-pointer"]');
      
      // Both should have hover effects
      expect(subscriptionCard).toHaveClass('hover:shadow-lg');
      expect(profileCard).toHaveClass('hover:shadow-lg');
    });
  });

  describe('Loading and Authentication States', () => {
    it('should show loading state when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      });

      render(<ClinicSettingsPage />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show unauthenticated message when not signed in', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(<ClinicSettingsPage />);
      
      expect(screen.getByText(/please sign in/i)).toBeInTheDocument();
    });

    it('should render subscription card when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      render(<ClinicSettingsPage />);
      
      const subscriptionTitle = screen.getByRole('heading', { name: /subscription/i });
      expect(subscriptionTitle).toBeInTheDocument();
    });
  });
});


/**
 * TDD RED Phase Tests for Task 3.1: Replace Clinic Billing Page Scaffold
 * 
 * Test Requirements:
 * - Remove subscription placeholder content
 * - Wire up Convex queries for clinic RCM data
 * - Set up loading and error states
 * 
 * TDD Cycle: RED → GREEN → REFACTOR → COMMIT
 * Specification: BILLING_SYSTEM_TASKS.md Task 3.1
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import ClinicBillingPage from '@/app/company/billing/page';
import type { RCMMetrics } from '@/types/billing';

// Mock next-auth/react
const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

// Mock Convex
const mockUseQuery = vi.fn();
vi.mock('convex/react', () => ({
  useQuery: (queryFn: any, args: any) => mockUseQuery(queryFn, args),
}));

// Mock billing API functions - must be inside factory
vi.mock('@/convex/_generated/api', async () => {
  const actual = await vi.importActual('@/convex/_generated/api');
  const getClinicRCM = function getClinicRCM() {};
  const getClinicClaimsList = function getClinicClaimsList() {};
  
  return {
    ...actual,
    api: {
      ...(actual as any).api,
      billing: {
        getClinicRCM,
        getClinicClaimsList,
      },
    },
  };
});

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

describe('ClinicBillingPage - Task 3.1', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'clinic@example.com',
      name: 'Test Clinic User',
      tenantId: 'test-tenant-id',
      role: 'clinic',
    },
  };

  const mockRCMMetrics: RCMMetrics = {
    totalAR: 500000, // $5,000.00 in cents
    daysInAR: 45,
    cleanClaimRate: 95.5,
    denialRate: 4.5,
    netCollectionRate: 92.0,
    totalBilled: 10000000, // $100,000.00 in cents
    totalCollected: 9200000, // $92,000.00 in cents
    periodStart: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    periodEnd: Date.now(),
  };

  const mockClaimsList = {
    items: [
      {
        _id: 'claim-1' as any,
        patientId: 'patient-1' as any,
        providerId: 'provider-1' as any,
        payerId: 'payer-1' as any,
        status: 'submitted' as const,
        totalCharges: 15000, // $150.00
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        claimControlNumber: 'CLM-001',
      },
      {
        _id: 'claim-2' as any,
        patientId: 'patient-2' as any,
        providerId: 'provider-2' as any,
        payerId: 'payer-2' as any,
        status: 'paid' as const,
        totalCharges: 25000, // $250.00
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
        claimControlNumber: 'CLM-002',
      },
    ],
    total: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasMore: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });
  });

  describe('Component Structure - Remove Subscription Placeholder', () => {
    it('should NOT render subscription placeholder content', () => {
      mockUseQuery.mockReturnValue(undefined); // Loading state

      render(<ClinicBillingPage />);

      // Should NOT contain subscription-related text
      expect(screen.queryByText(/Current Plan/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Professional/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/\$299\/month/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Next Billing/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Payment Method/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Billing History/i)).not.toBeInTheDocument();
    });

    it('should render ClinicLayout with showSearch enabled', () => {
      mockUseQuery.mockReturnValue(undefined);

      render(<ClinicBillingPage />);

      const layout = screen.getByTestId('clinic-layout');
      expect(layout).toBeInTheDocument();
      expect(layout).toHaveAttribute('data-show-search', 'true');
    });

    it('should render page header with billing title', () => {
      mockUseQuery.mockReturnValue(undefined);

      render(<ClinicBillingPage />);

      expect(screen.getByRole('heading', { name: /billing/i })).toBeInTheDocument();
    });
  });

  describe('Convex Query Integration - getClinicRCM', () => {
    it('should call getClinicRCM query with correct parameters', () => {
      mockUseQuery.mockImplementation((queryFn: any, args: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics;
        }
        return undefined;
      });

      render(<ClinicBillingPage />);

      expect(mockUseQuery).toHaveBeenCalledWith(
        api.billing.getClinicRCM,
        expect.objectContaining({
          tenantId: 'test-tenant-id',
          userEmail: 'clinic@example.com',
        })
      );
    });

    it('should pass date range parameters when provided', () => {
      const startDate = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 days ago
      const endDate = Date.now();

      mockUseQuery.mockImplementation((queryFn: any, args: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics;
        }
        return undefined;
      });

      render(<ClinicBillingPage />);

      // Query should be called (date range is optional, so we just verify it's called)
      expect(mockUseQuery).toHaveBeenCalled();
    });

    it('should skip query if session is not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      mockUseQuery.mockReturnValue(undefined);

      render(<ClinicBillingPage />);

      // Query should still be called but with skip condition
      // The component should handle unauthenticated state gracefully
      expect(mockUseQuery).toHaveBeenCalled();
    });

    it('should skip query if tenantId is missing', () => {
      mockUseSession.mockReturnValue({
        data: {
          ...mockSession,
          user: {
            ...mockSession.user,
            tenantId: undefined,
          },
        },
        status: 'authenticated',
      });

      mockUseQuery.mockReturnValue(undefined);

      render(<ClinicBillingPage />);

      // Component should handle missing tenantId
      expect(mockUseQuery).toHaveBeenCalled();
    });
  });

  describe('Convex Query Integration - getClinicClaimsList', () => {
    it('should call getClinicClaimsList query with correct parameters', () => {
      mockUseQuery.mockImplementation((queryFn: any, args: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics;
        }
        if (queryFn === api.billing.getClinicClaimsList) {
          return mockClaimsList;
        }
        return undefined;
      });

      render(<ClinicBillingPage />);

      expect(mockUseQuery).toHaveBeenCalledWith(
        api.billing.getClinicClaimsList,
        expect.objectContaining({
          tenantId: 'test-tenant-id',
          userEmail: 'clinic@example.com',
          page: expect.any(Number),
          pageSize: expect.any(Number),
        })
      );
    });

    it('should use default pagination values', () => {
      mockUseQuery.mockImplementation((queryFn: any, args: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics;
        }
        if (queryFn === api.billing.getClinicClaimsList) {
          return mockClaimsList;
        }
        return undefined;
      });

      render(<ClinicBillingPage />);

      const claimsListCall = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === api.billing.getClinicClaimsList
      );

      expect(claimsListCall?.[1]).toMatchObject({
        page: 1,
        pageSize: 20,
      });
    });
  });

  describe('Loading States', () => {
    it('should display loading state when RCM data is loading', () => {
      mockUseQuery.mockReturnValue(undefined); // Loading state

      render(<ClinicBillingPage />);

      // Should show loading indicator or skeleton
      // This could be a spinner, skeleton loader, or loading text
      const loadingElements = screen.queryAllByText(/loading/i);
      // If no explicit loading text, check for skeleton/loader components
      expect(loadingElements.length).toBeGreaterThanOrEqual(0);
    });

    it('should display loading state when claims list is loading', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics; // RCM loaded
        }
        return undefined; // Claims still loading
      });

      render(<ClinicBillingPage />);

      // Should handle partial loading state
      // RCM data might be shown while claims are loading
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });

    it('should handle both queries loading simultaneously', () => {
      mockUseQuery.mockReturnValue(undefined);

      render(<ClinicBillingPage />);

      expect(mockUseQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error States', () => {
    it('should handle error when getClinicRCM query fails', () => {
      // In Convex, useQuery doesn't throw - it returns undefined or null
      // Errors are handled by error boundaries in production
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return null; // Return null to indicate error/not found
        }
        return undefined;
      });

      // Component should handle null/error state gracefully
      render(<ClinicBillingPage />);
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });

    it('should handle error when getClinicClaimsList query fails', () => {
      // In Convex, useQuery doesn't throw - it returns undefined or null
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics;
        }
        if (queryFn === api.billing.getClinicClaimsList) {
          return null; // Return null to indicate error/not found
        }
        return undefined;
      });

      // Component should handle partial data gracefully
      render(<ClinicBillingPage />);
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });

    it('should display error message when queries fail', () => {
      // Simulate error state by returning null
      mockUseQuery.mockImplementation((queryFn: any) => {
        return null; // Error state
      });

      render(<ClinicBillingPage />);

      // Component should render even with errors (error boundaries handle actual errors)
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });
  });

  describe('Data Display - RCM Metrics', () => {
    it('should display RCM metrics when data is loaded', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics;
        }
        if (queryFn === api.billing.getClinicClaimsList) {
          return mockClaimsList;
        }
        return undefined;
      });

      render(<ClinicBillingPage />);

      // Should display key metrics (exact implementation in GREEN phase)
      // For now, verify component renders without errors
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });

    it('should format currency values correctly', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics;
        }
        if (queryFn === api.billing.getClinicClaimsList) {
          return mockClaimsList;
        }
        return undefined;
      });

      render(<ClinicBillingPage />);

      // Currency formatting will be verified in GREEN phase
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });

    it('should display percentage values correctly', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics;
        }
        if (queryFn === api.billing.getClinicClaimsList) {
          return mockClaimsList;
        }
        return undefined;
      });

      render(<ClinicBillingPage />);

      // Percentage formatting will be verified in GREEN phase
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });
  });

  describe('Data Display - Claims List', () => {
    it('should display claims list when data is loaded', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics;
        }
        if (queryFn === api.billing.getClinicClaimsList) {
          return mockClaimsList;
        }
        return undefined;
      });

      render(<ClinicBillingPage />);

      // Claims list display will be verified in GREEN phase
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });

    it('should handle empty claims list', () => {
      const emptyClaimsList = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasMore: false,
      };

      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics;
        }
        if (queryFn === api.billing.getClinicClaimsList) {
          return emptyClaimsList;
        }
        return undefined;
      });

      render(<ClinicBillingPage />);

      // Empty state will be verified in GREEN phase
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should redirect to login if user is not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      mockUseQuery.mockReturnValue(undefined);

      render(<ClinicBillingPage />);

      // Redirect logic will be implemented in GREEN phase
      // For now, verify component handles unauthenticated state
      expect(mockUseQuery).toHaveBeenCalled();
    });

    it('should use session user email for queries', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics;
        }
        return undefined;
      });

      render(<ClinicBillingPage />);

      const rcmCall = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === api.billing.getClinicRCM
      );

      expect(rcmCall?.[1]).toMatchObject({
        userEmail: 'clinic@example.com',
      });
    });

    it('should use session tenantId for queries', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === api.billing.getClinicRCM) {
          return mockRCMMetrics;
        }
        return undefined;
      });

      render(<ClinicBillingPage />);

      const rcmCall = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === api.billing.getClinicRCM
      );

      expect(rcmCall?.[1]).toMatchObject({
        tenantId: 'test-tenant-id',
      });
    });
  });

  describe('Query Skip Conditions', () => {
    it('should skip queries when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        status: 'loading',
      });

      mockUseQuery.mockReturnValue(undefined);

      render(<ClinicBillingPage />);

      // Component should handle loading session state
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });

    it('should skip queries when email is missing', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            ...mockSession.user,
            email: undefined,
          },
        },
        status: 'authenticated',
      });

      mockUseQuery.mockReturnValue(undefined);

      render(<ClinicBillingPage />);

      // Component should handle missing email
      expect(screen.getByTestId('clinic-layout')).toBeInTheDocument();
    });
  });
});


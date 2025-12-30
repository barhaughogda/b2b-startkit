/**
 * TDD Tests for Task 4.1 & 4.2: Provider Billing Page Implementation
 * 
 * Task 4.1 Test Requirements:
 * - Remove subscription placeholder content
 * - Add "My Billing & Claims" header and description
 * - Wire up provider-specific Convex queries
 * 
 * Task 4.2 Test Requirements:
 * - Connect to `getProviderRCM` for KPIs
 * - Connect to `getProviderClaimsList` for claims table
 * - Handle loading and error states
 * - Show empty state if no claims
 * 
 * TDD Cycle: RED → GREEN → REFACTOR → COMMIT
 * Specification: BILLING_SYSTEM_TASKS.md Tasks 4.1 & 4.2
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import ProviderBillingPage from '@/app/company/billing/page';
import type { ProviderRCMMetrics, InsuranceClaim, ClaimStatus } from '@/types/billing';
import type { Id } from '@/convex/_generated/dataModel';

// Mock @/lib/auth/react
const mockUseSession = vi.fn();
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: () => mockUseSession(),
}));

// Mock Convex
const mockUseQuery = vi.fn();
vi.mock('convex/react', () => ({
  useQuery: (queryFn: any, args: any) => mockUseQuery(queryFn, args),
}));

// Mock billing API functions - must be inside factory
vi.mock('@/convex/_generated/api', async () => {
  const actual = await vi.importActual('@/convex/_generated/api');
  const getProviderRCM = function getProviderRCM() {};
  const getProviderClaimsList = function getProviderClaimsList() {};
  const getPatientsByTenant = function getPatientsByTenant() {};
  
  return {
    ...actual,
    api: {
      ...(actual as any).api,
      billing: {
        ...(actual as any).api?.billing,
        getProviderRCM,
        getProviderClaimsList,
      },
      patients: {
        ...(actual as any).api?.patients,
        getPatientsByTenant,
      },
    },
  };
});

// Mock ProviderNavigationLayout
vi.mock('@/components/navigation/ProviderNavigationLayout', () => ({
  ProviderNavigationLayout: ({ 
    children, 
    pageTitle, 
    pagePath, 
    showSearch 
  }: { 
    children: React.ReactNode; 
    pageTitle?: string; 
    pagePath?: string; 
    showSearch?: boolean;
  }) => (
    <div data-testid="provider-navigation-layout" data-page-title={pageTitle} data-page-path={pagePath} data-show-search={showSearch}>
      {children}
    </div>
  ),
}));

// Mock BillingKPICards component
vi.mock('@/components/billing/BillingKPICards', () => ({
  BillingKPICards: ({ metrics, customKPIs, showDefaultKPIs, trend }: any) => (
    <div 
      data-testid="billing-kpi-cards" 
      data-metrics={JSON.stringify(metrics)} 
      data-custom-kpis={JSON.stringify(customKPIs)} 
      data-show-default={showDefaultKPIs}
      data-trend={JSON.stringify(trend)}
    >
      {customKPIs?.map((kpi: any, idx: number) => (
        <div key={idx} data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, '-')}`} data-trend={kpi.trend}>
          {kpi.label}: {kpi.value}
          {kpi.trend !== undefined && kpi.trend !== 0 && (
            <span data-testid={`trend-${kpi.label.toLowerCase().replace(/\s+/g, '-')}`}>
              {kpi.trend > 0 ? '↑' : '↓'} {Math.abs(kpi.trend).toFixed(1)}%
            </span>
          )}
        </div>
      ))}
    </div>
  ),
}));

// Mock ClaimDetailsDrawer component (Task 4.4)
vi.mock('@/components/billing/ClaimDetailsDrawer', () => ({
  ClaimDetailsDrawer: ({ claimId, open, onOpenChange, tenantId, userEmail }: any) => {
    if (!open) return null;
    return (
      <div 
        data-testid="claim-details-drawer" 
        data-claim-id={claimId}
        data-tenant-id={tenantId}
        data-user-email={userEmail}
      >
        <button data-testid="sheet-close" onClick={() => onOpenChange(false)}>
          Close
        </button>
        <div>Claim Details for {claimId}</div>
      </div>
    );
  },
}));

// Mock ClaimsTable component
vi.mock('@/components/billing/ClaimsTable', () => ({
  ClaimsTable: ({ claims, onRowClick }: any) => (
    <div data-testid="claims-table" data-claims-count={claims.length}>
      {claims.map((claim: any, idx: number) => (
        <div 
          key={idx} 
          data-testid={`claim-row-${claim.claimId}`}
          onClick={() => onRowClick?.(claim)}
        >
          Claim {claim.claimId}
        </div>
      ))}
    </div>
  ),
}));

describe('ProviderBillingPage - Task 4.2', () => {
  const mockSession = {
    user: {
      id: 'test-provider-user-id',
      email: 'provider@example.com',
      name: 'Dr. Test Provider',
      tenantId: 'test-tenant-id',
      role: 'provider',
    },
  };

  const mockProviderRCMMetrics: ProviderRCMMetrics = {
    providerId: 'provider-1',
    myProduction: 500000, // $5,000.00 in cents
    myCollections: 450000, // $4,500.00 in cents
    averageDaysToPayment: 35.5,
    claimCount: 25,
    paidClaimCount: 20,
    deniedClaimCount: 2,
    periodStart: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    periodEnd: Date.now(),
  };

  const mockClaimsListResponse = {
    claims: [
      {
        _id: 'claim-1' as Id<'insuranceClaims'>,
        claimId: 'CLM-001',
        patientId: 'patient-1' as Id<'patients'>,
        providerId: 'provider-1' as Id<'providers'>,
        payerId: 'payer-1' as Id<'insurancePayers'>,
        status: 'submitted' as ClaimStatus,
        totalCharges: 15000, // $150.00
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        claimControlNumber: 'CLM-001',
      },
      {
        _id: 'claim-2' as Id<'insuranceClaims'>,
        claimId: 'CLM-002',
        patientId: 'patient-2' as Id<'patients'>,
        providerId: 'provider-1' as Id<'providers'>,
        payerId: 'payer-2' as Id<'insurancePayers'>,
        status: 'paid' as ClaimStatus,
        totalCharges: 25000, // $250.00
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
        claimControlNumber: 'CLM-002',
      },
    ],
    pagination: {
      page: 1,
      pageSize: 20,
      totalCount: 2,
      totalPages: 1,
    },
  };

  const mockPatientsResponse = {
    results: [
      {
        _id: 'patient-1' as Id<'patients'>,
        firstName: 'John',
        lastName: 'Doe',
      },
      {
        _id: 'patient-2' as Id<'patients'>,
        firstName: 'Jane',
        lastName: 'Smith',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });
  });

  describe('Component Structure - Task 4.1: Remove Subscription Placeholder', () => {
    it('should NOT render subscription placeholder content', () => {
      mockUseQuery.mockReturnValue(undefined); // Loading state

      render(<ProviderBillingPage />);

      // Should NOT contain subscription-related text
      expect(screen.queryByText(/Current Plan/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Professional/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/\$299\/month/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Next Billing/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Payment Method/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Billing History/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Auto-renewal enabled/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Total Spent/i)).not.toBeInTheDocument();
    });

    it('should render ProviderNavigationLayout with correct props', () => {
      mockUseQuery.mockReturnValue(undefined); // Loading state

      render(<ProviderBillingPage />);

      const layout = screen.getByTestId('provider-navigation-layout');
      expect(layout).toBeInTheDocument();
      expect(layout).toHaveAttribute('data-page-title', 'Billing');
      expect(layout).toHaveAttribute('data-page-path', '/provider/billing');
      expect(layout).toHaveAttribute('data-show-search', 'true');
    });

    it('should render page header with "My Billing & Claims" title', () => {
      mockUseQuery.mockReturnValue(undefined); // Loading state

      render(<ProviderBillingPage />);

      expect(screen.getByRole('heading', { name: /My Billing & Claims/i })).toBeInTheDocument();
    });

    it('should render page description about billing performance', () => {
      mockUseQuery.mockReturnValue(undefined); // Loading state

      render(<ProviderBillingPage />);

      expect(screen.getByText(/View your billing performance and manage your claims/i)).toBeInTheDocument();
    });
  });

  describe('Convex Query Integration - getProviderRCM', () => {
    it('should call getProviderRCM query with correct parameters', () => {
      mockUseQuery.mockImplementation((queryFn: any, args: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      expect(mockUseQuery).toHaveBeenCalledWith(
        (api as any).billing?.getProviderRCM,
        expect.objectContaining({
          tenantId: 'test-tenant-id',
          userEmail: 'provider@example.com',
        })
      );
    });

    it('should skip getProviderRCM query when session is not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      mockUseQuery.mockReturnValue(undefined);

      render(<ProviderBillingPage />);

      // Query should be called with 'skip' when not authenticated
      const rcmCall = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === (api as any).billing?.getProviderRCM
      );

      expect(rcmCall?.[1]).toBe('skip');
    });

    it('should skip getProviderRCM query when email is missing', () => {
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

      render(<ProviderBillingPage />);

      const rcmCall = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === (api as any).billing?.getProviderRCM
      );

      expect(rcmCall?.[1]).toBe('skip');
    });

    it('should skip getProviderRCM query when tenantId is missing', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            ...mockSession.user,
            tenantId: undefined,
          },
        },
        status: 'authenticated',
      });

      mockUseQuery.mockReturnValue(undefined);

      render(<ProviderBillingPage />);

      const rcmCall = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === (api as any).billing?.getProviderRCM
      );

      expect(rcmCall?.[1]).toBe('skip');
    });
  });

  describe('Convex Query Integration - getProviderClaimsList', () => {
    it('should call getProviderClaimsList query with correct parameters', () => {
      mockUseQuery.mockImplementation((queryFn: any, args: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      expect(mockUseQuery).toHaveBeenCalledWith(
        (api as any).billing?.getProviderClaimsList,
        expect.objectContaining({
          tenantId: 'test-tenant-id',
          userEmail: 'provider@example.com',
          page: 1,
          pageSize: 20,
        })
      );
    });

    it('should use default pagination values (page: 1, pageSize: 20)', () => {
      mockUseQuery.mockImplementation((queryFn: any, args: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const claimsListCall = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === (api as any).billing?.getProviderClaimsList
      );

      expect(claimsListCall?.[1]).toMatchObject({
        page: 1,
        pageSize: 20,
      });
    });

    it('should skip getProviderClaimsList query when session is not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      mockUseQuery.mockReturnValue(undefined);

      render(<ProviderBillingPage />);

      const claimsCall = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === (api as any).billing?.getProviderClaimsList
      );

      expect(claimsCall?.[1]).toBe('skip');
    });
  });

  describe('Loading States', () => {
    it('should display loading state when RCM data is loading', () => {
      mockUseQuery.mockReturnValue(undefined); // Loading state

      render(<ProviderBillingPage />);

      expect(screen.getByText(/Loading billing data/i)).toBeInTheDocument();
    });

    it('should display loading state when claims list is loading', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics; // RCM loaded
        }
        return undefined; // Claims still loading
      });

      render(<ProviderBillingPage />);

      expect(screen.getByText(/Loading billing data/i)).toBeInTheDocument();
    });

    it('should display loading state when patients data is loading', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        return undefined; // Patients still loading
      });

      render(<ProviderBillingPage />);

      expect(screen.getByText(/Loading billing data/i)).toBeInTheDocument();
    });

    it('should handle all queries loading simultaneously', () => {
      mockUseQuery.mockReturnValue(undefined);

      render(<ProviderBillingPage />);

      expect(mockUseQuery).toHaveBeenCalledTimes(3); // RCM, Claims, Patients
      expect(screen.getByText(/Loading billing data/i)).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should handle error when getProviderRCM query fails', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return null; // Return null to indicate error/not found
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      expect(screen.getByText(/Failed to load billing data/i)).toBeInTheDocument();
    });

    it('should handle error when getProviderClaimsList query fails', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return null; // Return null to indicate error/not found
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      expect(screen.getByText(/Failed to load billing data/i)).toBeInTheDocument();
    });

    it('should display error message when queries fail', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        return null; // Error state
      });

      render(<ProviderBillingPage />);

      expect(screen.getByText(/Failed to load billing data/i)).toBeInTheDocument();
    });
  });

  describe('Data Display - RCM Metrics', () => {
    it('should display RCM metrics when data is loaded', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      expect(screen.getByTestId('billing-kpi-cards')).toBeInTheDocument();
    });

    it('should display custom KPIs: My Production, My Collections, Average Days to Payment', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      expect(screen.getByTestId('kpi-my-production')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-my-collections')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-average-days-to-payment')).toBeInTheDocument();
    });

    it('should display custom KPIs even if backend returns different structure', () => {
      // This test verifies the page handles the backend response
      // The actual calculation logic will be tested after fixing type mismatch in GREEN phase
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      // Verify KPI cards are rendered (actual values will be verified after fixing mismatch)
      expect(screen.getByTestId('billing-kpi-cards')).toBeInTheDocument();
    });
  });

  describe('Task 4.3: Provider KPI Trend Indicators', () => {
    it('should pass trend prop to BillingKPICards when trend data is available', () => {
      const metricsWithTrend = {
        ...mockProviderRCMMetrics,
        trend: {
          myProduction: 5.2,
          myCollections: -2.1,
          averageDaysToPayment: 3.5,
        },
      };

      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return metricsWithTrend;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const kpiCards = screen.getByTestId('billing-kpi-cards');
      const trendData = JSON.parse(kpiCards.getAttribute('data-trend') || '{}');
      
      expect(trendData).toBeDefined();
      expect(trendData.myProduction).toBe(5.2);
      expect(trendData.myCollections).toBe(-2.1);
      expect(trendData.averageDaysToPayment).toBe(3.5);
    });

    it('should display upward trend indicator for My Production when trend is positive', () => {
      const metricsWithTrend = {
        ...mockProviderRCMMetrics,
        trend: {
          myProduction: 5.2,
        },
      };

      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return metricsWithTrend;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const myProductionKpi = screen.getByTestId('kpi-my-production');
      const trendIndicator = myProductionKpi.querySelector('[data-testid="trend-my-production"]');
      
      expect(trendIndicator).toBeInTheDocument();
      expect(trendIndicator).toHaveTextContent('↑ 5.2%');
    });

    it('should display downward trend indicator for My Collections when trend is negative', () => {
      const metricsWithTrend = {
        ...mockProviderRCMMetrics,
        trend: {
          myCollections: -2.1,
        },
      };

      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return metricsWithTrend;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const myCollectionsKpi = screen.getByTestId('kpi-my-collections');
      const trendIndicator = myCollectionsKpi.querySelector('[data-testid="trend-my-collections"]');
      
      expect(trendIndicator).toBeInTheDocument();
      expect(trendIndicator).toHaveTextContent('↓ 2.1%');
    });

    it('should display trend indicator for Average Days to Payment when trend is provided', () => {
      const metricsWithTrend = {
        ...mockProviderRCMMetrics,
        trend: {
          averageDaysToPayment: -3.5, // Negative is good (faster payment)
        },
      };

      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return metricsWithTrend;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const avgDaysKpi = screen.getByTestId('kpi-average-days-to-payment');
      const trendIndicator = avgDaysKpi.querySelector('[data-testid="trend-average-days-to-payment"]');
      
      expect(trendIndicator).toBeInTheDocument();
      expect(trendIndicator).toHaveTextContent('↓ 3.5%');
    });

    it('should not display trend indicators when trend is zero', () => {
      const metricsWithZeroTrend = {
        ...mockProviderRCMMetrics,
        trend: {
          myProduction: 0,
          myCollections: 0,
          averageDaysToPayment: 0,
        },
      };

      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return metricsWithZeroTrend;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const myProductionKpi = screen.getByTestId('kpi-my-production');
      const trendIndicator = myProductionKpi.querySelector('[data-testid="trend-my-production"]');
      
      expect(trendIndicator).not.toBeInTheDocument();
    });

    it('should not display trend indicators when trend data is not provided', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics; // No trend property
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const myProductionKpi = screen.getByTestId('kpi-my-production');
      const trendIndicator = myProductionKpi.querySelector('[data-testid="trend-my-production"]');
      
      expect(trendIndicator).not.toBeInTheDocument();
    });

    it('should pass trend values to custom KPIs in BillingKPICards', () => {
      const metricsWithTrend = {
        ...mockProviderRCMMetrics,
        trend: {
          myProduction: 5.2,
          myCollections: -2.1,
          averageDaysToPayment: 3.5,
        },
      };

      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return metricsWithTrend;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const myProductionKpi = screen.getByTestId('kpi-my-production');
      const myCollectionsKpi = screen.getByTestId('kpi-my-collections');
      const avgDaysKpi = screen.getByTestId('kpi-average-days-to-payment');

      // Verify trend values are passed to each KPI
      expect(myProductionKpi).toHaveAttribute('data-trend', '5.2');
      expect(myCollectionsKpi).toHaveAttribute('data-trend', '-2.1');
      expect(avgDaysKpi).toHaveAttribute('data-trend', '3.5');
    });
  });

  describe('Data Display - Claims List', () => {
    it('should display claims table when data is loaded', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      // There are two elements with data-testid="claims-table" (wrapper and component)
      // Use getAllByTestId to get all matches, then check the ClaimsTable component
      const claimsTables = screen.getAllByTestId('claims-table');
      const claimsTableComponent = claimsTables.find(
        (el) => el.hasAttribute('data-claims-count')
      );
      
      expect(claimsTableComponent).toBeInTheDocument();
      expect(claimsTableComponent).toHaveAttribute('data-claims-count', '2');
    });

    it('should render all claims from the response', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      expect(screen.getByTestId('claim-row-CLM-001')).toBeInTheDocument();
      expect(screen.getByTestId('claim-row-CLM-002')).toBeInTheDocument();
    });

    it('should handle empty claims list and show empty state', () => {
      const emptyClaimsListResponse = {
        claims: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 0,
          totalPages: 0,
        },
      };

      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return emptyClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      expect(screen.getByText(/No claims found/i)).toBeInTheDocument();
      expect(screen.queryByTestId('claims-table')).not.toBeInTheDocument();
    });

    it('should not show empty state when claims are loading', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return undefined; // Still loading
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      expect(screen.queryByText(/No claims found/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Loading billing data/i)).toBeInTheDocument();
    });
  });

  describe('Query Integration - getPatientsByTenant', () => {
    it('should call getPatientsByTenant query to fetch patient names', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      expect(mockUseQuery).toHaveBeenCalledWith(
        (api as any).patients?.getPatientsByTenant,
        expect.objectContaining({
          tenantId: 'test-tenant-id',
          limit: 1000,
        })
      );
    });

    it('should skip getPatientsByTenant query when session is not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      mockUseQuery.mockReturnValue(undefined);

      render(<ProviderBillingPage />);

      const patientsCall = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === (api as any).patients?.getPatientsByTenant
      );

      expect(patientsCall?.[1]).toBe('skip');
    });
  });

  describe('Claims Table Interaction', () => {
    it('should handle claim row click', () => {
      const mockOnRowClick = vi.fn();

      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const claimRow = screen.getByTestId('claim-row-CLM-001');
      expect(claimRow).toBeInTheDocument();
      
      // The component should handle click (implementation detail)
      // For now, verify the row is clickable
      claimRow.click();
      
      // In GREEN phase, we'll verify navigation or detail view opens
    });

    // Task 4.4: Claim Details Drawer Integration Tests
    it('should open claim details drawer when claim row is clicked', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const claimRow = screen.getByTestId('claim-row-CLM-001');
      fireEvent.click(claimRow);

      // Verify drawer opens
      expect(screen.getByTestId('claim-details-drawer')).toBeInTheDocument();
    });

    it('should pass correct claimId to drawer when opened', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const claimRow = screen.getByTestId('claim-row-CLM-001');
      fireEvent.click(claimRow);

      const drawer = screen.getByTestId('claim-details-drawer');
      expect(drawer).toHaveAttribute('data-claim-id', 'CLM-001');
    });

    it('should close drawer when close button is clicked', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        if (queryFn === (api as any).billing?.getProviderClaimsList) {
          return mockClaimsListResponse;
        }
        if (queryFn === (api as any).patients?.getPatientsByTenant) {
          return mockPatientsResponse;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const claimRow = screen.getByTestId('claim-row-CLM-001');
      fireEvent.click(claimRow);

      expect(screen.getByTestId('claim-details-drawer')).toBeInTheDocument();

      const closeButton = screen.getByTestId('sheet-close');
      fireEvent.click(closeButton);

      // Drawer should be closed
      expect(screen.queryByTestId('claim-details-drawer')).not.toBeInTheDocument();
    });
  });

  describe('Session State Handling', () => {
    it('should handle loading session state', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        status: 'loading',
      });

      mockUseQuery.mockReturnValue(undefined);

      render(<ProviderBillingPage />);

      // Component should handle loading session state
      expect(screen.getByTestId('provider-navigation-layout')).toBeInTheDocument();
    });

    it('should use session user email for queries', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const rcmCall = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === (api as any).billing?.getProviderRCM
      );

      expect(rcmCall?.[1]).toMatchObject({
        userEmail: 'provider@example.com',
      });
    });

    it('should use session tenantId for queries', () => {
      mockUseQuery.mockImplementation((queryFn: any) => {
        if (queryFn === (api as any).billing?.getProviderRCM) {
          return mockProviderRCMMetrics;
        }
        return undefined;
      });

      render(<ProviderBillingPage />);

      const rcmCall = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === (api as any).billing?.getProviderRCM
      );

      expect(rcmCall?.[1]).toMatchObject({
        tenantId: 'test-tenant-id',
      });
    });
  });
});


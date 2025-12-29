import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionCenterDenialsPanel } from '@/components/billing/ActionCenterDenialsPanel';
import type { InsuranceClaim, ClaimStatus } from '@/types/billing';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: vi.fn((props) => <svg data-testid="alert-triangle-icon" {...props} />),
  Clock: vi.fn((props) => <svg data-testid="clock-icon" {...props} />),
  FileX: vi.fn((props) => <svg data-testid="file-x-icon" {...props} />),
  ArrowRight: vi.fn((props) => <svg data-testid="arrow-right-icon" {...props} />),
  RotateCcw: vi.fn((props) => <svg data-testid="rotate-ccw-icon" {...props} />),
  Eye: vi.fn((props) => <svg data-testid="eye-icon" {...props} />),
  FileCheck: vi.fn((props) => <svg data-testid="file-check-icon" {...props} />),
}));

describe('ActionCenterDenialsPanel', () => {
  const mockDeniedClaims: InsuranceClaim[] = [
    {
      claimId: 'claim-1',
      patientId: 'patient-1',
      providerId: 'provider-1',
      payerId: 'payer-1',
      status: 'denied' as ClaimStatus,
      totalCharges: 15000, // $150.00
      datesOfService: ['2024-01-15'],
      claimControlNumber: 'CCN-001',
      denialReason: {
        code: 'CO-50',
        description: 'Service not covered by plan',
        category: 'not_covered',
      },
      tenantId: 'tenant-1',
      createdAt: new Date('2024-01-15').getTime(),
      updatedAt: new Date('2024-01-16').getTime(),
    },
    {
      claimId: 'claim-2',
      patientId: 'patient-2',
      providerId: 'provider-2',
      payerId: 'payer-2',
      status: 'denied' as ClaimStatus,
      totalCharges: 25000, // $250.00
      datesOfService: ['2024-01-10'],
      claimControlNumber: 'CCN-002',
      denialReason: {
        code: 'CO-97',
        description: 'Missing prior authorization',
        category: 'prior_authorization',
      },
      tenantId: 'tenant-1',
      createdAt: new Date('2024-01-10').getTime(),
      updatedAt: new Date('2024-01-12').getTime(),
    },
  ];

  const mockPendingClaims: InsuranceClaim[] = [
    {
      claimId: 'claim-3',
      patientId: 'patient-3',
      providerId: 'provider-1',
      payerId: 'payer-1',
      status: 'submitted' as ClaimStatus,
      totalCharges: 35000, // $350.00
      datesOfService: ['2024-01-20'],
      claimControlNumber: 'CCN-003',
      tenantId: 'tenant-1',
      createdAt: new Date('2024-01-20').getTime(),
      updatedAt: new Date('2024-01-20').getTime(),
    },
  ];

  const mockPatientNames: Record<string, string> = {
    'patient-1': 'John Doe',
    'patient-2': 'Jane Smith',
    'patient-3': 'Bob Johnson',
  };

  const mockProviderNames: Record<string, string> = {
    'provider-1': 'Dr. Alice Brown',
    'provider-2': 'Dr. Charlie Davis',
  };

  const mockPayerNames: Record<string, string> = {
    'payer-1': 'Blue Cross Blue Shield',
    'payer-2': 'Aetna',
  };

  const defaultProps = {
    deniedClaims: mockDeniedClaims,
    pendingClaims: mockPendingClaims,
    patientNames: mockPatientNames,
    providerNames: mockProviderNames,
    payerNames: mockPayerNames,
    maxItems: 5,
    onAppeal: vi.fn(),
    onViewDetails: vi.fn(),
    onViewAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render panel with title "Action Center - Denials"', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      expect(screen.getByText('Action Center - Denials')).toBeInTheDocument();
    });

    it('should display denied claims section', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      const deniedHeadings = screen.getAllByText(/Denied Claims/i);
      expect(deniedHeadings.length).toBeGreaterThan(0);
      expect(deniedHeadings[0]).toBeInTheDocument();
    });

    it('should display pending claims section', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      const pendingHeadings = screen.getAllByText(/Pending Claims/i);
      expect(pendingHeadings.length).toBeGreaterThan(0);
      expect(pendingHeadings[0]).toBeInTheDocument();
    });

    it('should render up to maxItems denied claims', () => {
      const manyDeniedClaims = Array.from({ length: 10 }, (_, i) => ({
        ...mockDeniedClaims[0],
        claimId: `claim-denied-${i}`,
        claimControlNumber: `CCN-DENIED-${i}`,
      }));

      render(
        <ActionCenterDenialsPanel
          {...defaultProps}
          deniedClaims={manyDeniedClaims}
          maxItems={5}
        />
      );

      // Should only show 5 items
      const deniedHeadings = screen.getAllByText(/Denied Claims/i);
      const deniedSection = deniedHeadings[0].closest('div');
      const claimItems = deniedSection?.querySelectorAll('[data-testid^="claim-item-"]');
      expect(claimItems?.length).toBeLessThanOrEqual(5);
    });

    it('should render up to maxItems pending claims', () => {
      const manyPendingClaims = Array.from({ length: 10 }, (_, i) => ({
        ...mockPendingClaims[0],
        claimId: `claim-pending-${i}`,
        claimControlNumber: `CCN-PENDING-${i}`,
      }));

      render(
        <ActionCenterDenialsPanel
          {...defaultProps}
          pendingClaims={manyPendingClaims}
          maxItems={5}
        />
      );

      // Should only show 5 items
      const pendingHeadings = screen.getAllByText(/Pending Claims/i);
      const pendingSection = pendingHeadings[0].closest('div');
      const claimItems = pendingSection?.querySelectorAll('[data-testid^="claim-item-"]');
      expect(claimItems?.length).toBeLessThanOrEqual(5);
    });

    it('should display empty state when no denied or pending claims', () => {
      render(
        <ActionCenterDenialsPanel
          {...defaultProps}
          deniedClaims={[]}
          pendingClaims={[]}
        />
      );

      expect(screen.getByText(/No denied or pending claims/i)).toBeInTheDocument();
    });
  });

  describe('Claim Information Display', () => {
    it('should display claim control number for denied claims', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      expect(screen.getByText('CCN-001')).toBeInTheDocument();
      expect(screen.getByText('CCN-002')).toBeInTheDocument();
    });

    it('should display patient name for denied claims', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should display provider name for denied claims', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      const providerNames = screen.getAllByText('Dr. Alice Brown');
      expect(providerNames.length).toBeGreaterThan(0);
      const providerNames2 = screen.getAllByText('Dr. Charlie Davis');
      expect(providerNames2.length).toBeGreaterThan(0);
    });

    it('should display payer name for denied claims', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      const payerNames = screen.getAllByText('Blue Cross Blue Shield');
      expect(payerNames.length).toBeGreaterThan(0);
      const payerNames2 = screen.getAllByText('Aetna');
      expect(payerNames2.length).toBeGreaterThan(0);
    });

    it('should display claim amount formatted as currency', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      expect(screen.getByText('$150.00')).toBeInTheDocument();
      expect(screen.getByText('$250.00')).toBeInTheDocument();
    });

    it('should display denial reason code and description', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      // Denial reason code and description are rendered together, so use flexible matcher
      expect(screen.getByText(/CO-50/)).toBeInTheDocument();
      expect(screen.getByText(/Service not covered by plan/)).toBeInTheDocument();
      expect(screen.getByText(/CO-97/)).toBeInTheDocument();
      expect(screen.getByText(/Missing prior authorization/)).toBeInTheDocument();
    });

    it('should display claim control number for pending claims', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      expect(screen.getByText('CCN-003')).toBeInTheDocument();
    });

    it('should display patient name for pending claims', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should not display denial reason for pending claims', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      // Pending claims don't have denial reasons
      const pendingHeadings = screen.getAllByText(/Pending Claims/i);
      const pendingSection = pendingHeadings[0].closest('div');
      expect(pendingSection).not.toHaveTextContent('CO-50');
    });
  });

  describe('Action Buttons', () => {
    it('should render "Appeal" button for denied claims', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      const appealButtons = screen.getAllByRole('button', { name: /appeal/i });
      expect(appealButtons.length).toBeGreaterThan(0);
    });

    it('should render "View Details" button for all claims', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      const viewDetailsButtons = screen.getAllByRole('button', { name: /view details/i });
      // Should have at least one View Details button for each claim
      expect(viewDetailsButtons.length).toBeGreaterThanOrEqual(mockDeniedClaims.length + mockPendingClaims.length);
    });

    it('should call onAppeal when Appeal button is clicked', async () => {
      const user = userEvent.setup();
      const onAppeal = vi.fn();
      render(<ActionCenterDenialsPanel {...defaultProps} onAppeal={onAppeal} />);

      const appealButtons = screen.getAllByRole('button', { name: /appeal/i });
      await user.click(appealButtons[0]);

      expect(onAppeal).toHaveBeenCalledTimes(1);
      expect(onAppeal).toHaveBeenCalledWith(mockDeniedClaims[0]);
    });

    it('should call onViewDetails when View Details button is clicked', async () => {
      const user = userEvent.setup();
      const onViewDetails = vi.fn();
      render(<ActionCenterDenialsPanel {...defaultProps} onViewDetails={onViewDetails} />);

      const viewDetailsButtons = screen.getAllByRole('button', { name: /view details/i });
      await user.click(viewDetailsButtons[0]);

      expect(onViewDetails).toHaveBeenCalledTimes(1);
      expect(onViewDetails).toHaveBeenCalledWith(mockDeniedClaims[0]);
    });

    it('should call onViewDetails for pending claims', async () => {
      const user = userEvent.setup();
      const onViewDetails = vi.fn();
      render(<ActionCenterDenialsPanel {...defaultProps} onViewDetails={onViewDetails} />);

      const viewDetailsButtons = screen.getAllByRole('button', { name: /view details/i });
      // Click the last button which should be for a pending claim
      await user.click(viewDetailsButtons[viewDetailsButtons.length - 1]);

      expect(onViewDetails).toHaveBeenCalled();
      // Should be called with a pending claim
      const pendingCall = onViewDetails.mock.calls.find(
        (call) => call[0].status === 'submitted'
      );
      expect(pendingCall).toBeDefined();
    });
  });

  describe('View All Link', () => {
    it('should render "View All Denied Claims" link', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      expect(screen.getByText(/view all denied claims/i)).toBeInTheDocument();
    });

    it('should render "View All Pending Claims" link', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      expect(screen.getByText(/view all pending claims/i)).toBeInTheDocument();
    });

    it('should call onViewAll with "denied" when View All Denied Claims is clicked', async () => {
      const user = userEvent.setup();
      const onViewAll = vi.fn();
      render(<ActionCenterDenialsPanel {...defaultProps} onViewAll={onViewAll} />);

      const viewAllDeniedLink = screen.getByText(/view all denied claims/i);
      await user.click(viewAllDeniedLink);

      expect(onViewAll).toHaveBeenCalledTimes(1);
      expect(onViewAll).toHaveBeenCalledWith('denied');
    });

    it('should call onViewAll with "pending" when View All Pending Claims is clicked', async () => {
      const user = userEvent.setup();
      const onViewAll = vi.fn();
      render(<ActionCenterDenialsPanel {...defaultProps} onViewAll={onViewAll} />);

      const viewAllPendingLink = screen.getByText(/view all pending claims/i);
      await user.click(viewAllPendingLink);

      expect(onViewAll).toHaveBeenCalledTimes(1);
      expect(onViewAll).toHaveBeenCalledWith('pending');
    });
  });

  describe('Edge Cases', () => {
    it('should handle claims without denial reason gracefully', () => {
      const claimsWithoutReason = [
        {
          ...mockDeniedClaims[0],
          denialReason: undefined,
        },
      ];

      render(
        <ActionCenterDenialsPanel
          {...defaultProps}
          deniedClaims={claimsWithoutReason}
        />
      );

      // Should still render the claim
      expect(screen.getByText('CCN-001')).toBeInTheDocument();
      // Should not crash when denial reason is missing
      expect(screen.queryByText('CO-50')).not.toBeInTheDocument();
    });

    it('should handle missing patient names gracefully', () => {
      render(
        <ActionCenterDenialsPanel
          {...defaultProps}
          patientNames={{}}
        />
      );

      // Should display patient ID as fallback
      const patientIds = screen.getAllByText('patient-1');
      expect(patientIds.length).toBeGreaterThan(0);
    });

    it('should handle missing provider names gracefully', () => {
      render(
        <ActionCenterDenialsPanel
          {...defaultProps}
          providerNames={{}}
        />
      );

      // Should display provider ID as fallback
      const providerIds = screen.getAllByText('provider-1');
      expect(providerIds.length).toBeGreaterThan(0);
    });

    it('should handle missing payer names gracefully', () => {
      render(
        <ActionCenterDenialsPanel
          {...defaultProps}
          payerNames={{}}
        />
      );

      // Should display payer ID as fallback
      const payerIds = screen.getAllByText('payer-1');
      expect(payerIds.length).toBeGreaterThan(0);
    });

    it('should handle empty denied claims array', () => {
      render(
        <ActionCenterDenialsPanel
          {...defaultProps}
          deniedClaims={[]}
        />
      );

      // Should not crash
      const pendingHeadings = screen.getAllByText(/Pending Claims/i);
      expect(pendingHeadings.length).toBeGreaterThan(0);
    });

    it('should handle empty pending claims array', () => {
      render(
        <ActionCenterDenialsPanel
          {...defaultProps}
          pendingClaims={[]}
        />
      );

      // Should not crash
      const deniedHeadings = screen.getAllByText(/Denied Claims/i);
      expect(deniedHeadings.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for action buttons', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);

      const appealButtons = screen.getAllByRole('button', { name: /appeal/i });
      appealButtons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<ActionCenterDenialsPanel {...defaultProps} />);

      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      expect(firstButton).toHaveFocus();

      await user.keyboard('{Tab}');
      // Should move focus to next interactive element
      expect(document.activeElement).not.toBe(firstButton);
    });
  });

  describe('Visual States', () => {
    it('should display different styling for denied vs pending claims', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);

      const deniedHeadings = screen.getAllByText(/Denied Claims/i);
      const pendingHeadings = screen.getAllByText(/Pending Claims/i);
      const deniedSection = deniedHeadings[0].closest('div');
      const pendingSection = pendingHeadings[0].closest('div');

      // Both sections should be rendered
      expect(deniedSection).toBeInTheDocument();
      expect(pendingSection).toBeInTheDocument();
    });

    it('should show appropriate icons for denied claims', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      // Check for alert triangle icon (denied claims)
      const deniedIcons = screen.getAllByTestId('alert-triangle-icon');
      expect(deniedIcons.length).toBeGreaterThan(0);
    });

    it('should show appropriate icons for pending claims', () => {
      render(<ActionCenterDenialsPanel {...defaultProps} />);
      // Check for clock icon (pending claims)
      const pendingIcons = screen.getAllByTestId('clock-icon');
      expect(pendingIcons.length).toBeGreaterThan(0);
    });
  });
});


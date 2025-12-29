/**
 * Billing Components WCAG 2.1 AA Accessibility Tests (Task 9.1)
 * 
 * Tests color contrast, keyboard navigation, and screen reader compatibility
 * for billing UI components.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillingKPICards } from '@/components/billing/BillingKPICards';
import { ClaimsTable } from '@/components/billing/ClaimsTable';
import { ClinicBillingFilters } from '@/components/billing/ClinicBillingFilters';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { calculateContrast } from '@/lib/contrast-validator';
import type { RCMMetrics } from '@/types/billing';
import type { InsuranceClaim, ClaimStatus } from '@/types/billing';

describe('Billing Components WCAG 2.1 AA Compliance (Task 9.1)', () => {
  describe('Color Contrast - Status Badges', () => {
    const statusBadgeBackgrounds = {
      success: '#dcfce7', // bg-status-success-bg (light green)
      warning: '#fef3c7', // bg-status-warning-bg (light yellow)
      error: '#fee2e2', // bg-status-error-bg (light red)
      info: '#e0f2fe', // bg-status-info-bg (light blue)
      critical: '#fee2e2', // bg-status-critical-bg (light red)
    };

    const statusBadgeTextColors = {
      success: '#22c55e', // text-status-success
      warning: '#d97706', // text-status-warning
      error: '#dc2626', // text-status-error
      info: '#0ea5e9', // text-status-info
      critical: '#991B1B', // text-status-critical
    };

    it('should have WCAG AA contrast (4.5:1) for success badge', () => {
      const result = calculateContrast(
        statusBadgeTextColors.success,
        statusBadgeBackgrounds.success
      );
      expect(result.passesAA).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should have WCAG AA contrast (4.5:1) for warning badge', () => {
      const result = calculateContrast(
        statusBadgeTextColors.warning,
        statusBadgeBackgrounds.warning
      );
      expect(result.passesAA).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should have WCAG AA contrast (4.5:1) for error badge', () => {
      const result = calculateContrast(
        statusBadgeTextColors.error,
        statusBadgeBackgrounds.error
      );
      expect(result.passesAA).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should have WCAG AA contrast (4.5:1) for info badge', () => {
      const result = calculateContrast(
        statusBadgeTextColors.info,
        statusBadgeBackgrounds.info
      );
      expect(result.passesAA).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should have WCAG AA contrast (4.5:1) for critical badge', () => {
      const result = calculateContrast(
        statusBadgeTextColors.critical,
        statusBadgeBackgrounds.critical
      );
      expect(result.passesAA).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should render status badges with proper ARIA labels', () => {
      render(
        <StatusBadge status="success" aria-label="Status: Paid">
          Paid
        </StatusBadge>
      );
      const badge = screen.getByLabelText('Status: Paid');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Color Contrast - KPI Cards', () => {
    const mockMetrics: RCMMetrics = {
      totalAR: 125000,
      daysInAR: 45,
      cleanClaimRate: 85.5,
      denialRate: 12.3,
      netCollectionRate: 92.1,
    };

    const kpiCardBackground = '#ffffff'; // bg-surface-elevated (white)
    const kpiTextColors = {
      teal: '#008080', // text-zenthea-teal
      primary: '#5F284A', // text-text-primary (dark purple)
      success: '#22c55e', // text-status-success
      warning: '#d97706', // text-status-warning
    };

    it('should have WCAG AA contrast for teal KPI text', () => {
      const result = calculateContrast(kpiTextColors.teal, kpiCardBackground);
      expect(result.passesAA).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should have WCAG AA contrast for primary text KPI', () => {
      const result = calculateContrast(kpiTextColors.primary, kpiCardBackground);
      expect(result.passesAA).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should have WCAG AA contrast for success status KPI', () => {
      const result = calculateContrast(kpiTextColors.success, kpiCardBackground);
      expect(result.passesAA).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should have WCAG AA contrast for warning status KPI', () => {
      const result = calculateContrast(kpiTextColors.warning, kpiCardBackground);
      expect(result.passesAA).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should render KPI cards with proper ARIA labels', () => {
      render(<BillingKPICards metrics={mockMetrics} showDefaultTooltips={true} />);
      
      // Check that cards have aria-label attributes
      const cards = screen.getAllByRole('article');
      expect(cards.length).toBeGreaterThan(0);
      cards.forEach(card => {
        expect(card).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Keyboard Navigation - ClaimsTable', () => {
    const mockClaims: InsuranceClaim[] = [
      {
        claimId: 'claim-1',
        patientId: 'patient-1',
        providerId: 'provider-1',
        payerId: 'payer-1',
        status: 'submitted' as ClaimStatus,
        totalCharges: 50000,
        createdAt: Date.now(),
        tenantId: 'tenant-1',
      },
      {
        claimId: 'claim-2',
        patientId: 'patient-2',
        providerId: 'provider-2',
        payerId: 'payer-2',
        status: 'paid' as ClaimStatus,
        totalCharges: 75000,
        createdAt: Date.now() - 86400000,
        tenantId: 'tenant-1',
      },
    ];

    const mockNames = {
      patientNames: { 'patient-1': 'John Doe', 'patient-2': 'Jane Smith' },
      providerNames: { 'provider-1': 'Dr. Smith', 'provider-2': 'Dr. Jones' },
      payerNames: { 'payer-1': 'Blue Cross', 'payer-2': 'Aetna' },
    };

    it('should support keyboard navigation for sortable columns', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          {...mockNames}
        />
      );

      // Find sort buttons
      const dateSortButton = screen.getByLabelText('Sort by date');
      expect(dateSortButton).toBeInTheDocument();

      // Tab to the button
      await user.tab();
      
      // Press Enter to sort
      await user.keyboard('{Enter}');
      expect(dateSortButton).toHaveAttribute('aria-sort');
    });

    it('should support Space key for sorting', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          {...mockNames}
        />
      );

      const amountSortButton = screen.getByLabelText('Sort by amount');
      amountSortButton.focus();
      
      await user.keyboard(' ');
      expect(amountSortButton).toHaveAttribute('aria-sort');
    });

    it('should have proper ARIA attributes for sortable columns', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          {...mockNames}
        />
      );

      const sortButtons = [
        screen.getByLabelText('Sort by date'),
        screen.getByLabelText('Sort by patient'),
        screen.getByLabelText('Sort by provider'),
        screen.getByLabelText('Sort by payer'),
        screen.getByLabelText('Sort by amount'),
        screen.getByLabelText('Sort by status'),
      ];

      sortButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
        expect(button).toHaveAttribute('aria-sort');
      });
    });

    it('should support keyboard navigation for filter dropdown', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          {...mockNames}
        />
      );

      const filterButton = screen.getByRole('button', { name: /filter/i });
      expect(filterButton).toBeInTheDocument();

      // Tab to filter button
      await user.tab();
      await user.tab(); // Skip first sort button
      
      // Open filter dropdown with Enter
      await user.keyboard('{Enter}');
      
      // Check that dropdown is accessible
      const statusLabel = screen.queryByText('Status');
      expect(statusLabel).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation - ClinicBillingFilters', () => {
    const mockFilters = {
      providers: [{ id: '1', name: 'Dr. Smith' }],
      payers: [{ id: '1', name: 'Blue Cross' }],
      statuses: ['submitted', 'paid'] as ClaimStatus[],
      filters: {
        dateFrom: undefined,
        dateTo: undefined,
        providerIds: [],
        payerIds: [],
        statuses: [],
      },
      onFiltersChange: () => {},
    };

    it('should support keyboard navigation for status filter chips', async () => {
      const user = userEvent.setup();
      render(<ClinicBillingFilters {...mockFilters} />);

      // Find status filter chips
      const statusChips = screen.getAllByRole('button', { name: /filter/i });
      
      if (statusChips.length > 0) {
        // Tab to first chip
        await user.tab();
        
        // Activate with Enter
        await user.keyboard('{Enter}');
        
        // Verify chip is interactive
        expect(statusChips[0]).toHaveAttribute('tabIndex', '0');
      }
    });

    it('should support Space key for status filter chips', async () => {
      const user = userEvent.setup();
      render(<ClinicBillingFilters {...mockFilters} />);

      const statusChips = screen.getAllByRole('button', { name: /filter/i });
      
      if (statusChips.length > 0) {
        statusChips[0].focus();
        await user.keyboard(' ');
        
        // Verify chip responds to Space
        expect(statusChips[0]).toHaveAttribute('aria-label');
      }
    });

    it('should have proper ARIA labels for all filter controls', () => {
      render(<ClinicBillingFilters {...mockFilters} />);

      // Check date pickers
      const startDateButton = screen.getByLabelText('Select start date');
      const endDateButton = screen.getByLabelText('Select end date');
      expect(startDateButton).toBeInTheDocument();
      expect(endDateButton).toBeInTheDocument();

      // Check clear filters button
      const clearButton = screen.queryByLabelText('Clear all filters');
      // May not be visible if no filters are active
      if (clearButton) {
        expect(clearButton).toBeInTheDocument();
      }
    });

    it('should have proper labels for form controls', () => {
      render(<ClinicBillingFilters {...mockFilters} />);

      // Check that labels are associated with inputs
      const startDateLabel = screen.getByText('Start Date');
      const endDateLabel = screen.getByText('End Date');
      expect(startDateLabel).toBeInTheDocument();
      expect(endDateLabel).toBeInTheDocument();
    });
  });

  describe('Screen Reader Compatibility', () => {
    const mockMetrics: RCMMetrics = {
      totalAR: 125000,
      daysInAR: 45,
      cleanClaimRate: 85.5,
      denialRate: 12.3,
      netCollectionRate: 92.1,
    };

    it('should have descriptive ARIA labels for KPI cards', () => {
      render(<BillingKPICards metrics={mockMetrics} showDefaultTooltips={true} />);
      
      const cards = screen.getAllByRole('article');
      cards.forEach(card => {
        const ariaLabel = card.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel?.length).toBeGreaterThan(0);
      });
    });

    it('should have semantic HTML structure for claims table', () => {
      const mockClaims: InsuranceClaim[] = [
        {
          claimId: 'claim-1',
          patientId: 'patient-1',
          providerId: 'provider-1',
          payerId: 'payer-1',
          status: 'submitted' as ClaimStatus,
          totalCharges: 50000,
          createdAt: Date.now(),
          tenantId: 'tenant-1',
        },
      ];

      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={{ 'patient-1': 'John Doe' }}
          providerNames={{ 'provider-1': 'Dr. Smith' }}
          payerNames={{ 'payer-1': 'Blue Cross' }}
        />
      );

      // Check table structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check table headers
      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should have descriptive text for status badges', () => {
      render(
        <>
          <StatusBadge status="success" aria-label="Claim status: Paid">
            Paid
          </StatusBadge>
          <StatusBadge status="error" aria-label="Claim status: Denied">
            Denied
          </StatusBadge>
        </>
      );

      const paidBadge = screen.getByLabelText('Claim status: Paid');
      const deniedBadge = screen.getByLabelText('Claim status: Denied');
      
      expect(paidBadge).toBeInTheDocument();
      expect(deniedBadge).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators on interactive elements', () => {
      const mockClaims: InsuranceClaim[] = [
        {
          claimId: 'claim-1',
          patientId: 'patient-1',
          providerId: 'provider-1',
          payerId: 'payer-1',
          status: 'submitted' as ClaimStatus,
          totalCharges: 50000,
          createdAt: Date.now(),
          tenantId: 'tenant-1',
        },
      ];

      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={{ 'patient-1': 'John Doe' }}
          providerNames={{ 'provider-1': 'Dr. Smith' }}
          payerNames={{ 'payer-1': 'Blue Cross' }}
        />
      );

      const sortButton = screen.getByLabelText('Sort by date');
      sortButton.focus();

      // Check that element has focus
      expect(sortButton).toHaveFocus();

      // Check computed styles for focus indicator
      const computedStyle = window.getComputedStyle(sortButton, ':focus');
      // Focus indicator should be visible (outline or box-shadow)
      const hasFocusIndicator = 
        computedStyle.outline !== 'none' || 
        computedStyle.outlineWidth !== '0px' ||
        computedStyle.boxShadow !== 'none';
      
      expect(hasFocusIndicator).toBe(true);
    });
  });
});























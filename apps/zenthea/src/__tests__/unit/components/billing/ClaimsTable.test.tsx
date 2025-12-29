import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimsTable } from '@/components/billing/ClaimsTable';
import type { InsuranceClaim, ClaimStatus } from '@/types/billing';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronUp: vi.fn((props) => <svg data-testid="chevron-up-icon" {...props} />),
  ChevronDown: vi.fn((props) => <svg data-testid="chevron-down-icon" {...props} />),
  Filter: vi.fn((props) => <svg data-testid="filter-icon" {...props} />),
  X: vi.fn((props) => <svg data-testid="x-icon" {...props} />),
  Check: vi.fn((props) => <svg data-testid="check-icon" {...props} />),
}));

describe('ClaimsTable', () => {
  const mockClaims: InsuranceClaim[] = [
    {
      claimId: 'claim-1',
      patientId: 'patient-1',
      providerId: 'provider-1',
      payerId: 'payer-1',
      invoiceId: 'invoice-1',
      status: 'paid' as ClaimStatus,
      totalCharges: 15000, // $150.00
      datesOfService: ['2024-01-15', '2024-01-16'],
      claimControlNumber: 'CCN-001',
      tenantId: 'tenant-1',
      createdAt: new Date('2024-01-15').getTime(),
      updatedAt: new Date('2024-01-20').getTime(),
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
        code: 'CO-50',
        description: 'Service not covered',
        category: 'not_covered',
      },
      tenantId: 'tenant-1',
      createdAt: new Date('2024-01-10').getTime(),
      updatedAt: new Date('2024-01-12').getTime(),
    },
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render table with all required columns', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Check column headers
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Patient')).toBeInTheDocument();
      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText('Payer')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render all claims in table rows', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Should have 3 data rows (plus header row)
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThanOrEqual(4); // Header + 3 data rows
    });

    it('should display formatted currency amounts', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      expect(screen.getByText('$150.00')).toBeInTheDocument();
      expect(screen.getByText('$250.00')).toBeInTheDocument();
      expect(screen.getByText('$350.00')).toBeInTheDocument();
    });

    it('should display patient names correctly', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should display provider names correctly', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Provider names appear in table cells - check they're present (may appear multiple times)
      expect(screen.getAllByText('Dr. Alice Brown').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Dr. Charlie Davis').length).toBeGreaterThan(0);
    });

    it('should display payer names correctly', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Payer names may appear multiple times, so use getAllByText
      expect(screen.getAllByText('Blue Cross Blue Shield').length).toBeGreaterThan(0);
      expect(screen.getByText('Aetna')).toBeInTheDocument();
    });

    it('should display formatted dates correctly', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Should display dates in readable format
      expect(screen.getByText(/Jan 15, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan 10, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan 20, 2024/i)).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('should render status badges with correct labels', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      expect(screen.getByText('Paid')).toBeInTheDocument();
      expect(screen.getByText('Denied')).toBeInTheDocument();
      expect(screen.getByText('Submitted')).toBeInTheDocument();
    });

    it('should apply correct color coding for paid status', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const paidBadge = screen.getByText('Paid');
      // Should use success color variant
      expect(paidBadge.closest('[class*="status-success"]')).toBeInTheDocument();
    });

    it('should apply correct color coding for denied status', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const deniedBadge = screen.getByText('Denied');
      // Should use error color variant
      expect(deniedBadge.closest('[class*="status-error"]')).toBeInTheDocument();
    });

    it('should apply correct color coding for submitted status', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const submittedBadge = screen.getByText('Submitted');
      // Should use info color variant
      expect(submittedBadge.closest('[class*="status-info"]')).toBeInTheDocument();
    });

    it('should apply correct color coding for accepted status', () => {
      const acceptedClaim: InsuranceClaim = {
        ...mockClaims[0],
        status: 'accepted' as ClaimStatus,
      };

      render(
        <ClaimsTable
          claims={[acceptedClaim]}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const acceptedBadge = screen.getByText('Accepted');
      expect(acceptedBadge.closest('[class*="status-info"]')).toBeInTheDocument();
    });

    it('should apply correct color coding for draft status', () => {
      const draftClaim: InsuranceClaim = {
        ...mockClaims[0],
        status: 'draft' as ClaimStatus,
      };

      render(
        <ClaimsTable
          claims={[draftClaim]}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const draftBadge = screen.getByText('Draft');
      // Draft maps to 'default' which is converted to 'info' in the component
      expect(draftBadge.closest('[class*="status-info"]')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort by date when date column header is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const dateHeader = screen.getByText('Date');
      await user.click(dateHeader);

      // Get all rows and check order
      // After clicking date header, it should sort descending (most recent first)
      // But since default is already descending by date, clicking should set explicit sort
      const rows = screen.getAllByRole('row');
      // First data row should be the most recent (Jan 20) - default sort is desc by date
      expect(rows[1]).toHaveTextContent(/Jan 20, 2024/i);
    });

    it('should toggle sort direction when column header is clicked twice', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const dateHeader = screen.getByText('Date');
      await user.click(dateHeader);
      await user.click(dateHeader);

      // Should now be in ascending order (oldest first)
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent(/Jan 10, 2024/i);
    });

    it('should sort by amount when amount column header is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const amountHeader = screen.getByText('Amount');
      await user.click(amountHeader);

      // Should sort by amount descending (highest first)
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('$350.00');
    });

    it('should sort by status when status column header is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const statusHeader = screen.getByText('Status');
      await user.click(statusHeader);

      // Should sort alphabetically by status
      const rows = screen.getAllByRole('row');
      // First should be "Denied" (alphabetically first)
      expect(rows[1]).toHaveTextContent('Denied');
    });

    it('should show sort indicator when column is sorted', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const dateHeader = screen.getByText('Date');
      await user.click(dateHeader);

      // Should show sort indicator icon (descending for date)
      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
    });

    it('should show ascending indicator when sorted ascending', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const dateHeader = screen.getByText('Date');
      await user.click(dateHeader); // Sets to explicit desc sort
      await user.click(dateHeader); // Toggles to asc

      // Should show ascending indicator
      expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter by status when status filter is applied', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Open filter panel
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      // Select "Paid" status filter - find by role and text
      const paidOption = await screen.findByRole('menuitemcheckbox', { name: /paid/i }, { timeout: 2000 });
      await user.click(paidOption);

      // Close dropdown by clicking outside
      await user.click(document.body);
      
      // Wait for filter to apply and verify results
      await waitFor(() => {
        expect(screen.getByText('Paid')).toBeInTheDocument();
        expect(screen.queryByText('Denied')).not.toBeInTheDocument();
        expect(screen.queryByText('Submitted')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should filter by payer when payer filter is applied', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Open filter panel
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      // Wait for dropdown menu to be visible - find by role and text
      const bcbsOption = await screen.findByRole('menuitemcheckbox', { name: /blue cross blue shield/i }, { timeout: 2000 });
      await user.click(bcbsOption);

      // Close dropdown
      await user.click(document.body);
      
      // Wait for filter to apply - check table rows (excluding header)
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // Skip header row (index 0), check data rows only
        const dataRows = rows.slice(1);
        const hasBCBS = dataRows.some(row => row.textContent?.includes('Blue Cross Blue Shield'));
        const hasAetna = dataRows.some(row => row.textContent?.includes('Aetna'));
        expect(hasBCBS).toBe(true);
        expect(hasAetna).toBe(false);
      }, { timeout: 2000 });
    });

    it('should filter by provider when provider filter is applied', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Open filter panel
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      // Wait for dropdown menu to be visible - find by role and text
      const providerOption = await screen.findByRole('menuitemcheckbox', { name: /dr\. alice brown/i }, { timeout: 2000 });
      await user.click(providerOption);

      // Close dropdown
      await user.click(document.body);
      
      // Wait for filter to apply and verify results
      await waitFor(() => {
        expect(screen.getAllByText('Dr. Alice Brown').length).toBeGreaterThan(0);
        expect(screen.queryByText('Dr. Charlie Davis')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should clear all filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Apply a filter
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);
      const paidOption = await screen.findByRole('menuitemcheckbox', { name: /paid/i }, { timeout: 2000 });
      await user.click(paidOption);

      // Close dropdown and reopen to see clear button
      await user.click(document.body); // Click outside to close
      await user.click(filterButton); // Reopen

      // Wait for clear button to be visible
      const clearButton = await screen.findByRole('menuitem', { name: /clear/i }, { timeout: 2000 });
      await user.click(clearButton);

      // Should show all claims again
      expect(screen.getByText('Paid')).toBeInTheDocument();
      expect(screen.getByText('Denied')).toBeInTheDocument();
      expect(screen.getByText('Submitted')).toBeInTheDocument();
    });

    it('should show active filter count badge', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Apply filters
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);
      const paidOption = await screen.findByRole('menuitemcheckbox', { name: /paid/i }, { timeout: 2000 });
      await user.click(paidOption);

      // Close dropdown to see badge update
      await user.click(document.body);
      
      // Wait for badge to update
      await waitFor(() => {
        const filterButtonAfter = screen.getByRole('button', { name: /filter/i });
        expect(filterButtonAfter.textContent).toMatch(/1/); // 1 active filter
      }, { timeout: 2000 });
    });
  });

  describe('Row Click Interaction', () => {
    it('should call onRowClick when row is clicked', async () => {
      const user = userEvent.setup();
      const handleRowClick = vi.fn();

      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
          onRowClick={handleRowClick}
        />
      );

      // Click on first data row
      // Default sort is descending by date, so first row should be the most recent (mockClaims[2])
      const rows = screen.getAllByRole('row');
      await user.click(rows[1]); // First data row (index 1)

      expect(handleRowClick).toHaveBeenCalledTimes(1);
      // Default sort is desc by date, so first row is the most recent claim (index 2)
      expect(handleRowClick).toHaveBeenCalledWith(mockClaims[2]);
    });

    it('should not call onRowClick if handler is not provided', async () => {
      const user = userEvent.setup();

      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Click on row - should not throw error
      const rows = screen.getAllByRole('row');
      await user.click(rows[1]);

      // Should not crash
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should make rows clickable when onRowClick is provided', () => {
      const handleRowClick = vi.fn();

      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
          onRowClick={handleRowClick}
        />
      );

      // Rows should have cursor pointer class
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveClass(/cursor-pointer/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty claims array', () => {
      render(
        <ClaimsTable
          claims={[]}
          patientNames={{}}
          providerNames={{}}
          payerNames={{}}
        />
      );

      // Should show empty state message
      expect(screen.getByText(/no claims/i)).toBeInTheDocument();
    });

    it('should handle missing patient names gracefully', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={{}}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Should show patient ID or fallback
      expect(screen.getByText('patient-1')).toBeInTheDocument();
    });

    it('should handle missing provider names gracefully', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={{}}
          payerNames={mockPayerNames}
        />
      );

      // Should show provider ID or fallback (may appear multiple times)
      expect(screen.getAllByText('provider-1').length).toBeGreaterThan(0);
    });

    it('should handle missing payer names gracefully', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={{}}
        />
      );

      // Should show payer ID or fallback (may appear multiple times)
      expect(screen.getAllByText('payer-1').length).toBeGreaterThan(0);
    });

    it('should handle claims with no invoice ID', () => {
      const claimWithoutInvoice: InsuranceClaim = {
        ...mockClaims[0],
        invoiceId: undefined,
      };

      render(
        <ClaimsTable
          claims={[claimWithoutInvoice]}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Should still render the claim
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should handle claims with denial reason', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Should display denial reason if available
      const deniedRow = screen.getByText('Denied').closest('tr');
      expect(deniedRow).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure with headers', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Should have table element
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Should have column headers
      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should have keyboard accessible sort buttons', async () => {
      const user = userEvent.setup();
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const dateHeader = screen.getByText('Date');
      // Should be keyboard accessible
      dateHeader.focus();
      await user.keyboard('{Enter}');

      // Should sort on Enter key - first click sets explicit desc sort
      // After Enter, it should show descending indicator (since date defaults to desc, clicking sets explicit desc)
      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
    });

    it('should have ARIA labels for sortable columns', () => {
      render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      const dateHeader = screen.getByText('Date');
      expect(dateHeader).toHaveAttribute('aria-label');
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile viewports', () => {
      const { container } = render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Should have responsive table wrapper
      const tableWrapper = container.querySelector('[class*="overflow"]');
      expect(tableWrapper).toBeInTheDocument();
    });

    it('should handle horizontal scroll on small screens', () => {
      const { container } = render(
        <ClaimsTable
          claims={mockClaims}
          patientNames={mockPatientNames}
          providerNames={mockProviderNames}
          payerNames={mockPayerNames}
        />
      );

      // Table should be scrollable
      const scrollableContainer = container.querySelector('[class*="overflow-x"]');
      expect(scrollableContainer).toBeInTheDocument();
    });
  });
});


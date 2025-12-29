/**
 * TDD Tests for Task 4.4: Claim Details Drawer Component
 * 
 * Task 4.4 Requirements:
 * - Add detail drawer/slide-over on row click
 * - Show claim details: line items, status timeline, payment history
 * - Allow provider to view but not edit (read-only)
 * 
 * TDD Cycle: RED → GREEN → REFACTOR → COMMIT
 * Specification: BILLING_SYSTEM_TASKS.md Task 4.4
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ClaimDetailsDrawer } from '@/components/billing/ClaimDetailsDrawer';
import type { InsuranceClaim, ClaimLineItem, InsurancePayment } from '@/types/billing';
import type { Id } from '@/convex/_generated/dataModel';

// Mock Convex
const mockUseQuery = vi.fn();
vi.mock('convex/react', () => ({
  useQuery: (queryFn: any, args: any) => mockUseQuery(queryFn, args),
}));

// Mock billing API function
vi.mock('@/convex/_generated/api', async () => {
  const actual = await vi.importActual('@/convex/_generated/api');
  const getClaimDetails = function getClaimDetails() {};
  
  return {
    ...actual,
    api: {
      ...(actual as any).api,
      billing: {
        ...(actual as any).api?.billing,
        getClaimDetails,
      },
    },
  };
});

// Mock Sheet components
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open, onOpenChange }: any) => (
    <div data-testid="sheet" data-open={open} onClick={() => onOpenChange(false)}>
      {open && children}
    </div>
  ),
  SheetContent: ({ children }: any) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: any) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: any) => (
    <h2 data-testid="sheet-title">{children}</h2>
  ),
  SheetDescription: ({ children }: any) => (
    <p data-testid="sheet-description">{children}</p>
  ),
  SheetClose: ({ children }: any) => (
    <button data-testid="sheet-close">{children}</button>
  ),
}));

// Mock data
const mockClaim: InsuranceClaim = {
  claimId: 'CLM-001',
  patientId: 'patient-1' as Id<'patients'>,
  providerId: 'provider-1' as Id<'providers'>,
  payerId: 'payer-1' as Id<'insurancePayers'>,
  status: 'submitted',
  totalCharges: 15000, // $150.00
  datesOfService: ['2024-01-15', '2024-01-16'],
  claimControlNumber: 'CCN-12345',
  tenantId: 'tenant-1',
  createdAt: 1705276800000, // Jan 15, 2024
  updatedAt: 1705276800000,
};

const mockLineItems: ClaimLineItem[] = [
  {
    lineItemId: 'line-1',
    claimId: 'CLM-001',
    procedureCode: '99213',
    modifiers: ['25'],
    diagnosisCodes: ['E11.9', 'I10'],
    units: 1,
    chargeAmount: 10000, // $100.00
    tenantId: 'tenant-1',
    createdAt: 1705276800000,
  },
  {
    lineItemId: 'line-2',
    claimId: 'CLM-001',
    procedureCode: '36415',
    modifiers: [],
    diagnosisCodes: ['E11.9'],
    units: 1,
    chargeAmount: 5000, // $50.00
    tenantId: 'tenant-1',
    createdAt: 1705276800000,
  },
];

const mockPayments: InsurancePayment[] = [
  {
    paymentId: 'payment-1',
    claimId: 'CLM-001',
    amount: 12000, // $120.00
    adjustmentAmount: 3000, // $30.00 adjustment
    checkNumber: 'CHK-12345',
    transactionId: 'TXN-001',
    paidAt: 1705363200000, // Jan 16, 2024
    tenantId: 'tenant-1',
    createdAt: 1705363200000,
  },
];

const mockClaimDetails = {
  claim: mockClaim,
  lineItems: mockLineItems,
  payments: mockPayments,
  patientName: 'John Doe',
  payerName: 'Blue Cross Blue Shield',
};

describe('ClaimDetailsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(undefined);
  });

  describe('Drawer Visibility', () => {
    it('should render drawer when open prop is true', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByTestId('sheet')).toBeInTheDocument();
      expect(screen.getByTestId('sheet')).toHaveAttribute('data-open', 'true');
    });

    it('should not render drawer content when open prop is false', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={false}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.queryByTestId('sheet-content')).not.toBeInTheDocument();
    });

    it('should call onOpenChange when drawer is closed', () => {
      const onOpenChange = vi.fn();
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={onOpenChange}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      const sheet = screen.getByTestId('sheet');
      fireEvent.click(sheet);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Data Loading', () => {
    it('should call getClaimDetails query with correct parameters', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      const call = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === (api as any).billing?.getClaimDetails
      );

      expect(call).toBeDefined();
      expect(call?.[1]).toMatchObject({
        claimId: 'CLM-001',
        tenantId: 'tenant-1',
        userEmail: 'provider@example.com',
      });
    });

    it('should skip query when drawer is closed', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={false}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      const call = (mockUseQuery as MockedFunction<typeof useQuery>).mock.calls.find(
        (call) => call[0] === (api as any).billing?.getClaimDetails
      );

      expect(call?.[1]).toBe('skip');
    });

    it('should show loading state while data is loading', () => {
      mockUseQuery.mockReturnValue(undefined);

      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show error state when query returns null', () => {
      mockUseQuery.mockReturnValue(null);

      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Claim Information Display', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockClaimDetails);
    });

    it('should display claim control number', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText('CCN-12345')).toBeInTheDocument();
    });

    it('should display claim status', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      // Status appears in both status badge and timeline
      const submittedTexts = screen.getAllByText(/submitted/i);
      expect(submittedTexts.length).toBeGreaterThan(0);
    });

    it('should display total charges', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/\$150\.00/)).toBeInTheDocument();
    });

    it('should display patient name', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display payer name', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText('Blue Cross Blue Shield')).toBeInTheDocument();
    });

    it('should display dates of service', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      // Dates appear in both dates of service and timeline/payment history
      const jan15Texts = screen.getAllByText(/Jan 15, 2024/i);
      expect(jan15Texts.length).toBeGreaterThan(0);
      const jan16Texts = screen.getAllByText(/Jan 16, 2024/i);
      expect(jan16Texts.length).toBeGreaterThan(0);
    });
  });

  describe('Line Items Display', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockClaimDetails);
    });

    it('should display line items section', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/line items/i)).toBeInTheDocument();
    });

    it('should display procedure codes', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      // Procedure codes are displayed as "Procedure: 99213"
      expect(screen.getByText(/Procedure: 99213/i)).toBeInTheDocument();
      expect(screen.getByText(/Procedure: 36415/i)).toBeInTheDocument();
    });

    it('should display modifiers when present', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/25/)).toBeInTheDocument();
    });

    it('should display diagnosis codes', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      // Diagnosis codes appear in multiple line items
      const e11Texts = screen.getAllByText(/E11\.9/);
      expect(e11Texts.length).toBeGreaterThan(0);
      expect(screen.getByText(/I10/)).toBeInTheDocument();
    });

    it('should display charge amounts for each line item', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/\$100\.00/)).toBeInTheDocument();
      expect(screen.getByText(/\$50\.00/)).toBeInTheDocument();
    });

    it('should display units for each line item', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      // Units are displayed as "Units: 1" for each line item
      const unitsTexts = screen.getAllByText(/Units: 1/i);
      expect(unitsTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Payment History Display', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockClaimDetails);
    });

    it('should display payment history section', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/payment history/i)).toBeInTheDocument();
    });

    it('should display payment amounts', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/\$120\.00/)).toBeInTheDocument();
    });

    it('should display adjustment amounts', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/\$30\.00/)).toBeInTheDocument();
    });

    it('should display check numbers when present', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      // Check number is displayed as "Check Number: CHK-12345"
      expect(screen.getByText(/Check Number: CHK-12345/i)).toBeInTheDocument();
    });

    it('should display payment dates', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      // Payment date appears in payment history (and possibly dates of service)
      const jan16Texts = screen.getAllByText(/Jan 16, 2024/i);
      expect(jan16Texts.length).toBeGreaterThan(0);
      // Verify it's in payment context
      expect(screen.getByText(/Paid:/i)).toBeInTheDocument();
    });

    it('should show empty state when no payments exist', () => {
      mockUseQuery.mockReturnValue({
        ...mockClaimDetails,
        payments: [],
      });

      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/no payments/i)).toBeInTheDocument();
    });
  });

  describe('Status Timeline Display', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockClaimDetails);
    });

    it('should display status timeline section', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/status timeline/i)).toBeInTheDocument();
    });

    it('should display claim creation date', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/Created:/i)).toBeInTheDocument();
      // Date appears multiple times, so use getAllByText
      const jan15Texts = screen.getAllByText(/Jan 15, 2024/i);
      expect(jan15Texts.length).toBeGreaterThan(0);
    });

    it('should display current status', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/Current Status:/i)).toBeInTheDocument();
      // "Submitted" appears in both status badge and timeline, so use getAllByText
      const submittedTexts = screen.getAllByText(/Submitted/i);
      expect(submittedTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Read-Only Mode', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockClaimDetails);
    });

    it('should not display edit buttons', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.queryByText(/edit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/update/i)).not.toBeInTheDocument();
    });

    it('should not display delete buttons', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
    });

    it('should display read-only indicator', () => {
      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/View only/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing claim data gracefully', () => {
      mockUseQuery.mockReturnValue({
        claim: null,
        lineItems: [],
        payments: [],
      });

      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/claim not found/i)).toBeInTheDocument();
    });

    it('should handle unauthorized access', () => {
      mockUseQuery.mockReturnValue(null);

      render(
        <ClaimDetailsDrawer
          claimId="CLM-001"
          open={true}
          onOpenChange={vi.fn()}
          tenantId="tenant-1"
          userEmail="provider@example.com"
        />
      );

      expect(screen.getByText(/Error loading claim details/i)).toBeInTheDocument();
    });
  });
});


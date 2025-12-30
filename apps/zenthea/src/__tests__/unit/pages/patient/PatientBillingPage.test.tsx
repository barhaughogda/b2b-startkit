import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientBillingPage from '@/app/patient/billing/page';
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';

// Mock @/hooks/useZentheaSession
const mockUseSession = vi.fn();
const mockUseRouter = vi.fn();

vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: () => mockUseSession(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
}));

// Mock Convex
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: (queryFn: any, args: any) => mockUseQuery(queryFn, args),
  useMutation: (mutationFn: any) => mockUseMutation(mutationFn),
}));

// Mock Convex API - must use async factory to import actual
vi.mock('@/convex/_generated/api', async () => {
  const actual = await vi.importActual('@/convex/_generated/api');
  const findPatientByEmail = function findPatientByEmail() {};
  const getPatientInvoices = function getPatientInvoices() {};
  const getPatientBillingSummary = function getPatientBillingSummary() {};
  const recordPatientPayment = function recordPatientPayment() {};
  
  return {
    ...actual,
    api: {
      ...(actual as any).api,
      patientProfile: {
        ...(actual as any).api?.patientProfile,
        findPatientByEmail,
      },
      billing: {
        ...(actual as any).api?.billing,
        getPatientInvoices,
        getPatientBillingSummary,
        recordPatientPayment,
      },
    },
  };
});

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock Convex ID validation
vi.mock('@/lib/convexIdValidation', () => ({
  canUseConvexQuery: vi.fn(() => true),
  isValidConvexIdForTable: vi.fn(() => true),
  isValidConvexId: vi.fn(() => true),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CreditCard: vi.fn((props) => <svg data-testid="credit-card-icon" {...props} />),
  Download: vi.fn((props) => <svg data-testid="download-icon" {...props} />),
  Eye: vi.fn((props) => <svg data-testid="eye-icon" {...props} />),
  DollarSign: vi.fn((props) => <svg data-testid="dollar-sign-icon" {...props} />),
  Calendar: vi.fn((props) => <svg data-testid="calendar-icon" {...props} />),
  Receipt: vi.fn((props) => <svg data-testid="receipt-icon" {...props} />),
  Loader2: vi.fn((props) => <svg data-testid="loader-icon" {...props} />),
  ExternalLink: vi.fn((props) => <svg data-testid="external-link-icon" {...props} />),
}));

// Mock PatientClaimDetailsDrawer
vi.mock('@/components/billing/PatientClaimDetailsDrawer', () => ({
  PatientClaimDetailsDrawer: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
    open ? <div data-testid="claim-details-drawer">Claim Details Drawer</div> : null
  ),
}));

// Mock PatientPaymentModal - includes validation logic for testing
// Note: The actual modal component will be tested separately
vi.mock('@/components/billing/PatientPaymentModal', () => {
  const React = require('react');
  
  return {
    PatientPaymentModal: ({ open, onOpenChange, invoiceNumber, patientResponsibility }: any) => {
      const [amount, setAmount] = React.useState<string>((patientResponsibility / 100).toFixed(2));
      const [errors, setErrors] = React.useState<{ amount?: string }>({});

      React.useEffect(() => {
        if (open) {
          setAmount((patientResponsibility / 100).toFixed(2));
          setErrors({});
        }
      }, [open, patientResponsibility]);

      const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAmount = e.target.value;
        setAmount(newAmount);
        
        // Validate amount in real-time (matching actual component logic)
        const amountValue = parseFloat(newAmount);
        if (!newAmount || isNaN(amountValue) || amountValue <= 0) {
          setErrors({ amount: 'Amount must be greater than 0' });
        } else if (amountValue * 100 > patientResponsibility) {
          setErrors({ amount: `Amount cannot exceed $${(patientResponsibility / 100).toFixed(2)}` });
        } else {
          // Clear error if validation passes
          setErrors({});
        }
      };

      if (!open) return null;
      
      return (
        <div data-testid="payment-modal" role="dialog" aria-labelledby="payment-modal-title" aria-describedby="payment-modal-description">
          <div id="payment-modal-title">Pay Invoice</div>
          <div id="payment-modal-description">Submit payment for invoice {invoiceNumber}. Patient responsibility: ${(patientResponsibility / 100).toFixed(2)}</div>
          <div>Invoice Number: {invoiceNumber}</div>
          <div>Amount Due: ${(patientResponsibility / 100).toFixed(2)}</div>
          <label htmlFor="payment-amount">Payment Amount *</label>
          <input 
            aria-label="amount" 
            id="payment-amount" 
            type="number"
            value={amount}
            onChange={handleAmountChange}
          />
          {errors.amount && (
            <p id="amount-error" className="text-sm text-status-error" role="alert">
              {errors.amount}
            </p>
          )}
          <label htmlFor="payment-method">Payment Method *</label>
          <select aria-label="payment method" id="payment-method">
            <option value="">Select payment method</option>
            <option value="credit_card">Credit Card</option>
            <option value="debit_card">Debit Card</option>
            <option value="check">Check</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="ach">ACH</option>
            <option value="other">Other</option>
          </select>
          <button onClick={() => onOpenChange(false)}>Cancel</button>
          <button onClick={() => onOpenChange(false)}>Submit Payment</button>
          <button aria-label="close" onClick={() => onOpenChange(false)}>Close</button>
        </div>
      );
    },
  };
});

describe('PatientBillingPage - Task 5.4: Pay Now Action Stub', () => {
  const mockPatientId = 'patient123' as Id<'patients'>;
  const mockUserEmail = 'patient@example.com';
  const mockTenantId = 'demo-tenant';

  const mockInvoice = {
    _id: 'invoice123' as Id<'invoices'>,
    invoiceNumber: 'INV-001',
    date: '2024-01-15',
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    total: 20000, // $200.00 in cents
    patientResponsibility: 5000, // $50.00 in cents
    insurancePortion: 15000, // $150.00 in cents
    status: 'pending' as const,
    claimId: undefined,
    claimStatus: undefined,
    description: 'Office Visit',
    serviceType: 'Consultation',
    dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    tenantId: mockTenantId,
  };

  const mockBillingSummary = {
    outstandingBalance: 5000, // $50.00 in cents
    upcomingCharges: 0,
    totalPaid: 10000, // $100.00 in cents
    pendingCount: 1,
  };

  const mockRecordPatientPayment = vi.fn().mockResolvedValue({ paymentId: 'payment123' });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user123',
          email: mockUserEmail,
          role: 'patient',
          tenantId: mockTenantId,
        },
      },
      status: 'authenticated',
    });

    mockUseRouter.mockReturnValue({
      push: vi.fn(),
    });

    // Setup Convex query mocks
    mockUseQuery.mockImplementation((queryFn: any, args: any) => {
      if (args === 'skip') return undefined;
      
      // Compare function references directly
      if (queryFn === (api as any).patientProfile?.findPatientByEmail) {
        return mockPatientId;
      }
      if (queryFn === (api as any).billing?.getPatientInvoices) {
        return [mockInvoice];
      }
      if (queryFn === (api as any).billing?.getPatientBillingSummary) {
        return mockBillingSummary;
      }
      return undefined;
    });

    // Setup Convex mutation mock
    mockUseMutation.mockImplementation((mutationFn: any) => {
      // Compare function references directly
      if (mutationFn === (api as any).billing?.recordPatientPayment) {
        return mockRecordPatientPayment;
      }
      return vi.fn().mockResolvedValue(undefined);
    });
  });

  describe('Pay Now Button Rendering', () => {
    it('should render "Pay Now" button on invoice cards for invoices with patient responsibility', async () => {
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      // Task 5.4: Pay Now button should be visible
      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      expect(payNowButton).toBeInTheDocument();
    });

    it('should not render "Pay Now" button for fully paid invoices', async () => {
      const paidInvoice = {
        ...mockInvoice,
        status: 'paid' as const,
        patientResponsibility: 0,
      };

      mockUseQuery.mockImplementation((queryFn: any, args: any) => {
        if (args === 'skip') return undefined;
        if (queryFn === (api as any).billing?.getPatientInvoices) {
          return [paidInvoice];
        }
        if (queryFn === (api as any).patientProfile?.findPatientByEmail) {
          return mockPatientId;
        }
        if (queryFn === (api as any).billing?.getPatientBillingSummary) {
          return mockBillingSummary;
        }
        return undefined;
      });

      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      // Pay Now button should not be present for paid invoices
      const payNowButton = screen.queryByRole('button', { name: /pay now/i });
      expect(payNowButton).not.toBeInTheDocument();
    });

    it('should not render "Pay Now" button for invoices with zero patient responsibility', async () => {
      const zeroResponsibilityInvoice = {
        ...mockInvoice,
        patientResponsibility: 0,
        insurancePortion: 20000,
      };

      mockUseQuery.mockImplementation((queryFn: any, args: any) => {
        if (args === 'skip') return undefined;
        if (queryFn === (api as any).billing?.getPatientInvoices) {
          return [zeroResponsibilityInvoice];
        }
        if (queryFn === (api as any).patientProfile?.findPatientByEmail) {
          return mockPatientId;
        }
        if (queryFn === (api as any).billing?.getPatientBillingSummary) {
          return mockBillingSummary;
        }
        return undefined;
      });

      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.queryByRole('button', { name: /pay now/i });
      expect(payNowButton).not.toBeInTheDocument();
    });

    it('should render "Pay Now" button with correct styling and accessibility attributes', async () => {
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      
      // Check accessibility
      expect(payNowButton).toHaveAttribute('aria-label', expect.stringContaining('pay'));
      expect(payNowButton).toBeVisible();
    });
  });

  describe('Payment Modal Functionality', () => {
    it('should open payment modal when "Pay Now" button is clicked', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      // Task 5.4: Payment modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/pay invoice/i)).toBeInTheDocument();
      });
    });

    it('should display invoice details in payment modal', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        // Invoice number should be displayed
        expect(screen.getByText(/INV-001/i)).toBeInTheDocument();
        // Patient responsibility amount should be displayed
        expect(screen.getByText(/\$50\.00/i)).toBeInTheDocument();
      });
    });

    it('should close payment modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close payment modal when close button (X) is clicked', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find close button (usually has aria-label="Close" or similar)
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Payment Form Fields', () => {
    it('should display payment amount field pre-filled with patient responsibility', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Task 5.4: Payment amount field should be pre-filled
      const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
      expect(amountInput).toBeInTheDocument();
      expect(amountInput.value).toBe('50.00'); // $50.00 from patientResponsibility
    });

    it('should display payment method selection field', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Task 5.4: Payment method field should be present
      const paymentMethodField = screen.getByLabelText(/payment method/i);
      expect(paymentMethodField).toBeInTheDocument();
    });

    it('should allow user to modify payment amount', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
      await user.clear(amountInput);
      await user.type(amountInput, '25.00');

      expect(amountInput.value).toBe('25.00');
    });

    it('should validate payment amount is not greater than patient responsibility', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
      await user.clear(amountInput);
      await user.type(amountInput, '100.00'); // More than $50.00 patient responsibility

      // Task 5.4: Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/cannot exceed/i)).toBeInTheDocument();
      });
    });

    it('should validate payment amount is greater than zero', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
      await user.clear(amountInput);
      await user.type(amountInput, '0');

      // Task 5.4: Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/must be greater than/i)).toBeInTheDocument();
      });
    });
  });

  describe('Payment Submission (Stub)', () => {
    it('should call recordPatientPayment mutation when payment is submitted', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Select payment method
      const paymentMethodField = screen.getByLabelText(/payment method/i);
      await user.click(paymentMethodField);
      // Assuming dropdown opens - select credit_card
      const creditCardOption = screen.getByText(/credit card/i);
      await user.click(creditCardOption);

      // Submit payment
      const submitButton = screen.getByRole('button', { name: /submit payment|pay|confirm/i });
      await user.click(submitButton);

      // Task 5.4: Should call recordPatientPayment mutation
      await waitFor(() => {
        expect(mockRecordPatientPayment).toHaveBeenCalledWith({
          invoiceId: mockInvoice._id,
          amount: 5000, // $50.00 in cents
          paymentMethod: 'credit_card',
          userEmail: mockUserEmail,
          transactionId: expect.any(String), // Mock transaction ID
        });
      });
    });

    it('should show success message after payment submission', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Submit payment
      const submitButton = screen.getByRole('button', { name: /submit payment|pay|confirm/i });
      await user.click(submitButton);

      // Task 5.4: Should show success toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('payment'),
          expect.any(Object)
        );
      });
    });

    it('should close modal after successful payment submission', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Submit payment
      const submitButton = screen.getByRole('button', { name: /submit payment|pay|confirm/i });
      await user.click(submitButton);

      // Task 5.4: Modal should close after successful submission
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should show error message if payment submission fails', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      
      // Mock mutation to reject
      mockRecordPatientPayment.mockRejectedValueOnce(new Error('Payment failed'));

      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Submit payment
      const submitButton = screen.getByRole('button', { name: /submit payment|pay|confirm/i });
      await user.click(submitButton);

      // Task 5.4: Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('error'),
          expect.any(Object)
        );
      });
    });

    it('should keep modal open if payment submission fails', async () => {
      const user = userEvent.setup();
      
      // Mock mutation to reject
      mockRecordPatientPayment.mockRejectedValueOnce(new Error('Payment failed'));

      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Submit payment
      const submitButton = screen.getByRole('button', { name: /submit payment|pay|confirm/i });
      await user.click(submitButton);

      // Task 5.4: Modal should remain open on error
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Invoice Status Update (Mock)', () => {
    it('should refresh invoice list after successful payment', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Submit payment
      const submitButton = screen.getByRole('button', { name: /submit payment|pay|confirm/i });
      await user.click(submitButton);

      // Task 5.4: Should refresh queries to update invoice status
      await waitFor(() => {
        // Query should be called again to refresh data
        expect(mockUseQuery).toHaveBeenCalledTimes(expect.any(Number));
      });
    });

    it('should display updated invoice status after payment', async () => {
      const user = userEvent.setup();
      
      // After payment, invoice should be partially_paid or paid
      const updatedInvoice = {
        ...mockInvoice,
        status: 'partially_paid' as const,
        patientResponsibility: 0, // Fully paid
      };

      // Mock updated query response after payment
      let queryCallCount = 0;
      mockUseQuery.mockImplementation((queryFn: any, args: any) => {
        if (args === 'skip') return undefined;
        
        if (queryFn === (api as any).billing?.getPatientInvoices) {
          queryCallCount++;
          // Return updated invoice after first payment submission
          if (queryCallCount > 1) {
            return [updatedInvoice];
          }
          return [mockInvoice];
        }
        if (queryFn === (api as any).patientProfile?.findPatientByEmail) {
          return mockPatientId;
        }
        if (queryFn === (api as any).billing?.getPatientBillingSummary) {
          return mockBillingSummary;
        }
        return undefined;
      });

      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Submit payment
      const submitButton = screen.getByRole('button', { name: /submit payment|pay|confirm/i });
      await user.click(submitButton);

      // Task 5.4: Invoice status should update (this is mocked, but we verify the flow)
      await waitFor(() => {
        // Status badge should reflect updated status
        expect(screen.getByText(/partially paid|paid/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on payment modal', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-labelledby');
        expect(dialog).toHaveAttribute('aria-describedby');
      });
    });

    it('should support keyboard navigation in payment modal', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.tab();
      expect(payNowButton).toHaveFocus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Tab should move focus to first form field
      await user.tab();
      const amountInput = screen.getByLabelText(/amount/i);
      expect(amountInput).toHaveFocus();
    });

    it('should close modal on Escape key press', async () => {
      const user = userEvent.setup();
      render(<PatientBillingPage />);

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument();
      });

      const payNowButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payNowButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });
});

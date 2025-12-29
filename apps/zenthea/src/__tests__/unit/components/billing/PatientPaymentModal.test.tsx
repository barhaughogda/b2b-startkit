import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientPaymentModal } from '@/components/billing/PatientPaymentModal';
import { Id } from '@/convex/_generated/dataModel';

// Mock Convex
vi.mock('convex/react', () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));

// Mock Convex API
vi.mock('@/convex/_generated/api', () => ({
  api: {
    billing: {
      recordPatientPayment: 'recordPatientPayment',
    },
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('PatientPaymentModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    invoiceId: 'invoice-123' as Id<'invoices'>,
    invoiceNumber: 'INV-001',
    patientResponsibility: 50.00, // $50.00
    userEmail: 'patient@example.com',
    onPaymentSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Accessibility', () => {
    it('should have DialogTitle with proper id', () => {
      render(<PatientPaymentModal {...defaultProps} />);
      
      const title = screen.getByText('Pay Invoice');
      expect(title).toBeInTheDocument();
      expect(title).toHaveAttribute('id', 'payment-modal-title');
    });

    it('should have DialogDescription with proper id', () => {
      render(<PatientPaymentModal {...defaultProps} />);
      
      const description = screen.getByText(/Submit payment for invoice/i);
      expect(description).toBeInTheDocument();
      expect(description).toHaveAttribute('id', 'payment-modal-description');
    });

    it('should have DialogContent with proper ARIA attributes', () => {
      render(<PatientPaymentModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'payment-modal-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'payment-modal-description');
    });

    it('should have form fields with proper labels and ARIA attributes', () => {
      render(<PatientPaymentModal {...defaultProps} />);
      
      const amountInput = screen.getByLabelText(/payment amount/i);
      expect(amountInput).toBeInTheDocument();
      expect(amountInput).toHaveAttribute('id', 'payment-amount');
      expect(amountInput).toHaveAttribute('type', 'number');
      
      const methodSelect = screen.getByLabelText(/payment method/i);
      expect(methodSelect).toBeInTheDocument();
      expect(methodSelect).toHaveAttribute('id', 'payment-method');
    });
  });

  describe('Form Validation', () => {
    it('should display error message when amount is invalid', async () => {
      const user = userEvent.setup();
      render(<PatientPaymentModal {...defaultProps} />);
      
      const amountInput = screen.getByLabelText(/payment amount/i);
      const form = amountInput.closest('form');
      
      // Clear amount and submit form directly (button might be disabled)
      await user.clear(amountInput);
      await user.type(amountInput, '0'); // Set to invalid value
      
      // Submit form directly to trigger validation
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/amount must be greater than 0/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveAttribute('id', 'amount-error');
      }, { timeout: 3000 });
    });

    it('should display error message when payment method is not selected', async () => {
      const user = userEvent.setup();
      render(<PatientPaymentModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /submit payment/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/payment method is required/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveAttribute('id', 'method-error');
      });
    });

    it('should display error message when amount exceeds patient responsibility', async () => {
      const user = userEvent.setup();
      render(<PatientPaymentModal {...defaultProps} />);
      
      const amountInput = screen.getByLabelText(/payment amount/i);
      const submitButton = screen.getByRole('button', { name: /submit payment/i });
      
      // Enter amount greater than patient responsibility
      await user.clear(amountInput);
      await user.type(amountInput, '100.00');
      await user.click(submitButton);
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/amount cannot exceed/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });

    it('should clear error message when user corrects the input', async () => {
      const user = userEvent.setup();
      render(<PatientPaymentModal {...defaultProps} />);
      
      const amountInput = screen.getByLabelText(/payment amount/i);
      const submitButton = screen.getByRole('button', { name: /submit payment/i });
      
      // Trigger error
      await user.clear(amountInput);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/amount must be greater than 0/i)).toBeInTheDocument();
      });
      
      // Fix the input
      await user.type(amountInput, '25.00');
      
      await waitFor(() => {
        expect(screen.queryByText(/amount must be greater than 0/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Initial State', () => {
    it('should pre-fill amount with patient responsibility when modal opens', () => {
      render(<PatientPaymentModal {...defaultProps} patientResponsibility={50.00} />);
      
      const amountInput = screen.getByLabelText(/payment amount/i) as HTMLInputElement;
      expect(amountInput.value).toBe('50.00');
    });

    it('should reset form when modal closes and reopens', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const { rerender } = render(
        <PatientPaymentModal {...defaultProps} open={true} onOpenChange={onOpenChange} />
      );
      
      const amountInput = screen.getByLabelText(/payment amount/i) as HTMLInputElement;
      await user.clear(amountInput);
      await user.type(amountInput, '30.00');
      
      expect(amountInput.value).toBe('30.00');
      
      // Close modal
      rerender(
        <PatientPaymentModal {...defaultProps} open={false} onOpenChange={onOpenChange} />
      );
      
      // Reopen modal
      rerender(
        <PatientPaymentModal {...defaultProps} open={true} onOpenChange={onOpenChange} />
      );
      
      const newAmountInput = screen.getByLabelText(/payment amount/i) as HTMLInputElement;
      expect(newAmountInput.value).toBe('50.00'); // Should be reset to patient responsibility
    });
  });
});


'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface PatientPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: Id<'invoices'>;
  invoiceNumber: string;
  patientResponsibility: number; // in dollars (backend returns dollars)
  userEmail: string;
  onPaymentSuccess?: () => void;
}

type PaymentMethod = 'credit_card' | 'debit_card' | 'check' | 'cash' | 'bank_transfer' | 'ach' | 'other';

export function PatientPaymentModal({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  patientResponsibility,
  userEmail,
  onPaymentSuccess,
}: PatientPaymentModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; paymentMethod?: string }>({});

  // Pre-fill amount with patient responsibility when modal opens
  useEffect(() => {
    if (open) {
      const amountInDollars = patientResponsibility.toFixed(2);
      setAmount(amountInDollars);
      setPaymentMethod('');
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, patientResponsibility]);

  const validateForm = (): boolean => {
    const newErrors: { amount?: string; paymentMethod?: string } = {};

    // Validate amount
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (amountValue > patientResponsibility) {
      newErrors.amount = `Amount cannot exceed $${patientResponsibility.toFixed(2)}`;
    }

    // Validate payment method
    if (!paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Get mutation function
  const recordPayment = useMutation(api.billing.recordPatientPayment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate mock transaction ID (stub - no real payment gateway)
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      await recordPayment({
        invoiceId,
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        paymentMethod: paymentMethod as PaymentMethod,
        userEmail,
        transactionId,
      });

      toast.success('Payment submitted successfully', {
        description: `Payment of $${amount} has been recorded for invoice ${invoiceNumber}`,
      });

      // Close modal and refresh data
      onOpenChange(false);
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (error) {
      // Log error for debugging/monitoring (error is already displayed to user via toast)
      logger.error(
        'Payment submission error:',
        error instanceof Error ? error.message : String(error),
        {
          invoiceId,
          invoiceNumber,
          amount,
          paymentMethod,
          userEmail,
        }
      );
      
      // Enhanced error handling with specific error types
      let errorMessage = 'An error occurred while processing your payment';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        // Network/connection errors
        if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        // Validation errors from backend
        else if (errorMsg.includes('validation') || errorMsg.includes('invalid') || errorMsg.includes('required')) {
          errorMessage = error.message;
        }
        // Authorization errors
        else if (errorMsg.includes('unauthorized') || errorMsg.includes('permission') || errorMsg.includes('access')) {
          errorMessage = 'You do not have permission to process this payment. Please contact support.';
        }
        // Convex-specific errors
        else if (errorMsg.includes('convex') || errorMsg.includes('query') || errorMsg.includes('mutation')) {
          errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
        }
        // Generic error with message
        else {
          errorMessage = error.message;
        }
      }
      
      toast.error('Payment submission failed', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle id="payment-modal-title" className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
            Pay Invoice
          </DialogTitle>
          <DialogDescription id="payment-modal-description">
            Submit payment for invoice {invoiceNumber}. Patient responsibility: ${patientResponsibility.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Info */}
          <div className="bg-surface-elevated rounded-lg p-4 border border-border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Invoice Number:</span>
              <span className="font-medium text-text-primary">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-text-secondary">Amount Due:</span>
              <span className="font-semibold text-text-primary">${patientResponsibility.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">
              Payment Amount <span className="text-status-error">*</span>
            </Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={patientResponsibility.toFixed(2)}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) {
                  setErrors({ ...errors, amount: undefined });
                }
              }}
              disabled={isSubmitting}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'amount-error' : undefined}
            />
            {errors.amount && (
              <p id="amount-error" className="text-sm text-status-error" role="alert">
                {errors.amount}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">
              Payment Method <span className="text-status-error">*</span>
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => {
                setPaymentMethod(value as PaymentMethod);
                if (errors.paymentMethod) {
                  setErrors({ ...errors, paymentMethod: undefined });
                }
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="payment-method"
                aria-invalid={!!errors.paymentMethod}
                aria-describedby={errors.paymentMethod ? 'method-error' : undefined}
              >
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="debit_card">Debit Card</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="ach">ACH</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p id="method-error" className="text-sm text-status-error" role="alert">
                {errors.paymentMethod}
              </p>
            )}
          </div>

          {/* Note: This is a stub - no real payment gateway integration */}
          <div className="bg-status-info/10 border border-status-info/20 rounded-lg p-3">
            <p className="text-xs text-text-secondary">
              <strong>Note:</strong> This is a payment stub for testing purposes. No actual payment will be processed.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !amount || !paymentMethod}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Submit Payment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PaymentMethod = 'credit_card' | 'debit_card' | 'check' | 'cash' | 'bank_transfer' | 'ach' | 'other';

/**
 * Patient Payment Form Component
 * 
 * Form for recording patient payments with:
 * - Invoice selection dropdown
 * - Payment amount input
 * - Payment method selection
 * - Validation and error handling
 */
interface PatientPaymentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PatientPaymentForm({ onSuccess, onCancel }: PatientPaymentFormProps) {
  const { data: session } = useZentheaSession();
  const userEmail = session?.user?.email;
  const tenantId = session?.user?.tenantId;

  // Form state
  const [invoiceId, setInvoiceId] = useState<Id<'invoices'> | ''>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');

  // Validation errors
  const [errors, setErrors] = useState<{
    invoiceId?: string;
    amount?: string;
    paymentMethod?: string;
  }>({});

  // Loading and submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutation
  const recordPatientPayment = useMutation(api.billing.recordPatientPayment);

  // Query invoices that can receive payments (not fully paid)
  // We'll query all invoices for the tenant and filter client-side for now
  // In the future, we could add a query specifically for unpaid invoices
  const invoicesQueryArgs = tenantId && userEmail
    ? {
        tenantId,
        userEmail,
      }
    : 'skip';

  // For now, we'll need to query invoices by tenant
  // Since there's no direct query, we'll need to create one or query patient invoices
  // Let's query all invoices for the tenant - we'll need to add a query for this
  // For now, let's use a workaround: query by getting patient invoices for all patients
  // Actually, let's create a simple query that gets unpaid invoices for the tenant
  const invoices = useQuery(
    (api as any).billing?.getClinicInvoicesList,
    invoicesQueryArgs
  ) as
    | Array<{
        _id: Id<'invoices'>;
        invoiceNumber: string;
        patientResponsibility: number;
        status: string;
        patientName?: string;
      }>
    | undefined;

  // Get selected invoice details
  const selectedInvoice = invoices?.find((inv) => inv._id === invoiceId);

  // Filter to only unpaid/partially paid invoices
  const unpaidInvoices = invoices?.filter(
    (inv) => inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partially_paid'
  ) || [];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!invoiceId) {
      setAmount('');
      setPaymentMethod('');
      setErrors({});
    }
  }, [invoiceId]);

  // Pre-fill amount when invoice is selected
  useEffect(() => {
    if (selectedInvoice && !amount) {
      // Pre-fill with patient responsibility (already in dollars from getClinicInvoicesList)
      const amountInDollars = selectedInvoice.patientResponsibility.toFixed(2);
      setAmount(amountInDollars);
    }
  }, [selectedInvoice, amount]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate invoice selection
    if (!invoiceId) {
      newErrors.invoiceId = 'Invoice selection is required';
    }

    // Validate payment amount
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      newErrors.amount = 'Payment amount must be greater than 0';
    } else if (selectedInvoice && amountValue > selectedInvoice.patientResponsibility) {
      // patientResponsibility is already in dollars from getClinicInvoicesList
      newErrors.amount = `Amount cannot exceed $${selectedInvoice.patientResponsibility.toFixed(2)}`;
    }

    // Validate payment method
    if (!paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!tenantId || !userEmail || !invoiceId) {
      toast.error('Missing required information. Please try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100);
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      await recordPatientPayment({
        invoiceId: invoiceId as Id<'invoices'>,
        amount: amountInCents,
        paymentMethod: paymentMethod as PaymentMethod,
        userEmail,
        transactionId,
      });

      toast.success('Patient payment recorded successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to record patient payment:', error);
      
      // Provide more specific error messages based on error type
      let errorTitle = 'Failed to record payment';
      let errorDescription = 'Please try again or contact support.';
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('authorization') || errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
          errorTitle = 'Permission denied';
          errorDescription = 'You do not have permission to record payments for this invoice.';
        } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
          errorTitle = 'Invalid input';
          errorDescription = 'Please check your input and try again.';
        } else if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          errorTitle = 'Invoice not found';
          errorDescription = 'The selected invoice could not be found. Please refresh and try again.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          errorTitle = 'Network error';
          errorDescription = 'Unable to connect to the server. Please check your connection and try again.';
        } else {
          errorDescription = error.message;
        }
      }
      
      toast.error(errorTitle, {
        description: errorDescription,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setInvoiceId('');
    setAmount('');
    setPaymentMethod('');
    setErrors({});
    onCancel?.();
  };

  if (!tenantId || !userEmail) {
    return (
      <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 text-status-error mr-2" />
          <p className="text-status-error text-sm">
            Please log in to record patient payments. Tenant information is required.
          </p>
        </div>
      </div>
    );
  }

  const isLoadingInvoices = invoices === undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Invoice Selection */}
      <div className="space-y-2">
        <Label htmlFor="invoice-select">
          Invoice <span className="text-status-error">*</span>
        </Label>
        <Select
          value={invoiceId}
          onValueChange={(value) => {
            setInvoiceId(value as Id<'invoices'>);
            setErrors((prev) => ({ ...prev, invoiceId: undefined }));
          }}
          disabled={isLoadingInvoices || isSubmitting}
        >
          <SelectTrigger id="invoice-select" className={errors.invoiceId ? 'border-status-error' : ''}>
            <SelectValue placeholder={isLoadingInvoices ? 'Loading invoices...' : 'Select an invoice'} />
          </SelectTrigger>
          <SelectContent>
            {unpaidInvoices.length === 0 ? (
              <SelectItem value="no-invoices" disabled>
                No unpaid invoices available
              </SelectItem>
            ) : (
              unpaidInvoices.map((invoice) => (
                <SelectItem key={invoice._id} value={invoice._id}>
                  {invoice.invoiceNumber}
                  {invoice.patientName && ` - ${invoice.patientName}`}
                  {' - '}
                  ${invoice.patientResponsibility.toFixed(2)} ({invoice.status})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.invoiceId && (
          <div className="flex items-center text-status-error text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            {errors.invoiceId}
          </div>
        )}
        {selectedInvoice && (
          <p className="text-text-secondary text-sm">
            Patient responsibility: ${selectedInvoice.patientResponsibility.toFixed(2)}
          </p>
        )}
      </div>

      {/* Payment Amount */}
      <div className="space-y-2">
        <Label htmlFor="payment-amount">
          Payment Amount <span className="text-status-error">*</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
          <Input
            id="payment-amount"
            type="number"
            step="0.01"
            min="0.01"
            max={selectedInvoice ? selectedInvoice.patientResponsibility.toFixed(2) : undefined}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setErrors((prev) => ({ ...prev, amount: undefined }));
            }}
            placeholder="0.00"
            className={cn('pl-8', errors.amount ? 'border-status-error' : '')}
            disabled={isSubmitting}
          />
        </div>
        {errors.amount && (
          <div className="flex items-center text-status-error text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            {errors.amount}
          </div>
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
            setErrors((prev) => ({ ...prev, paymentMethod: undefined }));
          }}
          disabled={isSubmitting}
        >
          <SelectTrigger
            id="payment-method"
            className={errors.paymentMethod ? 'border-status-error' : ''}
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
          <div className="flex items-center text-status-error text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            {errors.paymentMethod}
          </div>
        )}
      </div>

      {/* Note about payment stub */}
      <div className="bg-status-info/10 border border-status-info/20 rounded-lg p-3">
        <p className="text-xs text-text-secondary">
          <strong>Note:</strong> This is a payment stub for testing purposes. No actual payment will be processed.
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoadingInvoices}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Recording...
            </>
          ) : (
            'Post Payment'
          )}
        </Button>
      </div>
    </form>
  );
}


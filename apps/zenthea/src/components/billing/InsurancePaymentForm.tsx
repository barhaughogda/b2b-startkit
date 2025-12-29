'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
import { formatCurrency } from '@/lib/billing/formatting';
import { cn } from '@/lib/utils';

/**
 * Insurance Payment Form Component
 * 
 * Form for recording insurance payments with:
 * - Claim selection dropdown
 * - Payment amount input
 * - Adjustment amount input (optional)
 * - Check number input (optional)
 * - Transaction ID input (optional)
 * - Validation and error handling
 */
interface InsurancePaymentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InsurancePaymentForm({ onSuccess, onCancel }: InsurancePaymentFormProps) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;
  const tenantId = session?.user?.tenantId;

  // Form state
  const [claimId, setClaimId] = useState<Id<'insuranceClaims'> | ''>('');
  const [amount, setAmount] = useState<string>('');
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');

  // Validation errors
  const [errors, setErrors] = useState<{
    claimId?: string;
    amount?: string;
    adjustmentAmount?: string;
  }>({});

  // Loading and submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutation
  const recordInsurancePayment = useMutation(api.billing.recordInsurancePayment);

  // Query claims that can receive payments (not fully paid)
  const claimsQueryArgs = tenantId && userEmail
    ? {
        tenantId,
        userEmail,
        page: 1,
        pageSize: 1000, // Get all claims for dropdown
        status: ['submitted', 'accepted', 'denied'] as const, // Exclude draft and paid
      }
    : 'skip';

  const claimsResponse = useQuery(
    (api as any).billing?.getClinicClaimsList,
    claimsQueryArgs
  ) as
    | {
        claims: Array<{
          _id: Id<'insuranceClaims'>;
          claimId: string;
          claimControlNumber?: string;
          totalCharges: number;
          status: string;
        }>;
      }
    | undefined;

  // Get selected claim details
  const selectedClaim = claimsResponse?.claims?.find((c) => c._id === claimId);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!claimId) {
      setAmount('');
      setAdjustmentAmount('');
      setCheckNumber('');
      setTransactionId('');
      setErrors({});
    }
  }, [claimId]);

  // Pre-fill amount when claim is selected
  useEffect(() => {
    if (selectedClaim && !amount) {
      // Pre-fill with claim total charges (in dollars)
      const amountInDollars = (selectedClaim.totalCharges / 100).toFixed(2);
      setAmount(amountInDollars);
    }
  }, [selectedClaim, amount]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate claim selection
    if (!claimId) {
      newErrors.claimId = 'Claim selection is required';
    }

    // Validate payment amount
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      newErrors.amount = 'Payment amount must be greater than 0';
    }

    // Validate adjustment amount (if provided)
    if (adjustmentAmount) {
      const adjustmentValue = parseFloat(adjustmentAmount);
      if (isNaN(adjustmentValue)) {
        newErrors.adjustmentAmount = 'Adjustment amount must be a valid number';
      }
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

    if (!tenantId || !userEmail || !claimId) {
      toast.error('Missing required information. Please try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100);
      const adjustmentInCents = adjustmentAmount
        ? Math.round(parseFloat(adjustmentAmount) * 100)
        : 0;

      await recordInsurancePayment({
        claimId: claimId as Id<'insuranceClaims'>,
        amount: amountInCents,
        adjustmentAmount: adjustmentInCents,
        checkNumber: checkNumber || undefined,
        transactionId: transactionId || undefined,
        userEmail,
      });

      toast.success('Insurance payment recorded successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to record insurance payment:', error);
      
      // Provide more specific error messages based on error type
      let errorTitle = 'Failed to record payment';
      let errorDescription = 'Please try again or contact support.';
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('authorization') || errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
          errorTitle = 'Permission denied';
          errorDescription = 'You do not have permission to record payments for this claim.';
        } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
          errorTitle = 'Invalid input';
          errorDescription = 'Please check your input and try again.';
        } else if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          errorTitle = 'Claim not found';
          errorDescription = 'The selected claim could not be found. Please refresh and try again.';
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
    setClaimId('');
    setAmount('');
    setAdjustmentAmount('');
    setCheckNumber('');
    setTransactionId('');
    setErrors({});
    onCancel?.();
  };

  if (!tenantId || !userEmail) {
    return (
      <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 text-status-error mr-2" />
          <p className="text-status-error text-sm">
            Please log in to record insurance payments. Tenant information is required.
          </p>
        </div>
      </div>
    );
  }

  const claims = claimsResponse?.claims || [];
  const isLoadingClaims = claimsResponse === undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Claim Selection */}
      <div className="space-y-2">
        <Label htmlFor="claim-select">
          Claim <span className="text-status-error">*</span>
        </Label>
        <Select
          value={claimId}
          onValueChange={(value) => {
            setClaimId(value as Id<'insuranceClaims'>);
            setErrors((prev) => ({ ...prev, claimId: undefined }));
          }}
          disabled={isLoadingClaims || isSubmitting}
        >
          <SelectTrigger id="claim-select" className={errors.claimId ? 'border-status-error' : ''}>
            <SelectValue placeholder={isLoadingClaims ? 'Loading claims...' : 'Select a claim'} />
          </SelectTrigger>
          <SelectContent>
            {claims.length === 0 ? (
              <SelectItem value="no-claims" disabled>
                No claims available
              </SelectItem>
            ) : (
              claims.map((claim) => (
                <SelectItem key={claim._id} value={claim._id}>
                  {claim.claimControlNumber || claim.claimId} -{' '}
                  {formatCurrency(claim.totalCharges)} ({claim.status})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.claimId && (
          <div className="flex items-center text-status-error text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            {errors.claimId}
          </div>
        )}
        {selectedClaim && (
          <p className="text-text-secondary text-sm">
            Claim total: {formatCurrency(selectedClaim.totalCharges)}
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

      {/* Adjustment Amount */}
      <div className="space-y-2">
        <Label htmlFor="adjustment-amount">Adjustment Amount (Optional)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
          <Input
            id="adjustment-amount"
            type="number"
            step="0.01"
            value={adjustmentAmount}
            onChange={(e) => {
              setAdjustmentAmount(e.target.value);
              setErrors((prev) => ({ ...prev, adjustmentAmount: undefined }));
            }}
            placeholder="0.00"
            className={cn('pl-8', errors.adjustmentAmount ? 'border-status-error' : '')}
            disabled={isSubmitting}
          />
        </div>
        {errors.adjustmentAmount && (
          <div className="flex items-center text-status-error text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            {errors.adjustmentAmount}
          </div>
        )}
        <p className="text-text-secondary text-sm">
          Enter a negative amount for write-offs or adjustments
        </p>
      </div>

      {/* Check Number */}
      <div className="space-y-2">
        <Label htmlFor="check-number">Check Number (Optional)</Label>
        <Input
          id="check-number"
          type="text"
          value={checkNumber}
          onChange={(e) => setCheckNumber(e.target.value)}
          placeholder="Enter check number if applicable"
          disabled={isSubmitting}
        />
      </div>

      {/* Transaction ID */}
      <div className="space-y-2">
        <Label htmlFor="transaction-id">Transaction ID (Optional)</Label>
        <Input
          id="transaction-id"
          type="text"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          placeholder="Enter transaction ID if applicable"
          disabled={isSubmitting}
        />
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
        <Button type="submit" disabled={isSubmitting || isLoadingClaims}>
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


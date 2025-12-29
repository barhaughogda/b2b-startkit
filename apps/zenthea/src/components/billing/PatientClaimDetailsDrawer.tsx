'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/lib/billing/formatting';
import { getStatusLabel, getStatusBadgeVariant } from '@/lib/billing/statusMapping';
import type { ClaimStatus, ClaimLineItem, InsurancePayment } from '@/types/billing';
import type { Id } from '@/convex/_generated/dataModel';

// Type for payment returned from getPatientClaimDetails query
// paidAt may be optional in some cases, so we use a flexible type
type ClaimPayment = Omit<InsurancePayment, 'paidAt'> & { paidAt?: number };

/**
 * Props for PatientClaimDetailsDrawer component
 */
export interface PatientClaimDetailsDrawerProps {
  /** Claim ID to display details for */
  claimId: string;
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when drawer open state changes */
  onOpenChange: (open: boolean) => void;
  /** Patient ID for authorization */
  patientId: Id<'patients'>;
  /** Email of authenticated patient user */
  userEmail: string;
}

/**
 * Format date for display
 */
function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
}

/**
 * Format date string (ISO format) for display
 */
function formatDateString(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

/**
 * PatientClaimDetailsDrawer Component
 * 
 * Displays detailed information about a claim in a slide-over drawer for patients:
 * - Claim information (status, amounts, dates)
 * - Line items (procedures, codes, charges)
 * - Payment history (insurance payments)
 * - Status timeline
 * 
 * Read-only view for patients (Task 5.3)
 * 
 * @example
 * ```tsx
 * <PatientClaimDetailsDrawer
 *   claimId="CLM-001"
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   patientId="patient123"
 *   userEmail="patient@example.com"
 * />
 * ```
 */
export function PatientClaimDetailsDrawer({
  claimId,
  open,
  onOpenChange,
  patientId,
  userEmail,
}: PatientClaimDetailsDrawerProps) {
  // Track retry to temporarily skip query and force refetch
  const [shouldSkip, setShouldSkip] = React.useState(false);
  
  // Reset skip state when drawer opens or claimId changes
  React.useEffect(() => {
    if (open) {
      setShouldSkip(false);
    }
  }, [open, claimId]);
  
  // Query claim details - skip when drawer is closed or during retry
  const claimDetails = useQuery(
    (api as any).billing?.getPatientClaimDetails,
    open && !shouldSkip
      ? {
          claimId,
          patientId,
          userEmail,
        }
      : 'skip'
  );

  // Loading state
  if (open && claimDetails === undefined) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Claim Details</SheetTitle>
            <SheetDescription>Loading claim information...</SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-center py-12" role="status" aria-live="polite" aria-label="Loading claim details">
            <Loader2 className="h-8 w-8 animate-spin text-zenthea-teal" aria-hidden="true" />
            <span className="ml-3 text-text-secondary">Loading claim details...</span>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Error state
  if (open && claimDetails === null) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Claim Details</SheetTitle>
            <SheetDescription>Error loading claim</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-4 mb-4" role="alert" aria-live="assertive">
              <div className="flex items-center mb-3">
                <AlertCircle className="h-5 w-5 text-status-error mr-2" aria-hidden="true" />
                <p className="text-status-error font-medium">Error loading claim details</p>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                We encountered an error while loading the claim information. Please try again.
              </p>
              <button
                onClick={() => {
                  // Temporarily skip query, then re-enable to force refetch
                  setShouldSkip(true);
                  setTimeout(() => setShouldSkip(false), 0);
                }}
                className="flex items-center gap-2 text-sm text-status-error hover:text-status-error/80 transition-colors"
                aria-label="Retry loading claim details"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // No claim data
  if (open && (!claimDetails || !claimDetails.claim)) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Claim Details</SheetTitle>
            <SheetDescription>Claim not found</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  if (!open || !claimDetails || !claimDetails.claim) {
    return null;
  }

  const { claim, lineItems, payments, patientName, payerName } = claimDetails;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" data-testid="claim-details-drawer">
        <SheetHeader>
          <SheetTitle>Claim Details</SheetTitle>
          <SheetDescription>
            <span className="text-text-secondary">View only</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Claim Information */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Claim Information</h3>
            <div className="bg-surface-elevated rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">Claim Control Number:</span>
                <span className="text-text-primary font-medium">{claim.claimControlNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Status:</span>
                <StatusBadge
                  status={
                    (() => {
                      const variant = getStatusBadgeVariant(claim.status as ClaimStatus);
                      return variant === 'default' ? 'info' : variant;
                    })() as 'success' | 'warning' | 'error' | 'info' | 'critical'
                  }
                >
                  {getStatusLabel(claim.status as ClaimStatus)}
                </StatusBadge>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Total Charges:</span>
                <span className="text-text-primary font-medium">{formatCurrency(claim.totalCharges)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Payer:</span>
                <span className="text-text-primary font-medium">{payerName}</span>
              </div>
              {claim.datesOfService && claim.datesOfService.length > 0 && (
                <div>
                  <span className="text-text-secondary">Dates of Service:</span>
                  <div className="mt-1 space-y-1">
                    {claim.datesOfService.map((date: string, index: number) => (
                      <span key={index} className="text-text-primary font-medium block">
                        {formatDateString(date)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {claim.denialReason && (
                <div>
                  <span className="text-text-secondary">Denial Reason:</span>
                  <p className="text-status-error mt-1">{claim.denialReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          {lineItems && lineItems.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Line Items</h3>
              <div className="bg-surface-elevated rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-interactive">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Procedure Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Diagnosis Codes
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Units
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Charge
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary/10">
                      {lineItems.map((item: ClaimLineItem) => (
                        <tr key={item.lineItemId}>
                          <td className="px-4 py-3 text-sm text-text-primary">
                            {item.procedureCode}
                            {item.modifiers && item.modifiers.length > 0 && (
                              <span className="ml-1 text-text-tertiary">
                                ({item.modifiers.join(', ')})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {item.diagnosisCodes?.join(', ') || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{item.units}</td>
                          <td className="px-4 py-3 text-sm text-right text-text-primary font-medium">
                            {formatCurrency(item.chargeAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Payment History */}
          {payments && payments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Payment History</h3>
              <div className="bg-surface-elevated rounded-lg p-4 space-y-3">
                {payments.map((payment: ClaimPayment) => (
                  <div key={payment.paymentId} className="border-b border-border-primary/10 last:border-0 pb-3 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-text-primary font-medium">
                          {formatCurrency(payment.amount)}
                        </p>
                        {payment.adjustmentAmount > 0 && (
                          <p className="text-sm text-text-secondary">
                            Adjustment: {formatCurrency(payment.adjustmentAmount)}
                          </p>
                        )}
                        {payment.checkNumber && (
                          <p className="text-xs text-text-tertiary">Check #: {payment.checkNumber}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-text-secondary">
                          {payment.paidAt ? formatDate(payment.paidAt) : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}


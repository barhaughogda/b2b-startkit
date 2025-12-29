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

/**
 * Props for ClaimDetailsDrawer component
 */
export interface ClaimDetailsDrawerProps {
  /** Claim ID to display details for */
  claimId: string;
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when drawer open state changes */
  onOpenChange: (open: boolean) => void;
  /** Tenant ID for tenant isolation */
  tenantId: string;
  /** Email of authenticated user */
  userEmail: string;
  /** Whether to use clinic-level access (for clinic admins/owners) instead of provider-scoped access */
  useClinicAccess?: boolean;
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
 * ClaimDetailsDrawer Component
 * 
 * Displays detailed information about a claim in a slide-over drawer:
 * - Claim information (status, amounts, dates)
 * - Line items (procedures, codes, charges)
 * - Payment history (insurance payments)
 * - Status timeline
 * 
 * Read-only view for providers (Task 4.4)
 * 
 * @example
 * ```tsx
 * <ClaimDetailsDrawer
 *   claimId="CLM-001"
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   tenantId="tenant-1"
 *   userEmail="provider@example.com"
 * />
 * ```
 */
export function ClaimDetailsDrawer({
  claimId,
  open,
  onOpenChange,
  tenantId,
  userEmail,
  useClinicAccess = false,
}: ClaimDetailsDrawerProps) {
  // Query claim details - skip when drawer is closed
  // Use clinic-level access for clinic admins/owners, provider-scoped for providers
  const queryFunction = useClinicAccess 
    ? (api as any).billing?.getClinicClaimDetails
    : (api as any).billing?.getClaimDetails;
  
  const claimDetails = useQuery(
    queryFunction,
    open
      ? {
          claimId,
          tenantId,
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
                  // Force refetch by closing and reopening
                  onOpenChange(false);
                  setTimeout(() => onOpenChange(true), 0);
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
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
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
                <span className="text-text-secondary">Patient:</span>
                <span className="text-text-primary font-medium">{patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Payer:</span>
                <span className="text-text-primary font-medium">{payerName}</span>
              </div>
              <div>
                <span className="text-text-secondary">Dates of Service:</span>
                <div className="mt-1 space-y-1">
                  {claim.datesOfService.map((date: string, idx: number) => (
                    <div key={idx} className="text-text-primary">
                      {formatDateString(date)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Line Items</h3>
            {lineItems.length === 0 ? (
              <div className="bg-surface-elevated rounded-lg p-4 text-center text-text-secondary">
                No line items found
              </div>
            ) : (
              <div className="space-y-3">
                {lineItems.map((item: ClaimLineItem) => (
                  <div key={item.lineItemId} className="bg-surface-elevated rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-text-primary font-medium">Procedure: {item.procedureCode}</span>
                      <span className="text-text-primary font-medium">{formatCurrency(item.chargeAmount)}</span>
                    </div>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="text-sm text-text-secondary mb-1">
                        Modifiers: {item.modifiers.join(', ')}
                      </div>
                    )}
                    <div className="text-sm text-text-secondary mb-1">
                      Diagnosis Codes: {item.diagnosisCodes.join(', ')}
                    </div>
                    <div className="text-sm text-text-secondary">Units: {item.units}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment History */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Payment History</h3>
            {payments.length === 0 ? (
              <div className="bg-surface-elevated rounded-lg p-4 text-center text-text-secondary">
                No payments recorded
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment: InsurancePayment) => (
                  <div key={payment.paymentId} className="bg-surface-elevated rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-text-primary font-medium">Payment Amount:</span>
                      <span className="text-text-primary font-medium">{formatCurrency(payment.amount)}</span>
                    </div>
                    {payment.adjustmentAmount !== 0 && (
                      <div className="flex justify-between mb-2">
                        <span className="text-text-secondary">Adjustment:</span>
                        <span className="text-text-secondary">{formatCurrency(payment.adjustmentAmount)}</span>
                      </div>
                    )}
                    {payment.checkNumber && (
                      <div className="text-sm text-text-secondary mb-1">Check Number: {payment.checkNumber}</div>
                    )}
                    <div className="text-sm text-text-secondary">Paid: {formatDate(payment.paidAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Timeline */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Status Timeline</h3>
            <div className="bg-surface-elevated rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary">Created:</span>
                <span className="text-text-primary">{formatDate(claim.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Current Status:</span>
                <span className="text-text-primary">{getStatusLabel(claim.status as ClaimStatus)}</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


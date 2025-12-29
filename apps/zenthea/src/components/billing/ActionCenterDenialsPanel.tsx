'use client';

import React from 'react';
import { AlertTriangle, Clock, ArrowRight, Eye, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { InsuranceClaim } from '@/types/billing';
import { formatCurrency } from '@/lib/billing/formatting';

/**
 * Props for ActionCenterDenialsPanel component
 */
export interface ActionCenterDenialsPanelProps {
  /** Array of denied claims to display */
  deniedClaims: InsuranceClaim[];
  /** Array of pending claims to display */
  pendingClaims: InsuranceClaim[];
  /** Map of patient IDs to patient names */
  patientNames: Record<string, string>;
  /** Map of provider IDs to provider names */
  providerNames: Record<string, string>;
  /** Map of payer IDs to payer names */
  payerNames: Record<string, string>;
  /** Maximum number of items to display per section (default: 5) */
  maxItems?: number;
  /** Callback when Appeal button is clicked */
  onAppeal?: (claim: InsuranceClaim) => void;
  /** Callback when View Details button is clicked */
  onViewDetails?: (claim: InsuranceClaim) => void;
  /** Callback when View All link is clicked with filter type */
  onViewAll?: (filterType: 'denied' | 'pending') => void;
  /** Additional CSS classes */
  className?: string;
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
 * ActionCenterDenialsPanel Component
 * 
 * Displays top denied and pending claims in an action center panel.
 * Provides quick action buttons (Appeal, View Details) and
 * links to view all claims with filters applied.
 * 
 * Task 3.5: Implement "Action Center - Denials" Panel
 * 
 * @example
 * ```tsx
 * <ActionCenterDenialsPanel
 *   deniedClaims={deniedClaims}
 *   pendingClaims={pendingClaims}
 *   patientNames={{ 'patient-1': 'John Doe' }}
 *   providerNames={{ 'provider-1': 'Dr. Smith' }}
 *   payerNames={{ 'payer-1': 'Blue Cross' }}
 *   maxItems={5}
 *   onAppeal={(claim) => handleAppeal(claim)}
 *   onViewDetails={(claim) => handleViewDetails(claim)}
 *   onViewAll={(type) => handleViewAll(type)}
 * />
 * ```
 */
export function ActionCenterDenialsPanel({
  deniedClaims,
  pendingClaims,
  patientNames,
  providerNames,
  payerNames,
  maxItems = 5,
  onAppeal,
  onViewDetails,
  onViewAll,
  className,
}: ActionCenterDenialsPanelProps) {
  // Limit claims to maxItems
  const displayedDeniedClaims = deniedClaims.slice(0, maxItems);
  const displayedPendingClaims = pendingClaims.slice(0, maxItems);

  // Empty state
  if (deniedClaims.length === 0 && pendingClaims.length === 0) {
    return (
      <div className={cn('bg-surface-elevated rounded-xl border border-border-primary/20 p-8 text-center', className)}>
        <p className="text-text-secondary">No denied or pending claims</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Action Center - Denials</h2>
        <p className="text-text-secondary mt-1">
          Review and take action on claims requiring attention
        </p>
      </div>

      {/* Denied Claims Section */}
      {displayedDeniedClaims.length > 0 && (
        <div className="bg-surface-elevated rounded-xl border border-border-primary/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-status-error" data-testid="alert-triangle-icon" />
              <h3 className="text-lg font-semibold text-text-primary">Denied Claims</h3>
              <span className="text-text-tertiary text-sm">({deniedClaims.length})</span>
            </div>
            {onViewAll && (
              <button
                onClick={() => onViewAll('denied')}
                className="text-sm text-zenthea-teal hover:text-zenthea-teal-600 flex items-center gap-1"
                aria-label="View all denied claims"
              >
                View All Denied Claims
                <ArrowRight className="h-4 w-4" data-testid="arrow-right-icon" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {displayedDeniedClaims.map((claim, index) => (
              <div
                key={claim.claimId || claim.claimControlNumber || `denied-claim-${index}`}
                data-testid={`claim-item-${claim.claimId}`}
                className="bg-background-primary rounded-lg border border-border-primary/10 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-text-primary">
                        {claim.claimControlNumber}
                      </span>
                      <span className="text-text-secondary text-sm">
                        {formatCurrency(claim.totalCharges)}
                      </span>
                    </div>
                    <div className="text-sm text-text-secondary space-y-1">
                      <div>
                        <span className="font-medium">Patient:</span>{' '}
                        {patientNames[claim.patientId] || claim.patientId}
                      </div>
                      <div>
                        <span className="font-medium">Provider:</span>{' '}
                        {providerNames[claim.providerId] || claim.providerId}
                      </div>
                      <div>
                        <span className="font-medium">Payer:</span>{' '}
                        {payerNames[claim.payerId] || claim.payerId}
                      </div>
                      {claim.denialReason && (
                        <div className="mt-2 pt-2 border-t border-border-primary/10">
                          <div className="font-medium text-status-error">
                            {claim.denialReason.code}: {claim.denialReason.description}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {onAppeal && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAppeal(claim)}
                      aria-label={`Appeal claim ${claim.claimControlNumber}`}
                    >
                      <FileCheck className="h-4 w-4 mr-1" data-testid="file-check-icon" />
                      Appeal
                    </Button>
                  )}
                  {onViewDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(claim)}
                      aria-label={`View details for claim ${claim.claimControlNumber}`}
                    >
                      <Eye className="h-4 w-4 mr-1" data-testid="eye-icon" />
                      View Details
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Claims Section */}
      {displayedPendingClaims.length > 0 && (
        <div className="bg-surface-elevated rounded-xl border border-border-primary/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-status-warning" data-testid="clock-icon" />
              <h3 className="text-lg font-semibold text-text-primary">Pending Claims</h3>
              <span className="text-text-tertiary text-sm">({pendingClaims.length})</span>
            </div>
            {onViewAll && (
              <button
                onClick={() => onViewAll('pending')}
                className="text-sm text-zenthea-teal hover:text-zenthea-teal-600 flex items-center gap-1"
                aria-label="View all pending claims"
              >
                View All Pending Claims
                <ArrowRight className="h-4 w-4" data-testid="arrow-right-icon" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {displayedPendingClaims.map((claim, index) => (
              <div
                key={claim.claimId || claim.claimControlNumber || `pending-claim-${index}`}
                data-testid={`claim-item-${claim.claimId}`}
                className="bg-background-primary rounded-lg border border-border-primary/10 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-text-primary">
                        {claim.claimControlNumber}
                      </span>
                      <span className="text-text-secondary text-sm">
                        {formatCurrency(claim.totalCharges)}
                      </span>
                    </div>
                    <div className="text-sm text-text-secondary space-y-1">
                      <div>
                        <span className="font-medium">Patient:</span>{' '}
                        {patientNames[claim.patientId] || claim.patientId}
                      </div>
                      <div>
                        <span className="font-medium">Provider:</span>{' '}
                        {providerNames[claim.providerId] || claim.providerId}
                      </div>
                      <div>
                        <span className="font-medium">Payer:</span>{' '}
                        {payerNames[claim.payerId] || claim.payerId}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {onViewDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(claim)}
                      aria-label={`View details for claim ${claim.claimControlNumber}`}
                    >
                      <Eye className="h-4 w-4 mr-1" data-testid="eye-icon" />
                      View Details
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


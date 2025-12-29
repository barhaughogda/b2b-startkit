'use client';

import React, { useState } from 'react';
import { ChevronDown, Eye, Download, FileCheck, AlertTriangle, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/billing/formatting';
import { getStatusLabel, getStatusBadgeVariant } from '@/lib/billing/statusMapping';
import type { InsuranceClaim, ClaimStatus } from '@/types/billing';

/**
 * Props for ClinicClaimCard component
 */
export interface ClinicClaimCardProps {
  /** The insurance claim to display */
  claim: InsuranceClaim;
  /** Patient name for display */
  patientName: string;
  /** Provider name for display */
  providerName: string;
  /** Payer name for display */
  payerName: string;
  /** Callback when View Details is clicked */
  onViewDetails?: (claim: InsuranceClaim) => void;
  /** Callback when Appeal is clicked (for denied claims) */
  onAppeal?: (claim: InsuranceClaim) => void;
  /** Callback when Download is clicked */
  onDownload?: (claim: InsuranceClaim) => void;
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
 * ClinicClaimCard Component - Accordion Style (Mobile-First)
 * 
 * Displays an insurance claim in an expandable card format.
 * 
 * Collapsed state: Shows essential info (claim #, patient, amount, status)
 * Expanded state: Shows full breakdown, denial reason, and action buttons
 * 
 * Features:
 * - Mobile-first design with touch-friendly targets
 * - Smooth expand/collapse animation
 * - Keyboard accessible (Enter/Space to toggle)
 * - ARIA attributes for screen readers
 */
export function ClinicClaimCard({
  claim,
  patientName,
  providerName,
  payerName,
  onViewDetails,
  onAppeal,
  onDownload,
  className,
}: ClinicClaimCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardId = `claim-card-${claim.claimId}`;
  const contentId = `claim-content-${claim.claimId}`;

  const isDenied = claim.status === 'denied';
  const isPending = claim.status === 'submitted' || claim.status === 'accepted';

  // Truncate claim control number for mobile display
  const claimNumber = claim.claimControlNumber || claim.claimId;
  const truncatedClaimNumber = claimNumber.length > 16
    ? `${claimNumber.slice(0, 6)}...${claimNumber.slice(-6)}`
    : claimNumber;

  // Get status badge variant
  const statusVariant = (() => {
    const variant = getStatusBadgeVariant(claim.status);
    return variant === 'default' ? 'info' : variant;
  })() as 'success' | 'warning' | 'error' | 'info' | 'critical';

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={cn(
      'bg-surface-elevated rounded-xl border border-border-primary/20 overflow-hidden',
      isDenied && 'border-l-4 border-l-status-error',
      className
    )}>
      {/* Collapsed Header - Always Visible */}
      <div
        id={cardId}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="p-4 sm:p-5 cursor-pointer hover:bg-surface-interactive/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary focus-visible:ring-inset"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left: Icon + Claim Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              'w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0',
              isDenied ? 'bg-status-error/10' : 'bg-zenthea-teal/10'
            )}>
              {isDenied ? (
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-status-error" />
              ) : (
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-zenthea-teal" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {/* Claim number + Patient name */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm text-text-secondary font-mono truncate">
                  <span className="hidden sm:inline">{claimNumber}</span>
                  <span className="sm:hidden">{truncatedClaimNumber}</span>
                </span>
              </div>
              {/* Patient name prominent */}
              <p className="font-medium text-base sm:text-lg text-text-primary truncate mt-0.5">
                {patientName}
              </p>
              {/* Amount prominent */}
              <p className="font-semibold text-lg sm:text-xl text-text-primary mt-1">
                {formatCurrency(claim.totalCharges)}
              </p>
            </div>
          </div>

          {/* Right: Status + Chevron */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <StatusBadge
              status={statusVariant}
              aria-label={`Claim status: ${getStatusLabel(claim.status)}`}
            >
              {getStatusLabel(claim.status)}
            </StatusBadge>
            <ChevronDown
              className={cn(
                'w-5 h-5 text-text-tertiary transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Expanded Content - Details Section */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={cardId}
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
          {/* Divider */}
          <div className="border-t border-border-primary/20 pt-4 space-y-4">
            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <span className="text-text-tertiary">Claim Number</span>
              <span className="text-text-primary font-medium font-mono text-xs break-all">
                {claimNumber}
              </span>

              <span className="text-text-tertiary">Patient</span>
              <span className="text-text-primary font-medium">{patientName}</span>

              <span className="text-text-tertiary">Provider</span>
              <span className="text-text-primary font-medium">{providerName}</span>

              <span className="text-text-tertiary">Payer</span>
              <span className="text-text-primary font-medium">{payerName}</span>

              <span className="text-text-tertiary">Date Created</span>
              <span className="text-text-primary font-medium">{formatDate(claim.createdAt)}</span>

              {claim.datesOfService && claim.datesOfService.length > 0 && (
                <>
                  <span className="text-text-tertiary">Service Date(s)</span>
                  <span className="text-text-primary font-medium">
                    {claim.datesOfService.map(d => formatDateString(d)).join(', ')}
                  </span>
                </>
              )}

              <span className="text-text-tertiary">Total Charges</span>
              <span className="text-text-primary font-semibold">
                {formatCurrency(claim.totalCharges)}
              </span>
            </div>

            {/* Denial Reason (if denied) */}
            {isDenied && claim.denialReason && (
              <div className="p-3 bg-status-error/5 border border-status-error/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-error mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-status-error">
                      Denial Reason: {claim.denialReason.code}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {claim.denialReason.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Status Info */}
            {isPending && (
              <div className="p-3 bg-status-warning/5 border border-status-warning/20 rounded-lg">
                <p className="text-xs text-text-secondary">
                  This claim is currently being processed by the insurance company. 
                  You will be notified when a decision is made.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              {/* View Details - Primary action */}
              {onViewDetails && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-10 px-4 text-sm bg-interactive-primary hover:bg-interactive-primary-hover text-text-inverse flex-1 sm:flex-none min-w-[120px]"
                  aria-label={`View details for claim ${claimNumber}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(claim);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              )}

              {/* Appeal - Only for denied claims */}
              {isDenied && onAppeal && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 text-sm border-status-error/30 text-status-error hover:bg-status-error/10"
                  aria-label={`Appeal claim ${claimNumber}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAppeal(claim);
                  }}
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  Appeal
                </Button>
              )}

              {/* Download */}
              {onDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-4 text-sm"
                  aria-label={`Download claim ${claimNumber}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(claim);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


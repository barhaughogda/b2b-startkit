'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Eye, Download } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { InsuranceClaim, ClaimStatus } from '@/types/billing';
import { getStatusLabel, getStatusBadgeVariant } from '@/lib/billing/statusMapping';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/billing/formatting';

/**
 * Props for ClaimsTable component
 */
export interface ClaimsTableProps {
  /** Array of insurance claims to display */
  claims: InsuranceClaim[];
  /** Map of patient IDs to patient names */
  patientNames: Record<string, string>;
  /** Map of provider IDs to provider names */
  providerNames: Record<string, string>;
  /** Map of payer IDs to payer names */
  payerNames: Record<string, string>;
  /** Callback when a row is clicked */
  onRowClick?: (claim: InsuranceClaim) => void;
  /** Callback when download button is clicked */
  onDownload?: (claim: InsuranceClaim) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Sort configuration
 */
type SortField = 'date' | 'amount' | 'status' | 'patient' | 'provider' | 'payer';
type SortDirection = 'asc' | 'desc';

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
 * ClaimsTable Component
 * 
 * Displays insurance claims in a sortable table with status badges.
 * Supports sorting by date, amount, status, patient, provider, and payer.
 * Note: Filtering is handled at the page level via ClinicBillingFilters component.
 * 
 * @example
 * ```tsx
 * <ClaimsTable
 *   claims={claims}
 *   patientNames={{ 'patient-1': 'John Doe' }}
 *   providerNames={{ 'provider-1': 'Dr. Smith' }}
 *   payerNames={{ 'payer-1': 'Blue Cross' }}
 *   onRowClick={(claim) => handleClaimClick(claim)}
 * />
 * ```
 */
export function ClaimsTable({
  claims,
  patientNames,
  providerNames,
  payerNames,
  onRowClick,
  onDownload,
  className,
}: ClaimsTableProps) {
  // Initialize with default sort: date descending (most recent first)
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort claims (filtering is handled at page level)
  const sortedClaims = useMemo(() => {
    return [...claims].sort((a, b) => {
      let aValue: string | number | undefined;
      let bValue: string | number | undefined;

      switch (sortField) {
        case 'date':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'amount':
          aValue = a.totalCharges;
          bValue = b.totalCharges;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'patient':
          aValue = patientNames[a.patientId] || a.patientId;
          bValue = patientNames[b.patientId] || b.patientId;
          break;
        case 'provider':
          aValue = providerNames[a.providerId] || a.providerId;
          bValue = providerNames[b.providerId] || b.providerId;
          break;
        case 'payer':
          aValue = payerNames[a.payerId] || a.payerId;
          bValue = payerNames[b.payerId] || b.payerId;
          break;
        default:
          return 0;
      }

      // Handle undefined/null values
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [claims, sortField, sortDirection, patientNames, providerNames, payerNames]);

  // Handle sort
  const handleSort = (field: SortField) => {
    // If clicking the same field that's already sorted, toggle direction
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field: start with descending for date/amount, ascending for others
      setSortField(field);
      setSortDirection(field === 'date' || field === 'amount' ? 'desc' : 'asc');
    }
  };

  // Empty state
  if (claims.length === 0) {
    return (
      <div className={cn('text-center py-8 text-text-secondary', className)}>
        <p>No claims found</p>
      </div>
    );
  }

  // Get sort icon for a column
  const getSortIcon = (field: SortField) => {
    // Show icon only if this field is being sorted
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1 inline" data-testid="chevron-up-icon" aria-hidden="true" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1 inline" data-testid="chevron-down-icon" aria-hidden="true" />
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary">All Claims</h2>
        <p className="text-text-secondary mt-1">
          Review and manage all insurance claims
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table role="table" aria-label="Insurance claims table">
          <caption className="sr-only">
            Table of insurance claims with columns for date, patient, provider, payer, amount, and status. Use arrow keys to navigate rows, Enter or Space to view details.
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center h-8 px-2 lg:px-3 hover:bg-surface-interactive rounded"
                  onClick={() => handleSort('date')}
                  aria-label="Sort by date"
                  aria-sort={sortField === 'date' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort('date');
                    }
                  }}
                >
                  Date
                  {getSortIcon('date')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center h-8 px-2 lg:px-3 hover:bg-surface-interactive rounded"
                  onClick={() => handleSort('patient')}
                  aria-label="Sort by patient"
                  aria-sort={sortField === 'patient' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort('patient');
                    }
                  }}
                >
                  Patient
                  {getSortIcon('patient')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center h-8 px-2 lg:px-3 hover:bg-surface-interactive rounded"
                  onClick={() => handleSort('provider')}
                  aria-label="Sort by provider"
                  aria-sort={sortField === 'provider' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort('provider');
                    }
                  }}
                >
                  Provider
                  {getSortIcon('provider')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center h-8 px-2 lg:px-3 hover:bg-surface-interactive rounded"
                  onClick={() => handleSort('payer')}
                  aria-label="Sort by payer"
                  aria-sort={sortField === 'payer' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort('payer');
                    }
                  }}
                >
                  Payer
                  {getSortIcon('payer')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center h-8 px-2 lg:px-3 hover:bg-surface-interactive rounded"
                  onClick={() => handleSort('amount')}
                  aria-label="Sort by amount"
                  aria-sort={sortField === 'amount' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort('amount');
                    }
                  }}
                >
                  Amount
                  {getSortIcon('amount')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center h-8 px-2 lg:px-3 hover:bg-surface-interactive rounded"
                  onClick={() => handleSort('status')}
                  aria-label="Sort by status"
                  aria-sort={sortField === 'status' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort('status');
                    }
                  }}
                >
                  Status
                  {getSortIcon('status')}
                </button>
              </TableHead>
              {(onRowClick || onDownload) && (
                <TableHead className="w-[100px]">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClaims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={(onRowClick || onDownload) ? 7 : 6} className="text-center py-8 text-text-secondary">
                  No claims found
                </TableCell>
              </TableRow>
            ) : (
              sortedClaims.map((claim, index) => (
                <TableRow
                  key={claim.claimId || claim.claimControlNumber || `claim-${index}`}
                  onClick={(e) => {
                    // Only trigger row click if clicking directly on the row, not on interactive elements
                    if ((e.target as HTMLElement).closest('button') === null) {
                      onRowClick?.(claim);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      // Only trigger if focus is on the row itself, not on a button
                      if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                        e.preventDefault();
                        onRowClick(claim);
                      }
                    }
                  }}
                  className={cn(
                    onRowClick && 'cursor-pointer hover:bg-surface-interactive focus:bg-surface-interactive focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2'
                  )}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={
                    onRowClick
                      ? `View claim details for ${patientNames[claim.patientId] || claim.patientId}, ${formatCurrency(claim.totalCharges)}, status ${getStatusLabel(claim.status)}`
                      : undefined
                  }
                >
                  <TableCell>{formatDate(claim.createdAt)}</TableCell>
                  <TableCell>
                    {patientNames[claim.patientId] || claim.patientId}
                  </TableCell>
                  <TableCell>
                    {providerNames[claim.providerId] || claim.providerId}
                  </TableCell>
                  <TableCell>
                    {payerNames[claim.payerId] || claim.payerId}
                  </TableCell>
                  <TableCell>{formatCurrency(claim.totalCharges)}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        (() => {
                          const variant = getStatusBadgeVariant(claim.status);
                          return variant === 'default' ? 'info' : variant;
                        })() as 'success' | 'warning' | 'error' | 'info' | 'critical'
                      }
                      aria-label={`Claim status: ${getStatusLabel(claim.status)}`}
                    >
                      {getStatusLabel(claim.status)}
                    </StatusBadge>
                  </TableCell>
                  {(onRowClick || onDownload) && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {onRowClick && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRowClick(claim);
                            }}
                            aria-label={`View details for claim ${claim.claimControlNumber || claim.claimId}`}
                            className="h-8 w-8 p-0"
                            type="button"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onDownload && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownload(claim);
                            }}
                            aria-label={`Download claim ${claim.claimControlNumber || claim.claimId}`}
                            className="h-8 w-8 p-0"
                            type="button"
                            title="Download claim"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


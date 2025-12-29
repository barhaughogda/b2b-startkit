'use client';

import React from 'react';
import { AlertCircle, RefreshCw, FileText, Receipt, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Empty State Component for Billing Views (Task 9.3)
 * Displays helpful message when no data is available
 */
export interface EmptyStateProps {
  /** Title of the empty state */
  title: string;
  /** Description message */
  description: string;
  /** Optional action button */
  actionLabel?: string;
  /** Optional action handler */
  onAction?: () => void;
  /** Icon to display (defaults to FileText) */
  icon?: React.ComponentType<{ className?: string }>;
  /** Additional CSS classes */
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = FileText,
  className,
}: EmptyStateProps) {
  return (
    <Card className={`bg-surface-elevated border-border-primary/20 ${className || ''}`}>
      <CardContent className="p-12 text-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-surface-interactive rounded-full flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-text-tertiary" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
          <p className="text-text-secondary max-w-md mb-6">{description}</p>
          {actionLabel && onAction && (
            <Button onClick={onAction} variant="outline" size="sm">
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Error State Component for Billing Views (Task 9.3)
 * Displays error message with retry button
 */
export interface ErrorStateProps {
  /** Error message to display */
  message?: string;
  /** Title of the error (defaults to "Failed to load billing data") */
  title?: string;
  /** Retry handler */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function ErrorState({
  message = 'Failed to load billing data. Please try again.',
  title = 'Failed to load billing data',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Card className={`bg-status-error/10 border-status-error/20 ${className || ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-status-error mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-status-error mb-1">{title}</h3>
            <p className="text-status-error text-sm mb-4">{message}</p>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="border-status-error text-status-error hover:bg-status-error/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty State for Claims Table (Task 9.3)
 * Specific empty state for when no claims are found
 */
export function ClaimsEmptyState({
  hasFilters = false,
  onClearFilters,
}: {
  hasFilters?: boolean;
  onClearFilters?: () => void;
}) {
  return (
    <EmptyState
      title={hasFilters ? 'No claims match your filters' : 'No claims yet'}
      description={
        hasFilters
          ? 'Try adjusting your filters to see more results, or clear all filters to view all claims.'
          : 'Claims will appear here once they are created from appointments. Start by creating a claim from a completed appointment.'
      }
      actionLabel={hasFilters ? 'Clear Filters' : undefined}
      onAction={hasFilters ? onClearFilters : undefined}
      icon={Inbox}
      className="rounded-xl"
    />
  );
}

/**
 * Empty State for Patient Invoices (Task 9.3)
 * Specific empty state for when no invoices are found
 */
export function InvoicesEmptyState() {
  return (
    <EmptyState
      title="No invoices found"
      description="Your billing history will appear here once invoices are generated. Invoices are typically created after appointments or when claims are processed."
      icon={Receipt}
      className="rounded-xl"
    />
  );
}


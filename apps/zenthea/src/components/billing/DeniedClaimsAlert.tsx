'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Props for DeniedClaimsAlert component
 */
export interface DeniedClaimsAlertProps {
  /** Number of denied claims requiring attention */
  deniedCount: number;
  /** Total amount of denied claims */
  totalAmount?: number;
  /** Callback when "Review" is clicked - should filter to denied claims */
  onReview: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * DeniedClaimsAlert Component
 * 
 * Compact alert banner showing the count of denied claims that need attention.
 * Provides a quick action to filter and review denied claims.
 * Can be dismissed for the current session.
 * 
 * Features:
 * - Subtle warning background
 * - Icon + count + message
 * - "Review" button that triggers filter
 * - Dismissable (session only)
 * - Mobile-responsive design
 */
export function DeniedClaimsAlert({
  deniedCount,
  totalAmount,
  onReview,
  className,
}: DeniedClaimsAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't render if no denied claims or dismissed
  if (deniedCount === 0 || isDismissed) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
  };

  const handleReview = () => {
    onReview();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleReview();
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'bg-status-error/5 border border-status-error/20 rounded-xl p-4 sm:p-5',
        className
      )}
    >
      <div className="flex items-start sm:items-center justify-between gap-3">
        {/* Left: Icon + Message */}
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-status-error/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-status-error" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary">
              {deniedCount} {deniedCount === 1 ? 'claim needs' : 'claims need'} attention
            </p>
            <p className="text-sm text-text-secondary mt-0.5">
              {totalAmount !== undefined && totalAmount > 0 ? (
                <>
                  {formatCurrency(totalAmount)} in denied claims requiring review or appeal
                </>
              ) : (
                <>
                  Review denied claims and take action to recover revenue
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReview}
            onKeyDown={handleKeyDown}
            className="h-9 px-3 text-sm border-status-error/30 text-status-error hover:bg-status-error/10 whitespace-nowrap"
            aria-label="Review denied claims"
          >
            Review
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-9 w-9 p-0 text-text-tertiary hover:text-text-primary hover:bg-surface-interactive"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}


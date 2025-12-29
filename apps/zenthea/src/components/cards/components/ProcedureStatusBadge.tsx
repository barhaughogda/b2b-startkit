import React from 'react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export type ProcedureStatus = 'completed' | 'scheduled' | 'in-progress' | 'cancelled';

interface ProcedureStatusBadgeProps {
  status: ProcedureStatus;
  className?: string;
  variant?: 'default' | 'outline' | 'solid';
  showLabel?: boolean;
}

/**
 * ProcedureStatusBadge - Reusable status badge component for procedures
 * 
 * Maps procedure statuses to semantic status colors:
 * - completed → success
 * - scheduled → info
 * - in-progress → warning
 * - cancelled → error
 * 
 * Uses the project's semantic color system for consistent styling.
 */
export function ProcedureStatusBadge({
  status,
  className,
  variant = 'default',
  showLabel = true,
}: ProcedureStatusBadgeProps) {
  // Map procedure status to StatusBadge status type
  const getStatusType = (): 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'scheduled':
        return 'info';
      case 'in-progress':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'info';
    }
  };

  // Format status label
  const getStatusLabel = (): string => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'scheduled':
        return 'Scheduled';
      case 'in-progress':
        return 'In Progress';
      case 'cancelled':
        return 'Cancelled';
    }
  };

  const statusType = getStatusType();
  const label = getStatusLabel();

  return (
    <StatusBadge
      status={statusType}
      variant={variant}
      className={cn(className)}
    >
      {showLabel ? label : status}
    </StatusBadge>
  );
}

/**
 * Legacy function for backward compatibility
 * Returns className string for status colors
 * 
 * @deprecated Use ProcedureStatusBadge component instead
 */
export function getProcedureStatusColor(status: ProcedureStatus): string {
  switch (status) {
    case 'completed':
      return 'text-status-success bg-status-success/10';
    case 'scheduled':
      return 'text-status-info bg-status-info/10';
    case 'in-progress':
      return 'text-status-warning bg-status-warning/10';
    case 'cancelled':
      return 'text-status-error bg-status-error/10';
    default:
      return 'text-text-tertiary bg-surface-secondary';
  }
}


/**
 * Shared Status Mapping Utility (Task 7.2)
 * 
 * Single source of truth for status labels, colors, and badge variants
 * used across Clinic, Provider, and Patient billing views.
 * 
 * This utility provides consistent status display across all three views,
 * ensuring that the same status value always displays the same way regardless
 * of which view is being used.
 */

import type { ClaimStatus, InvoiceStatus, StatusBadgeVariant } from '@/types/billing';

/**
 * Union type for all billing statuses
 */
export type BillingStatus = ClaimStatus | InvoiceStatus;

/**
 * Get human-readable label for a billing status
 * 
 * Maps internal status values to user-friendly display labels.
 * Provides consistent labeling across all billing views.
 * 
 * @param status - Claim or invoice status
 * @returns Human-readable status label
 */
export function getStatusLabel(status: BillingStatus): string {
  // Claim statuses
  if (status === 'draft') return 'Draft';
  if (status === 'submitted') return 'Submitted';
  if (status === 'accepted') return 'Accepted';
  if (status === 'denied') return 'Denied';
  if (status === 'paid') return 'Paid';
  
  // Invoice-specific statuses
  if (status === 'pending') return 'Pending';
  if (status === 'overdue') return 'Overdue';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'partially_paid') return 'Partially Paid';
  
  // Fallback for unknown statuses
  return status;
}

/**
 * Get CSS color class for a billing status
 * 
 * Returns Tailwind CSS classes for background and text colors
 * that match the status semantic meaning. Uses the healthcare
 * color system (status-success, status-warning, status-error, status-info).
 * 
 * Format: "bg-status-{color}/10 text-status-{color}"
 * 
 * Note: For shared statuses (draft, submitted, denied, paid), this function
 * uses invoice semantics since invoices are more commonly displayed to end users.
 * For claim-specific statuses (accepted), claim semantics are used.
 * 
 * @param status - Claim or invoice status
 * @returns CSS class string for styling
 */
export function getStatusColor(status: BillingStatus): string {
  // Success states (positive outcomes)
  if (status === 'paid') {
    return 'bg-status-success/10 text-status-success';
  }
  
  // Error states (negative outcomes)
  if (status === 'denied' || status === 'overdue') {
    return 'bg-status-error/10 text-status-error';
  }
  
  // Warning states (pending/attention needed)
  if (status === 'pending' || status === 'partially_paid' || status === 'submitted') {
    return 'bg-status-warning/10 text-status-warning';
  }
  
  // Info states (informational/neutral)
  // Draft: info for invoices (neutral state), warning for claims (needs attention)
  // Since we can't differentiate at runtime, we default to info (invoice semantics)
  // Accepted and cancelled are always info
  if (status === 'draft' || status === 'accepted' || status === 'cancelled') {
    return 'bg-status-info/10 text-status-info';
  }
  
  // Fallback for unknown statuses
  return 'bg-status-warning/10 text-status-warning';
}

/**
 * Get badge variant for a billing status
 * 
 * Returns the appropriate badge variant for use with StatusBadge component.
 * Maps status semantic meaning to badge variant types.
 * 
 * @param status - Claim or invoice status
 * @returns Badge variant type
 */
export function getStatusBadgeVariant(status: BillingStatus): StatusBadgeVariant {
  // Success badge (positive outcomes)
  if (status === 'paid') {
    return 'success';
  }
  
  // Error badge (negative outcomes)
  if (status === 'denied' || status === 'overdue') {
    return 'error';
  }
  
  // Warning badge (pending/attention needed)
  if (status === 'pending' || status === 'partially_paid') {
    return 'warning';
  }
  
  // Info badge (informational states)
  if (status === 'submitted' || status === 'accepted') {
    return 'info';
  }
  
  // Default badge (neutral states)
  if (status === 'draft' || status === 'cancelled') {
    return 'default';
  }
  
  // Fallback for unknown statuses
  return 'default';
}


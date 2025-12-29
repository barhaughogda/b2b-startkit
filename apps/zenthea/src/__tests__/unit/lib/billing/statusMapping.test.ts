/**
 * TDD Test Suite for Task 7.2: Implement Shared Status Mapping Utility
 * 
 * Requirements:
 * 1. Create `src/lib/billing/statusMapping.ts`
 * 2. Single source of truth for status labels and colors
 * 3. Export functions: `getStatusLabel()`, `getStatusColor()`, `getStatusBadgeVariant()`
 * 4. Use across all three views (Clinic, Provider, Patient)
 * 
 * RED Phase: Write failing tests first
 */

import { describe, it, expect } from 'vitest';
import type { ClaimStatus, InvoiceStatus } from '@/types/billing';
import {
  getStatusLabel,
  getStatusColor,
  getStatusBadgeVariant,
} from '@/lib/billing/statusMapping';

describe('Shared Status Mapping Utility (Task 7.2) - RED Phase', () => {
  describe('getStatusLabel()', () => {
    describe('Claim Status Labels', () => {
      it('should return "Draft" for draft claim status', () => {
        expect(getStatusLabel('draft' as ClaimStatus)).toBe('Draft');
      });

      it('should return "Submitted" for submitted claim status', () => {
        expect(getStatusLabel('submitted' as ClaimStatus)).toBe('Submitted');
      });

      it('should return "Accepted" for accepted claim status', () => {
        expect(getStatusLabel('accepted' as ClaimStatus)).toBe('Accepted');
      });

      it('should return "Denied" for denied claim status', () => {
        expect(getStatusLabel('denied' as ClaimStatus)).toBe('Denied');
      });

      it('should return "Paid" for paid claim status', () => {
        expect(getStatusLabel('paid' as ClaimStatus)).toBe('Paid');
      });
    });

    describe('Invoice Status Labels', () => {
      it('should return "Pending" for pending invoice status', () => {
        expect(getStatusLabel('pending' as InvoiceStatus)).toBe('Pending');
      });

      it('should return "Paid" for paid invoice status', () => {
        expect(getStatusLabel('paid' as InvoiceStatus)).toBe('Paid');
      });

      it('should return "Overdue" for overdue invoice status', () => {
        expect(getStatusLabel('overdue' as InvoiceStatus)).toBe('Overdue');
      });

      it('should return "Cancelled" for cancelled invoice status', () => {
        expect(getStatusLabel('cancelled' as InvoiceStatus)).toBe('Cancelled');
      });

      it('should return "Draft" for draft invoice status', () => {
        expect(getStatusLabel('draft' as InvoiceStatus)).toBe('Draft');
      });

      it('should return "Submitted" for submitted invoice status', () => {
        expect(getStatusLabel('submitted' as InvoiceStatus)).toBe('Submitted');
      });

      it('should return "Denied" for denied invoice status', () => {
        expect(getStatusLabel('denied' as InvoiceStatus)).toBe('Denied');
      });

      it('should return "Partially Paid" for partially_paid invoice status', () => {
        expect(getStatusLabel('partially_paid' as InvoiceStatus)).toBe('Partially Paid');
      });
    });
  });

  describe('getStatusColor()', () => {
    describe('Claim Status Colors', () => {
      it('should return info color for draft claim status (uses invoice semantics for shared statuses)', () => {
        const color = getStatusColor('draft' as ClaimStatus);
        expect(color).toContain('status-info');
      });

      it('should return warning color for submitted claim status (uses invoice semantics for shared statuses)', () => {
        const color = getStatusColor('submitted' as ClaimStatus);
        expect(color).toContain('status-warning');
      });

      it('should return info color for accepted claim status', () => {
        const color = getStatusColor('accepted' as ClaimStatus);
        expect(color).toContain('status-info');
      });

      it('should return error color for denied claim status', () => {
        const color = getStatusColor('denied' as ClaimStatus);
        expect(color).toContain('status-error');
      });

      it('should return success color for paid claim status', () => {
        const color = getStatusColor('paid' as ClaimStatus);
        expect(color).toContain('status-success');
      });
    });

    describe('Invoice Status Colors', () => {
      it('should return warning color for pending invoice status', () => {
        const color = getStatusColor('pending' as InvoiceStatus);
        expect(color).toContain('status-warning');
      });

      it('should return success color for paid invoice status', () => {
        const color = getStatusColor('paid' as InvoiceStatus);
        expect(color).toContain('status-success');
      });

      it('should return error color for overdue invoice status', () => {
        const color = getStatusColor('overdue' as InvoiceStatus);
        expect(color).toContain('status-error');
      });

      it('should return info color for cancelled invoice status', () => {
        const color = getStatusColor('cancelled' as InvoiceStatus);
        expect(color).toContain('status-info');
      });

      it('should return info color for draft invoice status', () => {
        const color = getStatusColor('draft' as InvoiceStatus);
        expect(color).toContain('status-info');
      });

      it('should return warning color for submitted invoice status', () => {
        const color = getStatusColor('submitted' as InvoiceStatus);
        expect(color).toContain('status-warning');
      });

      it('should return error color for denied invoice status', () => {
        const color = getStatusColor('denied' as InvoiceStatus);
        expect(color).toContain('status-error');
      });

      it('should return warning color for partially_paid invoice status', () => {
        const color = getStatusColor('partially_paid' as InvoiceStatus);
        expect(color).toContain('status-warning');
      });
    });

    describe('Color Format', () => {
      it('should return CSS class string with bg- and text- prefixes', () => {
        const color = getStatusColor('paid' as ClaimStatus);
        expect(color).toMatch(/^bg-status-\w+\/10 text-status-\w+$/);
      });

      it('should return consistent format for all statuses', () => {
        const statuses: Array<ClaimStatus | InvoiceStatus> = [
          'draft',
          'submitted',
          'accepted',
          'denied',
          'paid',
          'pending',
          'overdue',
          'cancelled',
          'partially_paid',
        ];
        
        statuses.forEach((status) => {
          const color = getStatusColor(status);
          expect(color).toMatch(/^bg-status-\w+\/10 text-status-\w+$/);
        });
      });
    });
  });

  describe('getStatusBadgeVariant()', () => {
    describe('Claim Status Badge Variants', () => {
      it('should return "default" for draft claim status', () => {
        expect(getStatusBadgeVariant('draft' as ClaimStatus)).toBe('default');
      });

      it('should return "info" for submitted claim status', () => {
        expect(getStatusBadgeVariant('submitted' as ClaimStatus)).toBe('info');
      });

      it('should return "info" for accepted claim status', () => {
        expect(getStatusBadgeVariant('accepted' as ClaimStatus)).toBe('info');
      });

      it('should return "error" for denied claim status', () => {
        expect(getStatusBadgeVariant('denied' as ClaimStatus)).toBe('error');
      });

      it('should return "success" for paid claim status', () => {
        expect(getStatusBadgeVariant('paid' as ClaimStatus)).toBe('success');
      });
    });

    describe('Invoice Status Badge Variants', () => {
      it('should return "warning" for pending invoice status', () => {
        expect(getStatusBadgeVariant('pending' as InvoiceStatus)).toBe('warning');
      });

      it('should return "success" for paid invoice status', () => {
        expect(getStatusBadgeVariant('paid' as InvoiceStatus)).toBe('success');
      });

      it('should return "error" for overdue invoice status', () => {
        expect(getStatusBadgeVariant('overdue' as InvoiceStatus)).toBe('error');
      });

      it('should return "default" for cancelled invoice status', () => {
        expect(getStatusBadgeVariant('cancelled' as InvoiceStatus)).toBe('default');
      });

      it('should return "default" for draft invoice status', () => {
        expect(getStatusBadgeVariant('draft' as InvoiceStatus)).toBe('default');
      });

      it('should return "info" for submitted invoice status', () => {
        expect(getStatusBadgeVariant('submitted' as InvoiceStatus)).toBe('info');
      });

      it('should return "error" for denied invoice status', () => {
        expect(getStatusBadgeVariant('denied' as InvoiceStatus)).toBe('error');
      });

      it('should return "warning" for partially_paid invoice status', () => {
        expect(getStatusBadgeVariant('partially_paid' as InvoiceStatus)).toBe('warning');
      });
    });
  });

  describe('Consistency Checks', () => {
    it('should return same label for shared status values (draft, submitted, denied, paid)', () => {
      // Draft
      expect(getStatusLabel('draft' as ClaimStatus)).toBe(getStatusLabel('draft' as InvoiceStatus));
      
      // Submitted
      expect(getStatusLabel('submitted' as ClaimStatus)).toBe(getStatusLabel('submitted' as InvoiceStatus));
      
      // Denied
      expect(getStatusLabel('denied' as ClaimStatus)).toBe(getStatusLabel('denied' as InvoiceStatus));
      
      // Paid
      expect(getStatusLabel('paid' as ClaimStatus)).toBe(getStatusLabel('paid' as InvoiceStatus));
    });

    it('should return consistent badge variants for shared status values', () => {
      // Draft - both should be default
      expect(getStatusBadgeVariant('draft' as ClaimStatus)).toBe('default');
      expect(getStatusBadgeVariant('draft' as InvoiceStatus)).toBe('default');
      
      // Submitted - claim is info, invoice is info
      expect(getStatusBadgeVariant('submitted' as ClaimStatus)).toBe('info');
      expect(getStatusBadgeVariant('submitted' as InvoiceStatus)).toBe('info');
      
      // Denied - both should be error
      expect(getStatusBadgeVariant('denied' as ClaimStatus)).toBe('error');
      expect(getStatusBadgeVariant('denied' as InvoiceStatus)).toBe('error');
      
      // Paid - both should be success
      expect(getStatusBadgeVariant('paid' as ClaimStatus)).toBe('success');
      expect(getStatusBadgeVariant('paid' as InvoiceStatus)).toBe('success');
    });
  });
});


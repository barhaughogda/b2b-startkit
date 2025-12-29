import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getStatusBadgeVariant } from '@/lib/billing/statusMapping';
import type { ClaimStatus, InvoiceStatus } from '@/types/billing';

/**
 * StatusBadge Component Tests (Task 10.2)
 * 
 * Tests that status badge colors match status values and ensure
 * consistency with the statusMapping utility.
 */
describe('StatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with children text', () => {
      render(<StatusBadge status="success">Paid</StatusBadge>);
      expect(screen.getByText('Paid')).toBeInTheDocument();
    });

    it('should render with React node children', () => {
      render(
        <StatusBadge status="success">
          <span>Custom Content</span>
        </StatusBadge>
      );
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });

    it('should apply base classes', () => {
      const { container } = render(<StatusBadge status="success">Test</StatusBadge>);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('px-2.5');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-medium');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <StatusBadge status="success" className="custom-class">
          Test
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('Status Colors - Success', () => {
    it('should apply success colors for success status', () => {
      const { container } = render(
        <StatusBadge status="success" variant="default">
          Paid
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-success');
      expect(badge).toHaveClass('bg-status-success-bg');
      expect(badge).toHaveClass('border-status-success');
    });

    it('should apply success outline colors', () => {
      const { container } = render(
        <StatusBadge status="success" variant="outline">
          Paid
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-success');
      expect(badge).toHaveClass('border-status-success');
      expect(badge).toHaveClass('bg-transparent');
    });

    it('should apply success solid colors', () => {
      const { container } = render(
        <StatusBadge status="success" variant="solid">
          Paid
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-white');
      expect(badge).toHaveClass('bg-status-success');
    });
  });

  describe('Status Colors - Warning', () => {
    it('should apply warning colors for warning status', () => {
      const { container } = render(
        <StatusBadge status="warning" variant="default">
          Pending
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-warning');
      expect(badge).toHaveClass('bg-status-warning-bg');
      expect(badge).toHaveClass('border-status-warning');
    });

    it('should apply warning outline colors', () => {
      const { container } = render(
        <StatusBadge status="warning" variant="outline">
          Pending
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-warning');
      expect(badge).toHaveClass('border-status-warning');
      expect(badge).toHaveClass('bg-transparent');
    });

    it('should apply warning solid colors', () => {
      const { container } = render(
        <StatusBadge status="warning" variant="solid">
          Pending
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-white');
      expect(badge).toHaveClass('bg-status-warning');
    });
  });

  describe('Status Colors - Error', () => {
    it('should apply error colors for error status', () => {
      const { container } = render(
        <StatusBadge status="error" variant="default">
          Denied
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-error');
      expect(badge).toHaveClass('bg-status-error-bg');
      expect(badge).toHaveClass('border-status-error');
    });

    it('should apply error outline colors', () => {
      const { container } = render(
        <StatusBadge status="error" variant="outline">
          Denied
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-error');
      expect(badge).toHaveClass('border-status-error');
      expect(badge).toHaveClass('bg-transparent');
    });

    it('should apply error solid colors', () => {
      const { container } = render(
        <StatusBadge status="error" variant="solid">
          Denied
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-white');
      expect(badge).toHaveClass('bg-status-error');
    });
  });

  describe('Status Colors - Info', () => {
    it('should apply info colors for info status', () => {
      const { container } = render(
        <StatusBadge status="info" variant="default">
          Submitted
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-info');
      expect(badge).toHaveClass('bg-status-info-bg');
      expect(badge).toHaveClass('border-status-info');
    });

    it('should apply info outline colors', () => {
      const { container } = render(
        <StatusBadge status="info" variant="outline">
          Submitted
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-info');
      expect(badge).toHaveClass('border-status-info');
      expect(badge).toHaveClass('bg-transparent');
    });

    it('should apply info solid colors', () => {
      const { container } = render(
        <StatusBadge status="info" variant="solid">
          Submitted
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-white');
      expect(badge).toHaveClass('bg-status-info');
    });
  });

  describe('Status Colors - Critical', () => {
    it('should apply critical colors for critical status', () => {
      const { container } = render(
        <StatusBadge status="critical" variant="default">
          Critical
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-critical');
      expect(badge).toHaveClass('bg-status-critical-bg');
      expect(badge).toHaveClass('border-status-critical');
    });

    it('should apply critical outline colors', () => {
      const { container } = render(
        <StatusBadge status="critical" variant="outline">
          Critical
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-critical');
      expect(badge).toHaveClass('border-status-critical');
      expect(badge).toHaveClass('bg-transparent');
    });

    it('should apply critical solid colors', () => {
      const { container } = render(
        <StatusBadge status="critical" variant="solid">
          Critical
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-white');
      expect(badge).toHaveClass('bg-status-critical');
    });
  });

  describe('Status Mapping Consistency', () => {
    it('should use success variant for paid status', () => {
      const variant = getStatusBadgeVariant('paid' as ClaimStatus);
      expect(variant).toBe('success');

      const { container } = render(
        <StatusBadge status={variant === 'success' ? 'success' : 'info'}>
          Paid
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-success');
    });

    it('should use error variant for denied status', () => {
      const variant = getStatusBadgeVariant('denied' as ClaimStatus);
      expect(variant).toBe('error');

      const { container } = render(
        <StatusBadge status={variant === 'error' ? 'error' : 'info'}>
          Denied
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-error');
    });

    it('should use error variant for overdue status', () => {
      const variant = getStatusBadgeVariant('overdue' as InvoiceStatus);
      expect(variant).toBe('error');

      const { container } = render(
        <StatusBadge status={variant === 'error' ? 'error' : 'info'}>
          Overdue
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-error');
    });

    it('should use warning variant for pending status', () => {
      const variant = getStatusBadgeVariant('pending' as InvoiceStatus);
      expect(variant).toBe('warning');

      const { container } = render(
        <StatusBadge status={variant === 'warning' ? 'warning' : 'info'}>
          Pending
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-warning');
    });

    it('should use warning variant for partially_paid status', () => {
      const variant = getStatusBadgeVariant('partially_paid' as InvoiceStatus);
      expect(variant).toBe('warning');

      const { container } = render(
        <StatusBadge status={variant === 'warning' ? 'warning' : 'info'}>
          Partially Paid
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-warning');
    });

    it('should use info variant for submitted status', () => {
      const variant = getStatusBadgeVariant('submitted' as ClaimStatus);
      expect(variant).toBe('info');

      const { container } = render(
        <StatusBadge status={variant === 'info' ? 'info' : 'success'}>
          Submitted
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-info');
    });

    it('should use info variant for accepted status', () => {
      const variant = getStatusBadgeVariant('accepted' as ClaimStatus);
      expect(variant).toBe('info');

      const { container } = render(
        <StatusBadge status={variant === 'info' ? 'info' : 'success'}>
          Accepted
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-info');
    });

    it('should use default variant for draft status', () => {
      const variant = getStatusBadgeVariant('draft' as ClaimStatus);
      expect(variant).toBe('default');

      // Default variant maps to 'info' in StatusBadge component
      const { container } = render(
        <StatusBadge status="info">
          Draft
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-info');
    });

    it('should use default variant for cancelled status', () => {
      const variant = getStatusBadgeVariant('cancelled' as InvoiceStatus);
      expect(variant).toBe('default');

      // Default variant maps to 'info' in StatusBadge component
      const { container } = render(
        <StatusBadge status="info">
          Cancelled
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-status-info');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status" attribute', () => {
      render(<StatusBadge status="success">Paid</StatusBadge>);
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
    });

    it('should have aria-label when provided', () => {
      render(
        <StatusBadge status="success" aria-label="Payment status: Paid">
          Paid
        </StatusBadge>
      );
      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Payment status: Paid');
    });

    it('should generate aria-label from children text when not provided', () => {
      render(<StatusBadge status="success">Paid</StatusBadge>);
      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Status: Paid');
    });

    it('should not have aria-label when children is not a string', () => {
      render(
        <StatusBadge status="success">
          <span>Custom</span>
        </StatusBadge>
      );
      const badge = screen.getByRole('status');
      expect(badge).not.toHaveAttribute('aria-label');
    });
  });

  describe('Variant Defaults', () => {
    it('should use default variant when not specified', () => {
      const { container } = render(<StatusBadge status="success">Test</StatusBadge>);
      const badge = container.querySelector('span');
      // Default variant should have background and border
      expect(badge).toHaveClass('bg-status-success-bg');
      expect(badge).toHaveClass('border-status-success');
    });

    it('should apply outline variant correctly', () => {
      const { container } = render(
        <StatusBadge status="success" variant="outline">
          Test
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-transparent');
      expect(badge).toHaveClass('border-status-success');
    });

    it('should apply solid variant correctly', () => {
      const { container } = render(
        <StatusBadge status="success" variant="solid">
          Test
        </StatusBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-status-success');
      expect(badge).toHaveClass('text-white');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string children', () => {
      render(<StatusBadge status="success">{''}</StatusBadge>);
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
    });

    it('should handle numeric children', () => {
      render(<StatusBadge status="success">{123}</StatusBadge>);
      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('should handle multiple children', () => {
      render(
        <StatusBadge status="success">
          <span>Status:</span> Paid
        </StatusBadge>
      );
      expect(screen.getByText('Status:')).toBeInTheDocument();
      expect(screen.getByText('Paid')).toBeInTheDocument();
    });
  });
});























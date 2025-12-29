import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillingKPICards } from '@/components/billing/BillingKPICards';
import type { RCMMetrics } from '@/types/billing';
import { DollarSign, AlertCircle } from 'lucide-react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowUp: vi.fn((props) => <svg data-testid="arrow-up-icon" {...props} />),
  ArrowDown: vi.fn((props) => <svg data-testid="arrow-down-icon" {...props} />),
  TrendingUp: vi.fn((props) => <svg data-testid="trending-up-icon" {...props} />),
  DollarSign: vi.fn((props) => <svg data-testid="dollar-sign-icon" {...props} />),
  Calendar: vi.fn((props) => <svg data-testid="calendar-icon" {...props} />),
  AlertCircle: vi.fn((props) => <svg data-testid="alert-circle-icon" {...props} />),
  CheckCircle: vi.fn((props) => <svg data-testid="check-circle-icon" {...props} />),
}));

describe('BillingKPICards', () => {
  const mockRCMMetrics: RCMMetrics = {
    totalAR: 125000, // $1,250.00 in cents
    daysInAR: 35.5,
    cleanClaimRate: 95.5,
    denialRate: 4.5,
    netCollectionRate: 88.2,
    totalBilled: 500000, // $5,000.00 in cents
    totalCollected: 441000, // $4,410.00 in cents
    periodStart: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    periodEnd: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all KPI cards with default configuration', () => {
      render(<BillingKPICards metrics={mockRCMMetrics} />);

      // Check that all 5 main KPIs are rendered
      expect(screen.getByText('Total AR')).toBeInTheDocument();
      expect(screen.getByText('Days in AR')).toBeInTheDocument();
      expect(screen.getByText('Clean Claim Rate')).toBeInTheDocument();
      expect(screen.getByText('Denial Rate')).toBeInTheDocument();
      expect(screen.getByText('Net Collection Rate')).toBeInTheDocument();
    });

    it('should format currency values correctly', () => {
      render(<BillingKPICards metrics={mockRCMMetrics} />);

      // Total AR should be formatted as currency
      expect(screen.getByText('$1,250.00')).toBeInTheDocument();
    });

    it('should format percentage values correctly', () => {
      render(<BillingKPICards metrics={mockRCMMetrics} />);

      // Percentages should be formatted with 1 decimal place
      expect(screen.getByText('95.5%')).toBeInTheDocument();
      expect(screen.getByText('4.5%')).toBeInTheDocument();
      expect(screen.getByText('88.2%')).toBeInTheDocument();
    });

    it('should format days in AR as whole number', () => {
      render(<BillingKPICards metrics={mockRCMMetrics} />);

      // Days in AR should be rounded to whole number
      expect(screen.getByText('36')).toBeInTheDocument();
    });

    it('should render custom KPI cards when provided', () => {
      const customKPIs = [
        {
          label: 'Custom Metric',
          value: 12345,
          format: 'currency' as const,
          icon: DollarSign,
          color: 'text-zenthea-teal' as const,
        },
      ];

      render(<BillingKPICards metrics={mockRCMMetrics} customKPIs={customKPIs} />);

      expect(screen.getByText('Custom Metric')).toBeInTheDocument();
      expect(screen.getByText('$123.45')).toBeInTheDocument();
    });
  });

  describe('Trend Indicators', () => {
    it('should display upward trend indicator when trend is positive', () => {
      const metricsWithTrend = {
        ...mockRCMMetrics,
        trend: {
          totalAR: 5.2, // 5.2% increase
        },
      };

      render(<BillingKPICards metrics={metricsWithTrend} />);

      // Should show upward arrow
      expect(screen.getByTestId('arrow-up-icon')).toBeInTheDocument();
      expect(screen.getByText('+5.2%')).toBeInTheDocument();
    });

    it('should display downward trend indicator when trend is negative', () => {
      const metricsWithTrend = {
        ...mockRCMMetrics,
        trend: {
          totalAR: -3.1, // 3.1% decrease
        },
      };

      render(<BillingKPICards metrics={metricsWithTrend} />);

      // Should show downward arrow
      expect(screen.getByTestId('arrow-down-icon')).toBeInTheDocument();
      expect(screen.getByText('-3.1%')).toBeInTheDocument();
    });

    it('should display no trend indicator when trend is zero', () => {
      const metricsWithTrend = {
        ...mockRCMMetrics,
        trend: {
          totalAR: 0,
        },
      };

      render(<BillingKPICards metrics={metricsWithTrend} />);

      // Should not show trend indicators
      expect(screen.queryByTestId('arrow-up-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('arrow-down-icon')).not.toBeInTheDocument();
    });

    it('should apply correct color classes for positive trends', () => {
      const metricsWithTrend = {
        ...mockRCMMetrics,
        trend: {
          cleanClaimRate: 2.5,
        },
      };

      render(<BillingKPICards metrics={metricsWithTrend} />);

      // Positive trends should use success color
      const trendElement = screen.getByText('+2.5%');
      expect(trendElement).toHaveClass('text-status-success');
    });

    it('should apply correct color classes for negative trends', () => {
      const metricsWithTrend = {
        ...mockRCMMetrics,
        trend: {
          denialRate: -1.2,
        },
      };

      render(<BillingKPICards metrics={metricsWithTrend} />);

      // Negative trends should use error color
      const trendElement = screen.getByText('-1.2%');
      expect(trendElement).toHaveClass('text-status-error');
    });
  });

  describe('Icons', () => {
    it('should render default icons for each KPI', () => {
      render(<BillingKPICards metrics={mockRCMMetrics} />);

      // Check that icons are rendered (using test IDs from mock)
      expect(screen.getAllByTestId('dollar-sign-icon').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('calendar-icon').length).toBeGreaterThan(0);
    });

    it('should render custom icons when provided', () => {
      const customKPIs = [
        {
          label: 'Custom KPI',
          value: 100,
          format: 'number' as const,
          icon: AlertCircle,
          color: 'text-status-warning' as const,
        },
      ];

      render(<BillingKPICards metrics={mockRCMMetrics} customKPIs={customKPIs} />);

      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });

    it('should handle KPI without icon gracefully', () => {
      const customKPIs = [
        {
          label: 'No Icon KPI',
          value: 100,
          format: 'number' as const,
          color: 'text-text-primary' as const,
        },
      ];

      render(<BillingKPICards metrics={mockRCMMetrics} customKPIs={customKPIs} />);

      expect(screen.getByText('No Icon KPI')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Colors', () => {
    it('should apply custom color classes to KPI cards', () => {
      const customKPIs = [
        {
          label: 'Teal KPI',
          value: 100,
          format: 'number' as const,
          color: 'text-zenthea-teal' as const,
        },
        {
          label: 'Purple KPI',
          value: 200,
          format: 'number' as const,
          color: 'text-zenthea-purple' as const,
        },
      ];

      render(<BillingKPICards metrics={mockRCMMetrics} customKPIs={customKPIs} />);

      const tealCard = screen.getByText('Teal KPI').closest('[class*="text-zenthea-teal"]');
      const purpleCard = screen.getByText('Purple KPI').closest('[class*="text-zenthea-purple"]');

      expect(tealCard).toBeInTheDocument();
      expect(purpleCard).toBeInTheDocument();
    });

    it('should use default colors when not specified', () => {
      render(<BillingKPICards metrics={mockRCMMetrics} />);

      // Default cards should still render with appropriate styling
      expect(screen.getByText('Total AR')).toBeInTheDocument();
    });
  });

  describe('Tooltips', () => {
    it('should display tooltip on hover when tooltip text is provided', async () => {
      const user = userEvent.setup();
      const customKPIs = [
        {
          label: 'Tooltip KPI',
          value: 100,
          format: 'number' as const,
          tooltip: 'This is a helpful tooltip explaining the metric',
          color: 'text-text-primary' as const,
        },
      ];

      render(<BillingKPICards metrics={mockRCMMetrics} customKPIs={customKPIs} showDefaultKPIs={false} />);

      const kpiCard = screen.getByText('Tooltip KPI');
      await user.hover(kpiCard);

      // Tooltip should appear (may appear multiple times due to Radix UI rendering)
      const tooltips = await screen.findAllByText('This is a helpful tooltip explaining the metric');
      expect(tooltips.length).toBeGreaterThan(0);
    });

    it('should not show tooltip when tooltip text is not provided', async () => {
      const user = userEvent.setup();
      const customKPIs = [
        {
          label: 'No Tooltip KPI',
          value: 100,
          format: 'number' as const,
          color: 'text-text-primary' as const,
        },
      ];

      render(<BillingKPICards metrics={mockRCMMetrics} customKPIs={customKPIs} />);

      const kpiCard = screen.getByText('No Tooltip KPI');
      await user.hover(kpiCard);

      // No tooltip should appear
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should display default tooltips for standard RCM metrics', async () => {
      const user = userEvent.setup();

      render(<BillingKPICards metrics={mockRCMMetrics} showDefaultTooltips={true} />);

      const totalARCard = screen.getByText('Total AR');
      await user.hover(totalARCard);

      // Should show default tooltip for Total AR (tooltip contains the full description)
      // May appear multiple times due to Radix UI rendering
      const tooltips = await screen.findAllByText(/Total Accounts Receivable: The total amount of money owed to your clinic/i);
      expect(tooltips.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive grid classes for mobile', () => {
      const { container } = render(<BillingKPICards metrics={mockRCMMetrics} />);

      // Should use responsive grid: 1 column on mobile, 3 on md, 5 on lg
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
      expect(gridContainer).toHaveClass('md:grid-cols-3');
      expect(gridContainer).toHaveClass('lg:grid-cols-5');
    });

    it('should stack cards vertically on mobile viewport', () => {
      const { container } = render(<BillingKPICards metrics={mockRCMMetrics} />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
    });

    it('should display 3 columns on medium viewport', () => {
      const { container } = render(<BillingKPICards metrics={mockRCMMetrics} />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('md:grid-cols-3');
    });

    it('should display 5 columns on large viewport', () => {
      const { container } = render(<BillingKPICards metrics={mockRCMMetrics} />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-5');
    });

    it('should maintain card spacing on all viewport sizes', () => {
      const { container } = render(<BillingKPICards metrics={mockRCMMetrics} />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('gap-4');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values correctly', () => {
      const zeroMetrics: RCMMetrics = {
        ...mockRCMMetrics,
        totalAR: 0,
        daysInAR: 0,
        cleanClaimRate: 0,
        denialRate: 0,
        netCollectionRate: 0,
      };

      render(<BillingKPICards metrics={zeroMetrics} />);

      expect(screen.getByText('$0.00')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getAllByText('0.0%').length).toBeGreaterThan(0);
    });

    it('should handle very large values correctly', () => {
      const largeMetrics: RCMMetrics = {
        ...mockRCMMetrics,
        totalAR: 999999999, // $9,999,999.99
      };

      render(<BillingKPICards metrics={largeMetrics} />);

      // Should format with commas
      expect(screen.getByText('$9,999,999.99')).toBeInTheDocument();
    });

    it('should handle negative values correctly', () => {
      const negativeMetrics: RCMMetrics = {
        ...mockRCMMetrics,
        daysInAR: -5,
      };

      render(<BillingKPICards metrics={negativeMetrics} />);

      expect(screen.getByText('-5')).toBeInTheDocument();
    });

    it('should handle missing metrics gracefully', () => {
      const partialMetrics = {
        totalAR: mockRCMMetrics.totalAR,
        daysInAR: mockRCMMetrics.daysInAR,
        // Missing other fields
      } as Partial<RCMMetrics>;

      // Should not crash, but may show limited KPIs
      expect(() => {
        render(<BillingKPICards metrics={partialMetrics as RCMMetrics} />);
      }).not.toThrow();
    });

    it('should handle empty customKPIs array', () => {
      render(<BillingKPICards metrics={mockRCMMetrics} customKPIs={[]} />);

      // Should still render default KPIs
      expect(screen.getByText('Total AR')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for KPI cards', () => {
      render(<BillingKPICards metrics={mockRCMMetrics} />);

      const cards = screen.getAllByRole('article');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should be keyboard navigable', () => {
      render(<BillingKPICards metrics={mockRCMMetrics} />);

      const cards = screen.getAllByRole('article');
      cards.forEach((card) => {
        expect(card).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should have descriptive text for screen readers', () => {
      render(<BillingKPICards metrics={mockRCMMetrics} showDefaultTooltips={true} />);

      // Should have accessible labels with tooltip text
      expect(screen.getByLabelText(/Total Accounts Receivable/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with many custom KPIs', () => {
      const manyKPIs = Array.from({ length: 20 }, (_, i) => ({
        label: `KPI ${i + 1}`,
        value: i * 100,
        format: 'number' as const,
        color: 'text-text-primary' as const,
      }));

      const startTime = performance.now();
      render(<BillingKPICards metrics={mockRCMMetrics} customKPIs={manyKPIs} />);
      const endTime = performance.now();

      // Should render in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});


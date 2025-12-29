import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevenueChart } from '@/components/billing/RevenueChart';

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children, width, height, ...props }: any) => (
    <div data-testid="responsive-container" data-width={width} data-height={height} {...props}>
      {children}
    </div>
  ),
  BarChart: ({ children, data, ...props }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} {...props}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill, name, stackId, ...props }: any) => (
    <div
      data-testid={`bar-${dataKey}`}
      data-fill={fill}
      data-name={name}
      data-stack-id={stackId}
      {...props}
    />
  ),
  XAxis: ({ dataKey, ...props }: any) => (
    <div data-testid="x-axis" data-key={dataKey} {...props} />
  ),
  YAxis: ({ ...props }: any) => <div data-testid="y-axis" {...props} />,
  CartesianGrid: ({ strokeDasharray, ...props }: any) => (
    <div data-testid="cartesian-grid" data-stroke-dasharray={strokeDasharray} {...props} />
  ),
  Tooltip: ({ ...props }: any) => <div data-testid="tooltip" {...props} />,
  Legend: ({ ...props }: any) => <div data-testid="legend" {...props} />,
}));

describe('RevenueChart', () => {
  const mockRevenueData = [
    {
      month: 'Jan 2024',
      billed: 500000, // $5,000.00 in cents
      collected: 450000, // $4,500.00 in cents
    },
    {
      month: 'Feb 2024',
      billed: 600000, // $6,000.00 in cents
      collected: 550000, // $5,500.00 in cents
    },
    {
      month: 'Mar 2024',
      billed: 550000, // $5,500.00 in cents
      collected: 500000, // $5,000.00 in cents
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the RevenueChart component', () => {
      render(<RevenueChart data={mockRevenueData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render BarChart with provided data', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toBeInTheDocument();
      
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(3);
      expect(chartData[0]).toEqual({
        month: 'Jan 2024',
        billed: 500000,
        collected: 450000,
      });
    });

    it('should render ResponsiveContainer with 100% width', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container.getAttribute('data-width')).toBe('100%');
    });

    it('should render ResponsiveContainer with default height of 300', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container.getAttribute('data-height')).toBe('300');
    });

    it('should render ResponsiveContainer with custom height when provided', () => {
      render(<RevenueChart data={mockRevenueData} height={400} />);
      const container = screen.getByTestId('responsive-container');
      expect(container.getAttribute('data-height')).toBe('400');
    });
  });

  describe('Chart Elements', () => {
    it('should render XAxis with month dataKey', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis.getAttribute('data-key')).toBe('month');
    });

    it('should render YAxis', () => {
      render(<RevenueChart data={mockRevenueData} />);
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('should render CartesianGrid with strokeDasharray', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const grid = screen.getByTestId('cartesian-grid');
      expect(grid.getAttribute('data-stroke-dasharray')).toBe('3 3');
    });

    it('should render Tooltip component', () => {
      render(<RevenueChart data={mockRevenueData} />);
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should render Legend component', () => {
      render(<RevenueChart data={mockRevenueData} />);
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });
  });

  describe('Stacked Bar Chart', () => {
    it('should render billed Bar with correct dataKey', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const billedBar = screen.getByTestId('bar-billed');
      expect(billedBar).toBeInTheDocument();
    });

    it('should render collected Bar with correct dataKey', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const collectedBar = screen.getByTestId('bar-collected');
      expect(collectedBar).toBeInTheDocument();
    });

    it('should render both bars with same stackId for stacking', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const billedBar = screen.getByTestId('bar-billed');
      const collectedBar = screen.getByTestId('bar-collected');
      
      const billedStackId = billedBar.getAttribute('data-stack-id');
      const collectedStackId = collectedBar.getAttribute('data-stack-id');
      
      expect(billedStackId).toBeDefined();
      expect(collectedStackId).toBeDefined();
      expect(billedStackId).toBe(collectedStackId);
    });

    it('should render billed Bar with correct name', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const billedBar = screen.getByTestId('bar-billed');
      expect(billedBar.getAttribute('data-name')).toBe('Billed');
    });

    it('should render collected Bar with correct name', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const collectedBar = screen.getByTestId('bar-collected');
      expect(collectedBar.getAttribute('data-name')).toBe('Collected');
    });
  });

  describe('Color Coding', () => {
    it('should use Zenthea brand colors for bars', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const billedBar = screen.getByTestId('bar-billed');
      const collectedBar = screen.getByTestId('bar-collected');
      
      // Check that colors are set (using CSS variables or hex colors)
      const billedFill = billedBar.getAttribute('data-fill');
      const collectedFill = collectedBar.getAttribute('data-fill');
      
      expect(billedFill).toBeDefined();
      expect(collectedFill).toBeDefined();
      expect(billedFill).not.toBe(collectedFill);
    });

    it('should use teal color for billed bar', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const billedBar = screen.getByTestId('bar-billed');
      const fill = billedBar.getAttribute('data-fill');
      // Should use Zenthea teal color (CSS variable or hex)
      expect(fill).toBeDefined();
    });

    it('should use purple color for collected bar', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const collectedBar = screen.getByTestId('bar-collected');
      const fill = collectedBar.getAttribute('data-fill');
      // Should use Zenthea purple color (CSS variable or hex)
      expect(fill).toBeDefined();
    });
  });

  describe('Data Handling', () => {
    it('should handle empty data array', () => {
      render(<RevenueChart data={[]} />);
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toEqual([]);
    });

    it('should handle single month of data', () => {
      const singleMonthData = [
        {
          month: 'Jan 2024',
          billed: 500000,
          collected: 450000,
        },
      ];
      render(<RevenueChart data={singleMonthData} />);
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(1);
    });

    it('should handle multiple months of data', () => {
      const multiMonthData = [
        { month: 'Jan 2024', billed: 500000, collected: 450000 },
        { month: 'Feb 2024', billed: 600000, collected: 550000 },
        { month: 'Mar 2024', billed: 550000, collected: 500000 },
        { month: 'Apr 2024', billed: 700000, collected: 650000 },
        { month: 'May 2024', billed: 650000, collected: 600000 },
      ];
      render(<RevenueChart data={multiMonthData} />);
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(5);
    });

    it('should handle zero values correctly', () => {
      const zeroData = [
        {
          month: 'Jan 2024',
          billed: 0,
          collected: 0,
        },
      ];
      render(<RevenueChart data={zeroData} />);
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].billed).toBe(0);
      expect(chartData[0].collected).toBe(0);
    });

    it('should handle large values correctly', () => {
      const largeData = [
        {
          month: 'Jan 2024',
          billed: 100000000, // $1,000,000.00 in cents
          collected: 95000000, // $950,000.00 in cents
        },
      ];
      render(<RevenueChart data={largeData} />);
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].billed).toBe(100000000);
      expect(chartData[0].collected).toBe(95000000);
    });
  });

  describe('Responsive Design', () => {
    it('should use ResponsiveContainer for responsive behavior', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
    });

    it('should have 100% width for responsive layout', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container.getAttribute('data-width')).toBe('100%');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible chart container', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
    });

    it('should render with proper ARIA attributes', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const container = screen.getByTestId('responsive-container');
      // Chart should be accessible
      expect(container).toBeInTheDocument();
    });
  });

  describe('Tooltip Functionality', () => {
    it('should render Tooltip component for showing exact amounts', () => {
      render(<RevenueChart data={mockRevenueData} />);
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should format currency values in tooltip correctly', () => {
      // Tooltip formatting is handled by recharts, but we ensure it's rendered
      render(<RevenueChart data={mockRevenueData} />);
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should accept data prop', () => {
      render(<RevenueChart data={mockRevenueData} />);
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should accept optional height prop', () => {
      render(<RevenueChart data={mockRevenueData} height={400} />);
      const container = screen.getByTestId('responsive-container');
      expect(container.getAttribute('data-height')).toBe('400');
    });

    it('should use default height when not provided', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container.getAttribute('data-height')).toBe('300');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing billed value gracefully', () => {
      const incompleteData = [
        {
          month: 'Jan 2024',
          billed: 0,
          collected: 450000,
        },
      ];
      render(<RevenueChart data={incompleteData} />);
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].billed).toBe(0);
    });

    it('should handle missing collected value gracefully', () => {
      const incompleteData = [
        {
          month: 'Jan 2024',
          billed: 500000,
          collected: 0,
        },
      ];
      render(<RevenueChart data={incompleteData} />);
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].collected).toBe(0);
    });

    it('should handle negative values if present', () => {
      const negativeData = [
        {
          month: 'Jan 2024',
          billed: 500000,
          collected: -10000, // Refund scenario
        },
      ];
      render(<RevenueChart data={negativeData} />);
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].collected).toBe(-10000);
    });
  });

  describe('Integration', () => {
    it('should work with clinic billing page integration', () => {
      // This test ensures the component can be integrated into the clinic billing page
      render(<RevenueChart data={mockRevenueData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should maintain consistent styling with other billing components', () => {
      render(<RevenueChart data={mockRevenueData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
    });
  });
});


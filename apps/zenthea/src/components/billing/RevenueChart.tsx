'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/billing/formatting';

/**
 * Monthly revenue data point
 */
export interface MonthlyRevenueData {
  month: string; // Month label (e.g., "Jan 2024")
  billed: number; // Billed amount in cents
  collected: number; // Collected amount in cents
}

/**
 * Props for RevenueChart component
 */
export interface RevenueChartProps {
  data: MonthlyRevenueData[];
  height?: number; // Chart height in pixels (default: 300)
}

/**
 * Custom tooltip formatter for revenue chart
 * Displays exact amounts in currency format
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-elevated border border-border-primary rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-text-primary mb-2">{label}</p>
        {payload.map((entry, index: number) => {
          if (!entry || typeof entry.value !== 'number') return null;
          return (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span>{' '}
              <span className="font-semibold">{formatCurrency(entry.value)}</span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
}

/**
 * RevenueChart Component
 * 
 * Displays monthly billed vs collected revenue as a stacked bar chart.
 * Used in the clinic billing dashboard to visualize revenue trends.
 * 
 * Features:
 * - Stacked bar chart showing billed vs collected amounts
 * - Custom tooltip with exact currency amounts
 * - Responsive design using ResponsiveContainer
 * - Uses Zenthea brand colors (teal for billed, purple for collected)
 * 
 * Task 3.6: Implement RevenueChart Component
 * 
 * @example
 * ```tsx
 * <RevenueChart
 *   data={[
 *     { month: 'Jan 2024', billed: 500000, collected: 450000 },
 *     { month: 'Feb 2024', billed: 600000, collected: 550000 },
 *   ]}
 *   height={400}
 * />
 * ```
 */
/**
 * Format large numbers for Y-axis display
 * Converts numbers like 200000 to "200K", 600000 to "600K", etc.
 */
function formatYAxisLabel(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
}

export function RevenueChart({ data, height = 300 }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height} data-testid="responsive-container">
      <BarChart 
        data={data} 
        data-testid="bar-chart"
        margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" data-testid="cartesian-grid" />
        <XAxis dataKey="month" data-testid="x-axis" />
        <YAxis 
          data-testid="y-axis"
          width={60}
          tickFormatter={formatYAxisLabel}
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} data-testid="tooltip" />
        <Legend data-testid="legend" />
        <Bar
          dataKey="billed"
          fill="var(--zenthea-teal)"
          name="Billed"
          stackId="revenue"
          data-testid="bar-billed"
        />
        <Bar
          dataKey="collected"
          fill="var(--zenthea-purple)"
          name="Collected"
          stackId="revenue"
          data-testid="bar-collected"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}


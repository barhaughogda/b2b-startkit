'use client';

import React, { useMemo } from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

// Error boundary for chart components
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center text-gray-500">
          <p>Unable to display chart</p>
        </div>
      );
    }

    return this.props.children;
  }
}

interface StandardTrendChartProps {
  historicalData: Array<{
    date: string;
    value: number;
    flag?: string;
  }>;
  chartTitle: string;
  compact?: boolean;
}

export const StandardTrendChart: React.FC<StandardTrendChartProps> = ({
  historicalData,
  chartTitle,
  compact = false
}) => {
  const chartData = useMemo(() => {
    return historicalData.map(item => ({
      ...item,
      formattedDate: new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }));
  }, [historicalData]);

  const getLineColor = (flag?: string) => {
    switch (flag) {
      case 'high': return '#ef4444';
      case 'low': return '#3b82f6';
      case 'critical': return '#dc2626';
      default: return '#10b981';
    }
  };

  const lineColor = getLineColor(historicalData[historicalData.length - 1]?.flag);

  if (compact) {
    return (
      <div className="h-16 w-full">
        <ChartErrorBoundary>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData}>
              <XAxis 
                dataKey="formattedDate" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10 }}
              />
              <YAxis hide />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-2 border rounded shadow-sm">
                        <p className="text-xs font-medium">{data.formattedDate}</p>
                        <p className="text-sm font-semibold">{data.value}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone" 
                dataKey="value" 
                stroke={lineColor}
                strokeWidth={2}
                dot={{ fill: lineColor, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 4, stroke: lineColor, strokeWidth: 2 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
      <h5 className="text-xs font-medium text-text-primary mb-2">{chartTitle} Trend</h5>
      <div className="h-40 min-h-[160px]">
        <ChartErrorBoundary>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData}>
              <XAxis 
                dataKey="formattedDate" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10 }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="text-sm font-medium text-gray-900">{data.formattedDate}</p>
                        <p className="text-lg font-bold text-gray-900">{data.value}</p>
                        {data.flag && (
                          <p className="text-xs text-gray-500 capitalize">{data.flag}</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone" 
                dataKey="value" 
                stroke={lineColor}
                strokeWidth={2}
                dot={{ fill: lineColor, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 4, stroke: lineColor, strokeWidth: 2 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>
      </div>
    </div>
  );
};

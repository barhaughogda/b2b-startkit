'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { StandardTrendChart } from '../StandardTrendChart';

interface TrendData {
  testName: string;
  historicalData: {
    date: string;
    value: number;
    flag: string;
  }[];
}

interface LabResultTrendsProps {
  trends: TrendData[];
  showTrends: boolean;
  onToggleTrends: () => void;
}

export function LabResultTrends({
  trends,
  showTrends,
  onToggleTrends
}: LabResultTrendsProps) {
  if (!trends || trends.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Trends Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleTrends}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          {showTrends ? 'Hide' : 'Show'} Trends
        </Button>
        <div className="text-sm text-gray-600">
          {trends.length} trend{trends.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Trend Visualization */}
      {showTrends && (
        <div className="bg-surface-elevated p-4 rounded-lg">
          <h4 className="text-sm font-medium text-text-primary mb-3">Historical Trends</h4>
          <div className="space-y-4">
            {trends.map((trend, index) => (
              <StandardTrendChart
                key={index}
                historicalData={trend.historicalData}
                chartTitle={trend.testName}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

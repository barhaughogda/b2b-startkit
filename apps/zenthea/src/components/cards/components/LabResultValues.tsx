'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TestTube, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardTrendChart } from '../StandardTrendChart';

interface LabResult {
  testName: string;
  value: number;
  units: string;
  referenceRange: string;
  flag: 'normal' | 'high' | 'low' | 'critical';
  trend: 'improving' | 'worsening' | 'stable';
  interpretation?: string;
}

interface TrendData {
  testName: string;
  historicalData: {
    date: string;
    value: number;
    flag: string;
  }[];
}

interface LabResultValuesProps {
  results: LabResult[];
  trends: TrendData[];
  resultsDate: string;
  onValueClick?: (testName: string) => void;
}

// Enhanced Trend Chart Component using StandardTrendChart
const TrendChart = ({ testName, historicalData, compact = false }: { testName: string; historicalData: { date: string; value: number; flag: string }[]; compact?: boolean }) => {
  if (!historicalData || historicalData.length < 2) {
    return (
      <div className={cn("text-center text-sm text-text-secondary", compact ? "py-1" : "py-4")}>
        {!compact && <TestTube className="h-8 w-8 mx-auto mb-2 text-text-tertiary" />}
        <p className={compact ? "text-xs" : ""}>No data</p>
      </div>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <StandardTrendChart
        historicalData={historicalData}
        chartTitle={testName}
        compact={compact}
      />
    </div>
  );
};

export function LabResultValues({
  results,
  trends,
  resultsDate,
  onValueClick
}: LabResultValuesProps) {
  if (results.length === 0) {
    return (
      <div className="py-8 text-center text-text-secondary">
        <TestTube className="h-8 w-8 mx-auto mb-2 text-text-tertiary" />
        <p className="text-sm">No results found for this category</p>
        <p className="text-xs text-text-tertiary mt-1">
          Select a different category to view lab results
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Table Header */}
      <div className="grid grid-cols-3 gap-4 py-2 px-3 bg-surface-elevated rounded-md text-sm font-medium text-text-secondary">
        <div>Name</div>
        <div>{new Date(resultsDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}</div>
        <div className="flex items-center gap-1">
          Past Year
        </div>
      </div>

      {/* Lab Results Rows */}
      {results.map((result, index) => (
        <div 
          key={index} 
          className="py-3 px-3 hover:bg-surface-interactive rounded-md transition-colors border border-border-primary"
          onClick={(e) => {
            e.stopPropagation();
            onValueClick?.(result.testName);
          }}
        >
          {/* Main Result Row */}
          <div className="grid grid-cols-3 gap-4 mb-2">
            <div className="font-medium text-text-primary">{result.testName}</div>
            <div className="text-text-primary flex items-center gap-2">
              <span className="font-semibold">{result.value}</span>
              <span className="text-text-secondary">{result.units}</span>
              <Badge 
                variant={
                  result.flag === 'critical' ? 'destructive' : 
                  result.flag === 'high' || result.flag === 'low' ? 'secondary' : 
                  'default'
                }
                className="text-xs"
              >
                {result.flag.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center">
              <TrendChart
                testName={result.testName}
                historicalData={trends.find(trend => trend.testName === result.testName)?.historicalData || [
                  { date: '2024-01-01', value: result.value, flag: result.flag },
                  { date: '2024-02-01', value: result.value, flag: result.flag },
                  { date: '2024-03-01', value: result.value, flag: result.flag }
                ]}
                compact={true}
              />
            </div>
          </div>
          
          {/* Additional Information Row */}
          <div className="grid grid-cols-3 gap-4 text-xs text-text-secondary">
            <div></div>
            <div className="flex items-center gap-1">
              <span>Normal: {result.referenceRange}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className={cn(
                "h-3 w-3",
                result.trend === 'improving' ? "text-green-600" :
                result.trend === 'worsening' ? "text-red-600" :
                "text-gray-600"
              )} />
              <span className={cn(
                result.trend === 'improving' ? "text-green-600" :
                result.trend === 'worsening' ? "text-red-600" :
                "text-gray-600"
              )}>
                {result.trend}
              </span>
            </div>
          </div>
          
          {/* Interpretation */}
          {result.interpretation && (
            <div className="mt-1 text-xs text-text-secondary italic">
              {result.interpretation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

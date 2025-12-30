'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LabResult {
  id: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  date: string;
  time: string;
  notes?: string;
}

interface LabTrendsChartProps {
  results: LabResult[];
}

export function LabTrendsChart({ results }: LabTrendsChartProps) {
  // Group results by test name and sort by date
  const groupedResults = results.reduce((acc, result) => {
    const testName = result.testName;
    if (!acc[testName]) {
      acc[testName] = [];
    }
    acc[testName]!.push(result);
    return acc;
  }, {} as Record<string, LabResult[]>);

  // Sort each group by date
  Object.keys(groupedResults).forEach(testName => {
    groupedResults[testName]!.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  // Create chart data
  const chartData = Object.keys(groupedResults).map(testName => {
    const testResults = groupedResults[testName];
    if (!testResults) return null;
    const latestResult = testResults[testResults.length - 1];
    if (!latestResult) return null;
    
    return {
      testName,
      value: parseFloat(latestResult.value) || 0,
      unit: latestResult.unit,
      status: latestResult.status,
      date: latestResult.date,
      trend: testResults.length > 1 ? 
        (parseFloat(testResults[testResults.length - 1]!.value) - parseFloat(testResults[0]!.value)) : 0
    };
  }).filter((d): d is Exclude<typeof d, null> => d !== null);

  const colors = {
    normal: '#10b981',
    high: '#f59e0b',
    low: '#3b82f6',
    critical: '#ef4444'
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(groupedResults).map(testName => {
          const testResults = groupedResults[testName]!;
          const latestResult = testResults[testResults.length - 1];
          
          if (!latestResult) return null;
          
          if (testResults.length < 2) {
            return (
              <div key={testName} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{testName}</h4>
                  <span className={`text-sm px-2 py-1 rounded ${
                    latestResult.status === 'critical' ? 'bg-red-100 text-red-800' :
                    latestResult.status === 'high' ? 'bg-orange-100 text-orange-800' :
                    latestResult.status === 'low' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {latestResult.status}
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {latestResult.value} {latestResult.unit}
                </div>
                <div className="text-sm text-muted-foreground">
                  Ref: {latestResult.referenceRange}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Single reading - no trend data
                </div>
              </div>
            );
          }

          const chartData = testResults.map((result, index) => ({
            date: result.date,
            value: parseFloat(result.value) || 0,
            unit: result.unit,
            status: result.status
          }));

          return (
            <div key={testName} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">{testName}</h4>
                <span className={`text-sm px-2 py-1 rounded ${
                  latestResult.status === 'critical' ? 'bg-red-100 text-red-800' :
                  latestResult.status === 'high' ? 'bg-orange-100 text-orange-800' :
                  latestResult.status === 'low' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {latestResult.status}
                </span>
              </div>
              
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `${value} ${props.payload.unit}`,
                        testName
                      ]}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={colors[latestResult.status as keyof typeof colors]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-2 text-sm text-muted-foreground">
                Latest: {latestResult.value} {latestResult.unit} • 
                Ref: {latestResult.referenceRange}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

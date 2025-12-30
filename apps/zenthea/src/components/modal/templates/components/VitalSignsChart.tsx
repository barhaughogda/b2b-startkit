'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

interface VitalSign {
  id: string;
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'height' | 'oxygen_saturation' | 'respiratory_rate';
  value: string;
  unit: string;
  timestamp: string;
  notes?: string;
}

interface VitalSignsChartProps {
  vitalSigns: VitalSign[];
}

export function VitalSignsChart({ vitalSigns }: VitalSignsChartProps) {
  // Group vital signs by type
  const groupedVitals = vitalSigns.reduce((acc, vital) => {
    const type = vital.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type]!.push(vital);
    return acc;
  }, {} as Record<string, VitalSign[]>);

  // Sort each group by timestamp
  Object.keys(groupedVitals).forEach(type => {
    const group = groupedVitals[type];
    if (group) {
      group.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
  });

  const colors = {
    blood_pressure: '#ef4444',
    heart_rate: '#f59e0b',
    temperature: '#10b981',
    weight: '#3b82f6',
    height: '#8b5cf6',
    oxygen_saturation: '#06b6d4',
    respiratory_rate: '#84cc16'
  };

  const getVitalIcon = (type: string) => {
    switch (type) {
      case 'blood_pressure': return '🩺';
      case 'heart_rate': return '❤️';
      case 'temperature': return '🌡️';
      case 'weight': return '⚖️';
      case 'height': return '📏';
      case 'oxygen_saturation': return '🫁';
      case 'respiratory_rate': return '💨';
      default: return '📊';
    }
  };

  const formatValue = (type: string, value: string) => {
    const numValue = parseFloat(value);
    switch (type) {
      case 'blood_pressure':
        return value; // Already formatted as "120/80"
      case 'temperature':
        return `${numValue.toFixed(1)}°F`;
      case 'heart_rate':
        return `${numValue} bpm`;
      case 'weight':
        return `${numValue} kg`;
      case 'height':
        return `${numValue} cm`;
      case 'oxygen_saturation':
        return `${numValue}%`;
      case 'respiratory_rate':
        return `${numValue} rpm`;
      default:
        return value;
    }
  };

  return (
    <div className="space-y-6">
      {Object.keys(groupedVitals).map(type => {
        const vitals = groupedVitals[type];
        if (!vitals) return null;
        
        const latest = vitals[vitals.length - 1];
        if (!latest) return null;
        
        if (vitals.length < 2) {
          return (
            <div key={type} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getVitalIcon(type)}</span>
                  <h4 className="font-medium">{type.replace('_', ' ').toUpperCase()}</h4>
                </div>
                <span className="text-sm text-muted-foreground">
                  {latest.timestamp}
                </span>
              </div>
              <div className="text-2xl font-bold">
                {formatValue(type, latest.value)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Single reading - no trend data
              </div>
            </div>
          );
        }

        // Prepare chart data
        const chartData = vitals.map((vital, index) => {
          const date = new Date(vital.timestamp);
          let value: number;
          
          if (type === 'blood_pressure') {
            // For blood pressure, use systolic value for the chart
            const [systolic] = vital.value.split('/').map(Number);
            value = systolic || 0;
          } else {
            value = parseFloat(vital.value) || 0;
          }
          
          return {
            date: date.toLocaleDateString(),
            value,
            timestamp: vital.timestamp,
            fullValue: vital.value
          };
        });

        return (
          <div key={type} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getVitalIcon(type)}</span>
                <h4 className="font-medium">{type.replace('_', ' ').toUpperCase()}</h4>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  Latest: {formatValue(type, latest.value)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {latest.timestamp}
                </div>
              </div>
            </div>
            
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => [
                      type === 'blood_pressure' ? props.payload.fullValue : formatValue(type, value.toString()),
                      type.replace('_', ' ').toUpperCase()
                    ]}
                    labelFormatter={(value) => `Date: ${value}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={colors[type as keyof typeof colors]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}

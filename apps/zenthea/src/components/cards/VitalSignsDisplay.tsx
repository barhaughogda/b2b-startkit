'use client';

import React from 'react';
import { Heart, Thermometer, Weight, Ruler, Activity, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VitalSignsDisplayProps {
  vitalSigns: {
    bloodPressure: { systolic: number; diastolic: number; status: string; flag?: string };
    heartRate: { value: number; status: string; flag?: string };
    temperature: { value: number; status: string; flag?: string };
    weight: { value: number; status: string; flag?: string };
    height: { value: number; status: string; flag?: string };
  };
  showTrends: boolean;
  trendData: {
    bloodPressure: Array<{ date: string; systolic: number; diastolic: number }>;
    heartRate: Array<{ date: string; value: number }>;
    temperature: Array<{ date: string; value: number }>;
    weight: Array<{ date: string; value: number }>;
  };
  onToggleTrends: () => void;
}

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case 'normal': return 'bg-green-100 text-green-800 border-green-200';
    case 'elevated': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'critical': return 'bg-red-200 text-red-900 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Icon mapping
const getVitalIcon = (type: string) => {
  switch (type) {
    case 'bloodPressure': return Heart;
    case 'heartRate': return Heart;
    case 'temperature': return Thermometer;
    case 'weight': return Weight;
    case 'height': return Ruler;
    default: return Activity;
  }
};

// Unit mapping
const getUnit = (type: string) => {
  switch (type) {
    case 'bloodPressure': return 'mmHg';
    case 'heartRate': return 'bpm';
    case 'temperature': return '°F';
    case 'weight': return 'lbs';
    case 'height': return 'in';
    default: return '';
  }
};

// Display value formatting
const formatValue = (type: string, value: any) => {
  if (type === 'bloodPressure') {
    return `${value.systolic}/${value.diastolic}`;
  }
  return value.value || value;
};

export const VitalSignsDisplay: React.FC<VitalSignsDisplayProps> = ({
  vitalSigns,
  showTrends,
  trendData,
  onToggleTrends
}) => {
  const vitalSignsList = [
    {
      type: 'bloodPressure',
      label: 'Blood Pressure',
      value: vitalSigns.bloodPressure,
      icon: Heart,
      historicalData: trendData.bloodPressure.map(item => ({
        date: item.date,
        value: item.systolic
      }))
    },
    {
      type: 'heartRate',
      label: 'Heart Rate',
      value: vitalSigns.heartRate,
      icon: Heart,
      historicalData: trendData.heartRate
    },
    {
      type: 'temperature',
      label: 'Temperature',
      value: vitalSigns.temperature,
      icon: Thermometer,
      historicalData: trendData.temperature
    },
    {
      type: 'weight',
      label: 'Weight',
      value: vitalSigns.weight,
      icon: Weight,
      historicalData: trendData.weight
    },
    {
      type: 'height',
      label: 'Height',
      value: vitalSigns.height,
      icon: Ruler,
      historicalData: []
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vitalSignsList.map((vital) => {
          const IconComponent = vital.icon;
          const statusColor = getStatusColor(vital.value.status);
          const unit = getUnit(vital.type);
          const displayValue = formatValue(vital.type, vital.value);

          return (
            <div key={vital.type} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5 text-gray-600" data-testid={`${vital.type}-icon`} />
                  <span className="font-medium text-gray-900">{vital.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" data-testid="check-circle-icon" />
                  <Activity className="h-4 w-4 text-gray-400" data-testid="activity-icon" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {displayValue}
              </div>
              <div className="text-sm text-gray-600">
                {unit}
              </div>
              <Badge className={`mt-2 ${statusColor}`}>
                {vital.value.status}
              </Badge>
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleTrends}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
        >
          <Activity className="h-4 w-4" data-testid="bar-chart-icon" />
          Show Trends
        </button>
        <div className="text-sm text-gray-600">
          Last updated: 2024-01-15 at 10:30 AM
        </div>
      </div>
    </div>
  );
};

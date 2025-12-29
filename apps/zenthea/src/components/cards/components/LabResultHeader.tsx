'use client';

import React from 'react';
import { TestTube } from 'lucide-react';

interface LabResultHeaderProps {
  patientName: string;
  patientId: string;
  testName: string;
  status: 'pending' | 'reviewed' | 'critical' | 'flagged';
  testType: 'routine' | 'stat' | 'critical';
  collectionDate: string;
  resultsDate: string;
}

export function LabResultHeader({
  patientName,
  patientId,
  testName,
  status,
  testType,
  collectionDate,
  resultsDate
}: LabResultHeaderProps) {
  return (
    <div className="p-4 border-b border-border-primary">
      {/* Card Type Row */}
      <div className="flex items-center gap-2 mb-2">
        <TestTube className="h-5 w-5 text-purple-600" />
        <h2 className="font-bold text-lg text-purple-600">Lab Results</h2>
      </div>
      
      {/* Patient Name Row */}
      <div className="mb-1">
        <h3 className="font-bold text-base text-text-primary">{patientName}</h3>
      </div>
      
      {/* Patient ID Row */}
      <div>
        <p className="text-sm text-text-secondary">Patient • ID: {patientId}</p>
      </div>
    </div>
  );
}

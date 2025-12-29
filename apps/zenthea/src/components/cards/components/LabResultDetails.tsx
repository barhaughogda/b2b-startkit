'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TestTube, Clock, Activity, MapPin, Phone, Stethoscope, AlertTriangle, CheckCircle, Plus, MessageSquare, FileText } from 'lucide-react';

interface LabInfo {
  laboratoryName: string;
  laboratoryContact: string;
  laboratoryAddress: string;
  labAccreditation: string;
  orderingPhysician: string;
  orderingPhysicianSpecialty: string;
}

interface LabResultDetailsProps {
  testName: string;
  testType: 'routine' | 'stat' | 'critical';
  status: 'pending' | 'reviewed' | 'critical' | 'flagged';
  collectionDate: string;
  resultsDate: string;
  labInfo: LabInfo;
  clinicalNotes?: string;
  followUpRequired: boolean;
  followUpRecommendations?: string;
  criticalAlerts: string[];
  canReview: boolean;
  canOrderFollowUp: boolean;
  canNotifyPatient: boolean;
  canPrint: boolean;
}

export function LabResultDetails({
  testName, testType, status, collectionDate, resultsDate, labInfo,
  clinicalNotes, followUpRequired, followUpRecommendations, criticalAlerts,
  canReview, canOrderFollowUp, canNotifyPatient, canPrint
}: LabResultDetailsProps) {
  const getStatusVariant = () => {
    if (status === 'critical') return 'destructive';
    if (status === 'flagged') return 'secondary';
    return 'default';
  };

  const actionButtons = [
    { show: canReview, icon: CheckCircle, label: 'Review' },
    { show: canOrderFollowUp, icon: Plus, label: 'Follow-up' },
    { show: canNotifyPatient, icon: MessageSquare, label: 'Notify' },
    { show: canPrint, icon: FileText, label: 'Print' }
  ].filter(btn => btn.show);

  return (
    <div className="space-y-4">
      {/* Test Information */}
      <div className="bg-surface-elevated p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-text-primary">Test Information</h4>
          <Badge variant={getStatusVariant()} className="text-xs">{status.toUpperCase()}</Badge>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TestTube className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">{testName}</span>
            <Badge variant="outline" className="text-xs">{testType.toUpperCase()}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-text-secondary">Collection</p>
                <p className="font-medium">{new Date(collectionDate).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-text-secondary">Results</p>
                <p className="font-medium">{new Date(resultsDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Laboratory Information */}
      <div className="bg-surface-elevated p-4 rounded-lg">
        <h4 className="text-sm font-medium text-text-primary mb-3">Laboratory Information</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-purple-600" />
            <span className="font-medium">{labInfo.laboratoryName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-purple-600" />
            <span>{labInfo.laboratoryContact}</span>
          </div>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-purple-600" />
            <span>Ordered by: {labInfo.orderingPhysician}</span>
          </div>
          <div className="text-xs text-text-secondary">
            <p>Accreditation: {labInfo.labAccreditation}</p>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h4 className="text-sm font-medium text-red-800">Critical Alerts</h4>
          </div>
          <div className="space-y-1">
            {criticalAlerts.map((alert, index) => (
              <p key={index} className="text-sm text-red-700">• {alert}</p>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Notes */}
      {clinicalNotes && (
        <div className="bg-surface-elevated p-4 rounded-lg">
          <h4 className="text-sm font-medium text-text-primary mb-2">Clinical Notes</h4>
          <p className="text-sm text-text-secondary">{clinicalNotes}</p>
        </div>
      )}

      {/* Follow-up Recommendations */}
      {followUpRequired && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">Follow-up Required</h4>
          <p className="text-sm text-yellow-700">{followUpRecommendations}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        {actionButtons.map(({ icon: Icon, label }, index) => (
          <Button key={index} size="sm" variant="outline" className="flex-1">
            <Icon className="h-3 w-3 mr-1" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

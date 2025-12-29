import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, X } from 'lucide-react';

interface DiagnosisStatusBadgeProps {
  status: 'active' | 'resolved' | 'chronic' | 'inactive';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
}

export const DiagnosisStatusBadge: React.FC<DiagnosisStatusBadgeProps> = ({ status, severity }) => {
  const statusConfig = {
    active: {
      color: 'bg-status-success-bg text-status-success',
      label: 'Active',
      icon: CheckCircle
    },
    resolved: {
      color: 'bg-status-info-bg text-status-info',
      label: 'Resolved',
      icon: CheckCircle
    },
    chronic: {
      color: 'bg-status-warning-bg text-status-warning',
      label: 'Chronic',
      icon: Clock
    },
    inactive: {
      color: 'bg-background-secondary text-text-tertiary',
      label: 'Inactive',
      icon: X
    }
  };

  const severityConfig = {
    critical: {
      color: 'bg-status-critical-bg text-status-critical',
      label: 'Critical'
    },
    severe: {
      color: 'bg-status-error-bg text-status-error',
      label: 'Severe'
    },
    moderate: {
      color: 'bg-status-warning-bg text-status-warning',
      label: 'Moderate'
    },
    mild: {
      color: 'bg-status-info-bg text-status-info',
      label: 'Mild'
    }
  };

  const statusInfo = statusConfig[status] || statusConfig.active;
  const severityInfo = severityConfig[severity] || severityConfig.moderate;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex items-center space-x-2">
      <Badge className={`${statusInfo.color} flex items-center space-x-1`}>
        <StatusIcon className="h-3 w-3" />
        <span>{statusInfo.label}</span>
      </Badge>
      <Badge className={severityInfo.color}>
        {severityInfo.label}
      </Badge>
    </div>
  );
};


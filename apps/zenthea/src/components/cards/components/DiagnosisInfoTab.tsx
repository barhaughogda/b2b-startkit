import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DiagnosisCardProps } from '../types';
import {
  AlertCircle,
  User,
  Calendar,
  FileText,
  Stethoscope,
  Activity,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/date';

interface DiagnosisInfoTabProps {
  diagnosisData: DiagnosisCardProps['diagnosisData'];
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-status-critical-bg text-status-critical';
    case 'severe':
      return 'bg-status-error-bg text-status-error';
    case 'moderate':
      return 'bg-status-warning-bg text-status-warning';
    case 'mild':
      return 'bg-status-info-bg text-status-info';
    default:
      return 'bg-background-secondary text-text-tertiary';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-status-success-bg text-status-success';
    case 'resolved':
      return 'bg-status-info-bg text-status-info';
    case 'chronic':
      return 'bg-status-warning-bg text-status-warning';
    case 'inactive':
      return 'bg-background-secondary text-text-tertiary';
    default:
      return 'bg-background-secondary text-text-tertiary';
  }
};

const getRelationshipColor = (relationship: string) => {
  switch (relationship) {
    case 'comorbid':
      return 'bg-status-error-bg text-status-error border-border-error';
    case 'complication':
      return 'bg-status-warning-bg text-status-warning border-border-warning';
    case 'related':
      return 'bg-status-info-bg text-status-info border-border-secondary';
    default:
      return 'bg-background-secondary text-text-tertiary border-border-primary';
  }
};

export const DiagnosisInfoTab: React.FC<DiagnosisInfoTabProps> = ({ diagnosisData }) => {
  const { diagnosis, provider, relatedConditions, treatmentPlan } = diagnosisData;

  return (
    <div className="space-y-6">
      {/* Diagnosis Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-status-error" />
          <span>Diagnosis Information</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-text-secondary">ICD-10 Code:</label>
              <p className="text-sm text-text-primary font-medium">{diagnosis.icd10Code}</p>
            </div>
            
            {diagnosis.snomedCode && (
              <div>
                <label className="text-sm font-medium text-text-secondary">SNOMED Code:</label>
                <p className="text-sm text-text-primary font-medium">{diagnosis.snomedCode}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Description</label>
              <p className="text-sm text-text-primary">{diagnosis.description}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Category</label>
              <p className="text-sm text-text-primary">{diagnosis.category}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-text-secondary">Severity</label>
              <div className="mt-1">
                <Badge className={getSeverityColor(diagnosis.severity)}>
                  {diagnosis.severity.charAt(0).toUpperCase() + diagnosis.severity.slice(1)}
                </Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Status</label>
              <div className="mt-1">
                <Badge className={getStatusColor(diagnosis.status)}>
                  {diagnosis.status.charAt(0).toUpperCase() + diagnosis.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnosis Dates */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-status-info" />
          <span>Diagnosis Dates</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary">Onset Date:</label>
            <p className="text-sm text-text-primary">{formatDate(diagnosis.onsetDate)}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-text-secondary">Diagnosis Date:</label>
            <p className="text-sm text-text-primary">{formatDate(diagnosis.diagnosisDate)}</p>
          </div>
          
          {diagnosis.confirmedDate && (
            <div>
              <label className="text-sm font-medium text-text-secondary">Confirmed Date:</label>
              <p className="text-sm text-text-primary">{formatDate(diagnosis.confirmedDate)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Provider Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary flex items-center space-x-2">
          <User className="h-5 w-5 text-interactive-secondary" />
          <span>Provider Information</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-text-primary font-medium">{provider.name}, {provider.credentials}</p>
            <p className="text-xs text-text-secondary">{provider.specialty}</p>
            <p className="text-xs text-text-secondary">NPI: {provider.npi}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-text-secondary">{provider.phone}</p>
            <p className="text-xs text-text-secondary">{provider.email}</p>
          </div>
        </div>
      </div>

      {/* Related Conditions */}
      {relatedConditions.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-text-primary flex items-center space-x-2">
            <Stethoscope className="h-5 w-5 text-interactive-secondary" />
            <span>Related Conditions</span>
          </h3>
          
          <div className="space-y-2">
            {relatedConditions.map((condition) => (
              <div key={condition.id} className={`p-3 border rounded-lg ${getRelationshipColor(condition.relationship)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{condition.code} - {condition.description}</p>
                    <Badge className="mt-1 text-xs" variant="outline">
                      {condition.relationship}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Treatment Plan */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary flex items-center space-x-2">
          <Activity className="h-5 w-5 text-status-info" />
          <span>Treatment Plan</span>
        </h3>
        
        {/* Medications */}
        {treatmentPlan.medications.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-text-primary">Medications</h4>
            <div className="space-y-2">
              {treatmentPlan.medications.map((med) => (
                <div key={med.id} className="p-3 border border-border-primary rounded-lg">
                  <p className="text-sm font-medium text-text-primary">{med.name}</p>
                  <p className="text-xs text-text-secondary">{med.dosage} - {med.frequency}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Lifestyle Modifications */}
        {treatmentPlan.lifestyle.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-text-primary">Lifestyle Modifications</h4>
            <ul className="list-disc list-inside space-y-1">
              {treatmentPlan.lifestyle.map((item, index) => (
                <li key={index} className="text-sm text-text-primary">{item}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Monitoring */}
        {treatmentPlan.monitoring.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-text-primary">Monitoring</h4>
            <ul className="list-disc list-inside space-y-1">
              {treatmentPlan.monitoring.map((item, index) => (
                <li key={index} className="text-sm text-text-primary">{item}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Follow-up */}
        {treatmentPlan.followUp && (
          <div className="p-3 bg-background-secondary rounded-lg">
            <h4 className="text-sm font-medium text-text-primary mb-1">Follow-up</h4>
            <p className="text-sm text-text-secondary">{treatmentPlan.followUp}</p>
          </div>
        )}
      </div>
    </div>
  );
};


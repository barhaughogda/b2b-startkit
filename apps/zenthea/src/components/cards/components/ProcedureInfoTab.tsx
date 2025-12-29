import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/date';
import { ProcedureCardProps } from '../types';
import { ProcedureStatusBadge } from './ProcedureStatusBadge';
import {
  Stethoscope,
  Clipboard,
  User,
  Clock,
  MapPin,
  Building,
  Scissors,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface ProcedureInfoTabProps {
  procedureData: ProcedureCardProps['procedureData'];
}

export const ProcedureInfoTab: React.FC<ProcedureInfoTabProps> = ({ procedureData }) => {
  const { procedure, provider, outcomes } = procedureData;

  return (
    <div className="space-y-6">
      {/* Procedure Information */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Stethoscope className="h-4 w-4 text-zenthea-purple" />
          <h3 className="font-semibold text-text-primary">Procedure Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-3 bg-surface-secondary rounded-lg">
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Procedure Type</label>
            <p className="text-sm font-medium text-text-primary mt-1">{procedure.type}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Code</label>
            <p className="text-sm font-medium text-text-primary mt-1">Code: {procedure.code}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Description</label>
            <p className="text-sm text-text-secondary mt-1">{procedure.description}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Category</label>
            <p className="text-sm text-text-secondary mt-1">{procedure.category}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Duration</label>
            <div className="flex items-center space-x-1 mt-1">
              <Clock className="h-3 w-3 text-text-tertiary" />
              <p className="text-sm text-text-secondary">{procedure.duration}</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Status</label>
            <div className="mt-1">
              <ProcedureStatusBadge status={procedure.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Provider Information */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-zenthea-purple" />
          <h3 className="font-semibold text-text-primary">Provider Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-3 bg-surface-secondary rounded-lg">
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Provider</label>
            <p className="text-sm font-medium text-text-primary mt-1">{provider.name}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Specialty</label>
            <p className="text-sm text-text-secondary mt-1">{provider.specialty}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Credentials</label>
            <p className="text-sm text-text-secondary mt-1">{provider.credentials}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">NPI</label>
            <p className="text-sm text-text-secondary mt-1">{provider.npi}</p>
          </div>
        </div>
      </div>

      {/* Scheduling Information */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-zenthea-purple" />
          <h3 className="font-semibold text-text-primary">Scheduling Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-3 bg-surface-secondary rounded-lg">
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Scheduled Date</label>
            <p className="text-sm font-medium text-text-primary mt-1">{formatDate(procedure.scheduledDate)}</p>
          </div>
          {procedure.performedDate && (
            <div>
              <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Performed Date</label>
              <p className="text-sm font-medium text-text-primary mt-1">Performed: {formatDate(procedure.performedDate)}</p>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Location</label>
            <div className="flex items-center space-x-1 mt-1">
              <MapPin className="h-3 w-3 text-text-tertiary" />
              <p className="text-sm text-text-secondary">{procedure.location}</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Facility</label>
            <div className="flex items-center space-x-1 mt-1">
              <Building className="h-3 w-3 text-text-tertiary" />
              <p className="text-sm text-text-secondary">{procedure.facility}</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Anesthesia</label>
            <p className="text-sm text-text-secondary mt-1">{procedure.anesthesia}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Indication</label>
            <p className="text-sm text-text-secondary mt-1">{procedure.indication}</p>
          </div>
        </div>
      </div>

      {/* Preparation Instructions */}
      {procedure.preparation && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Clipboard className="h-4 w-4 text-zenthea-purple" />
            <h3 className="font-semibold text-text-primary">Preparation Instructions</h3>
          </div>
          <div className="p-3 bg-surface-secondary rounded-lg">
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{procedure.preparation}</p>
          </div>
        </div>
      )}

      {/* Procedure Instructions */}
      {procedure.instructions && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Scissors className="h-4 w-4 text-zenthea-purple" />
            <h3 className="font-semibold text-text-primary">Procedure Instructions</h3>
          </div>
          <div className="p-3 bg-surface-secondary rounded-lg">
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{procedure.instructions}</p>
          </div>
        </div>
      )}

      {/* Outcomes */}
      {outcomes && outcomes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-zenthea-purple" />
            <h3 className="font-semibold text-text-primary">Outcomes</h3>
          </div>
          <div className="space-y-2">
            {outcomes.map((outcome) => (
              <div key={outcome.id} className="p-3 bg-surface-secondary rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{outcome.type}</p>
                    <p className="text-sm text-text-secondary mt-1">{outcome.description}</p>
                  </div>
                  <span className="text-xs text-text-tertiary">{formatDate(outcome.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up */}
      {procedure.followUp && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-zenthea-purple" />
            <h3 className="font-semibold text-text-primary">Follow-up</h3>
          </div>
          <div className="p-3 bg-surface-secondary rounded-lg">
            <p className="text-sm text-text-secondary">{procedure.followUp}</p>
          </div>
        </div>
      )}
    </div>
  );
};


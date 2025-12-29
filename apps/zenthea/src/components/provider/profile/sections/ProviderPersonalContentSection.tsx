/**
 * Provider Personal Content Section Component
 * 
 * Handles personal story fields: detailed bio, philosophy of care, and why I became a doctor
 */

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FIELD_LABELS,
  FIELD_PLACEHOLDERS,
  FIELD_HELP_TEXT,
} from '@/lib/constants/providerProfileConstants';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';

interface ProviderPersonalContentSectionProps {
  formData: ProviderProfileUpdateData;
  updateField: <K extends keyof ProviderProfileUpdateData>(
    field: K,
    value: ProviderProfileUpdateData[K]
  ) => void;
  errors: any;
}

export function ProviderPersonalContentSection({
  formData,
  updateField,
  errors,
}: ProviderPersonalContentSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="detailedBio">{FIELD_LABELS.detailedBio}</Label>
        <Textarea
          id="detailedBio"
          className={`min-h-[150px] ${errors.detailedBio ? 'border-status-error' : ''}`}
          placeholder={FIELD_PLACEHOLDERS.detailedBio}
          value={formData.detailedBio || ''}
          onChange={(e) => updateField('detailedBio', e.target.value)}
        />
        {errors.detailedBio && (
          <p className="text-xs text-status-error mt-1">
            {errors.detailedBio.message as string}
          </p>
        )}
        <p className="text-xs text-text-tertiary mt-1">{FIELD_HELP_TEXT.detailedBio}</p>
      </div>

      <div>
        <Label htmlFor="philosophyOfCare">{FIELD_LABELS.philosophyOfCare}</Label>
        <Textarea
          id="philosophyOfCare"
          className={`min-h-[150px] ${errors.philosophyOfCare ? 'border-status-error' : ''}`}
          placeholder={FIELD_PLACEHOLDERS.philosophyOfCare}
          value={formData.philosophyOfCare || ''}
          onChange={(e) => updateField('philosophyOfCare', e.target.value)}
        />
        {errors.philosophyOfCare && (
          <p className="text-xs text-status-error mt-1">
            {errors.philosophyOfCare.message as string}
          </p>
        )}
        <p className="text-xs text-text-tertiary mt-1">{FIELD_HELP_TEXT.philosophyOfCare}</p>
      </div>

      <div>
        <Label htmlFor="whyIBecameADoctor">{FIELD_LABELS.whyIBecameADoctor}</Label>
        <Textarea
          id="whyIBecameADoctor"
          className={`min-h-[150px] ${errors.whyIBecameADoctor ? 'border-status-error' : ''}`}
          placeholder={FIELD_PLACEHOLDERS.whyIBecameADoctor}
          value={formData.whyIBecameADoctor || ''}
          onChange={(e) => updateField('whyIBecameADoctor', e.target.value)}
        />
        {errors.whyIBecameADoctor && (
          <p className="text-xs text-status-error mt-1">
            {errors.whyIBecameADoctor.message as string}
          </p>
        )}
        <p className="text-xs text-text-tertiary mt-1">{FIELD_HELP_TEXT.whyIBecameADoctor}</p>
      </div>
    </div>
  );
}


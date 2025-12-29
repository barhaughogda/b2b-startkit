/**
 * Provider Practice Details Section Component
 * 
 * Handles practice information: conditions treated and procedures performed
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FIELD_LABELS, FIELD_PLACEHOLDERS } from '@/lib/constants/providerProfileConstants';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';

interface ProviderPracticeDetailsSectionProps {
  formData: ProviderProfileUpdateData;
  updateField: <K extends keyof ProviderProfileUpdateData>(
    field: K,
    value: ProviderProfileUpdateData[K]
  ) => void;
  errors: any;
}

export function ProviderPracticeDetailsSection({
  formData,
  updateField,
  errors,
}: ProviderPracticeDetailsSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="conditionsTreated">{FIELD_LABELS.conditionsTreated}</Label>
        <Input
          id="conditionsTreated"
          placeholder={FIELD_PLACEHOLDERS.conditionsTreated}
          value={formData.conditionsTreated?.join(', ') || ''}
          onChange={(e) => {
            const conditions = e.target.value
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean);
            updateField('conditionsTreated', conditions);
          }}
        />
      </div>

      <div>
        <Label htmlFor="proceduresPerformed">{FIELD_LABELS.proceduresPerformed}</Label>
        <Input
          id="proceduresPerformed"
          placeholder={FIELD_PLACEHOLDERS.proceduresPerformed}
          value={formData.proceduresPerformed?.join(', ') || ''}
          onChange={(e) => {
            const procedures = e.target.value
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean);
            updateField('proceduresPerformed', procedures);
          }}
        />
      </div>
    </div>
  );
}


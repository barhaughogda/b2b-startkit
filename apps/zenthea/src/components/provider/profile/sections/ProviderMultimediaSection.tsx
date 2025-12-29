/**
 * Provider Multimedia Section Component
 * 
 * Handles multimedia content: introduction video URL
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';

interface ProviderMultimediaSectionProps {
  formData: ProviderProfileUpdateData;
  updateField: <K extends keyof ProviderProfileUpdateData>(
    field: K,
    value: ProviderProfileUpdateData[K]
  ) => void;
  errors: any;
}

export function ProviderMultimediaSection({
  formData,
  updateField,
  errors,
}: ProviderMultimediaSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="introductionVideoUrl">Introduction Video</Label>
        <Input
          id="introductionVideoUrl"
          placeholder="YouTube or Vimeo URL"
          value={formData.introductionVideoUrl || ''}
          onChange={(e) => updateField('introductionVideoUrl', e.target.value)}
          className={errors.introductionVideoUrl ? 'border-status-error' : ''}
        />
        {errors.introductionVideoUrl && (
          <p className="text-xs text-status-error mt-1">{errors.introductionVideoUrl.message as string}</p>
        )}
        <p className="text-xs text-text-tertiary mt-1">
          Optional: Add a 2-3 minute introduction video
        </p>
      </div>
      
      <div className="p-4 bg-background-secondary rounded-lg">
        <p className="text-sm text-text-secondary">
          <strong>Note:</strong> Your professional photo can be uploaded using the avatar uploader in the left sidebar.
        </p>
      </div>
    </div>
  );
}


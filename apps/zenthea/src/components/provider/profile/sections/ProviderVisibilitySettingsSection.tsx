/**
 * Provider Visibility Settings Section Component
 * 
 * Handles privacy/visibility controls for profile fields
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Users, Lock } from 'lucide-react';
import { getDefaultVisibilitySettings } from '@/lib/profileVisibility';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';
import type { ProfileVisibilitySettings } from '@/types';

interface ProviderVisibilitySettingsSectionProps {
  formData: ProviderProfileUpdateData;
  updateVisibility: (
    field: keyof ProfileVisibilitySettings,
    value: 'public' | 'portal' | 'private'
  ) => void;
  errors: any;
}

export function ProviderVisibilitySettingsSection({
  formData,
  updateVisibility,
  errors,
}: ProviderVisibilitySettingsSectionProps) {
  const visibility = formData.visibility || getDefaultVisibilitySettings();

  const privacyFields: {
    key: keyof ProfileVisibilitySettings;
    label: string;
    description: string;
  }[] = [
    {
      key: 'bio',
      label: 'Professional Bio',
      description: 'Short bio visible on public profile',
    },
    {
      key: 'detailedBio',
      label: 'Detailed Bio',
      description: 'Longer bio for patient portal',
    },
    {
      key: 'philosophyOfCare',
      label: 'Philosophy of Care',
      description: 'Your care philosophy',
    },
    {
      key: 'professionalPhoto',
      label: 'Professional Photo',
      description: 'Your profile photo',
    },
    {
      key: 'introductionVideo',
      label: 'Introduction Video',
      description: 'Video introduction',
    },
    {
      key: 'testimonials',
      label: 'Patient Testimonials',
      description: 'Patient reviews and ratings',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Control who can see each part of your profile. Use the preview button above to see how
        your profile looks to different audiences.
      </p>

      {privacyFields.map((field) => (
        <div
          key={field.key}
          className="flex items-start justify-between p-4 border border-border-primary rounded-lg"
        >
          <div className="flex-1">
            <Label className="font-medium">{field.label}</Label>
            <p className="text-xs text-text-tertiary mt-1">{field.description}</p>
          </div>
          <Select
            value={visibility[field.key]}
            onValueChange={(v) =>
              updateVisibility(field.key, v as 'public' | 'portal' | 'private')
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Public
                </div>
              </SelectItem>
              <SelectItem value="portal">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Patient Portal
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Private
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}


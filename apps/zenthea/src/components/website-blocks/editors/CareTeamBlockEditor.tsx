'use client';

/**
 * Care Team Block Editor
 */

import React from 'react';
import { CareTeamBlockProps, careTeamBlockPropsSchema } from '@/lib/website-builder/schema';
import { BlockEditorProps } from '../block-registry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CareTeamBlockEditor({ props, onChange }: BlockEditorProps) {
  const careTeamProps = careTeamBlockPropsSchema.parse(props) as CareTeamBlockProps;

  const updateProp = <K extends keyof CareTeamBlockProps>(
    key: K,
    value: CareTeamBlockProps[K]
  ) => {
    onChange({ ...props, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Section Title</Label>
        <Input
          id="title"
          value={careTeamProps.title}
          onChange={(e) => updateProp('title', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input
          id="subtitle"
          value={careTeamProps.subtitle || ''}
          onChange={(e) => updateProp('subtitle', e.target.value || undefined)}
          placeholder="Optional subtitle"
        />
      </div>

      <div className="space-y-2">
        <Label>Max Providers: {careTeamProps.maxProviders}</Label>
        <Slider
          value={[careTeamProps.maxProviders ?? 4]}
          onValueChange={([value]) => value !== undefined && updateProp('maxProviders', value)}
          min={1}
          max={12}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <Label>Layout</Label>
        <Select
          value={careTeamProps.layout}
          onValueChange={(value) => updateProp('layout', value as 'grid' | 'carousel')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="carousel">Carousel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 p-4 bg-surface-secondary rounded-lg">
        <h4 className="font-medium text-sm">Display Options</h4>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="showSpecialties">Show Specialties</Label>
          <Switch
            id="showSpecialties"
            checked={careTeamProps.showSpecialties}
            onCheckedChange={(checked) => updateProp('showSpecialties', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="showCredentials">Show Credentials</Label>
          <Switch
            id="showCredentials"
            checked={careTeamProps.showCredentials}
            onCheckedChange={(checked) => updateProp('showCredentials', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="showBookButton">Show Book Button</Label>
          <Switch
            id="showBookButton"
            checked={careTeamProps.showBookButton}
            onCheckedChange={(checked) => updateProp('showBookButton', checked)}
          />
        </div>
      </div>
    </div>
  );
}


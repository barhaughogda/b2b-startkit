'use client';

import React from 'react';
import { ClinicsBlockProps, clinicsBlockPropsSchema } from '@/lib/website-builder/schema';
import { BlockEditorProps } from '../block-registry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ClinicsBlockEditor({ props, onChange }: BlockEditorProps) {
  const clinicsProps = clinicsBlockPropsSchema.parse(props) as ClinicsBlockProps;

  const updateProp = <K extends keyof ClinicsBlockProps>(key: K, value: ClinicsBlockProps[K]) => {
    onChange({ ...props, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Section Title</Label>
        <Input id="title" value={clinicsProps.title} onChange={(e) => updateProp('title', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input id="subtitle" value={clinicsProps.subtitle || ''} onChange={(e) => updateProp('subtitle', e.target.value || undefined)} placeholder="Optional subtitle" />
      </div>
      <div className="space-y-2">
        <Label>Layout</Label>
        <Select value={clinicsProps.layout} onValueChange={(value) => updateProp('layout', value as ClinicsBlockProps['layout'])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="list">List</SelectItem>
            <SelectItem value="map-first">Map First</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4 p-4 bg-surface-secondary rounded-lg">
        <h4 className="font-medium text-sm">Display Options</h4>
        <div className="flex items-center justify-between">
          <Label htmlFor="showMap">Show Map Link</Label>
          <Switch id="showMap" checked={clinicsProps.showMap} onCheckedChange={(checked) => updateProp('showMap', checked)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="showHours">Show Hours</Label>
          <Switch id="showHours" checked={clinicsProps.showHours} onCheckedChange={(checked) => updateProp('showHours', checked)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="showPhone">Show Phone</Label>
          <Switch id="showPhone" checked={clinicsProps.showPhone} onCheckedChange={(checked) => updateProp('showPhone', checked)} />
        </div>
      </div>
    </div>
  );
}


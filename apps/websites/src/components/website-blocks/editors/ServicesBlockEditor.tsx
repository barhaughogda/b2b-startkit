'use client';

import React from 'react';
import { ServicesBlockProps, servicesBlockPropsSchema } from '@/lib/website-builder/schema';
import { BlockEditorProps } from '../block-registry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ServicesBlockEditor({ props, onChange }: BlockEditorProps) {
  const servicesProps = servicesBlockPropsSchema.parse(props) as ServicesBlockProps;

  const updateProp = <K extends keyof ServicesBlockProps>(key: K, value: ServicesBlockProps[K]) => {
    onChange({ ...props, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Section Title</Label>
        <Input id="title" value={servicesProps.title} onChange={(e) => updateProp('title', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input id="subtitle" value={servicesProps.subtitle || ''} onChange={(e) => updateProp('subtitle', e.target.value || undefined)} placeholder="Optional subtitle" />
      </div>
      <div className="space-y-2">
        <Label>Max Services: {servicesProps.maxServices || 'All'}</Label>
        <Slider value={[servicesProps.maxServices || 20]} onValueChange={([value]) => updateProp('maxServices', value)} min={1} max={20} step={1} />
      </div>
      <div className="space-y-2">
        <Label>Layout</Label>
        <Select value={servicesProps.layout} onValueChange={(value) => updateProp('layout', value as 'grid' | 'list')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="list">List</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4 p-4 bg-surface-secondary rounded-lg">
        <h4 className="font-medium text-sm">Display Options</h4>
        <div className="flex items-center justify-between">
          <Label htmlFor="showDuration">Show Duration</Label>
          <Switch id="showDuration" checked={servicesProps.showDuration} onCheckedChange={(checked) => updateProp('showDuration', checked)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="showDescription">Show Description</Label>
          <Switch id="showDescription" checked={servicesProps.showDescription} onCheckedChange={(checked) => updateProp('showDescription', checked)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="showPrice">Show Price</Label>
          <Switch id="showPrice" checked={servicesProps.showPrice} onCheckedChange={(checked) => updateProp('showPrice', checked)} />
        </div>
      </div>
    </div>
  );
}


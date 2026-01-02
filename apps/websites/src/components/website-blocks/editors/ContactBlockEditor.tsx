'use client';

import React from 'react';
import { ContactBlockProps, contactBlockPropsSchema } from '@/lib/website-builder/schema';
import { BlockEditorProps } from '../block-registry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ContactBlockEditor({ props, onChange }: BlockEditorProps) {
  const contactProps = contactBlockPropsSchema.parse(props) as ContactBlockProps;

  const updateProp = <K extends keyof ContactBlockProps>(key: K, value: ContactBlockProps[K]) => {
    onChange({ ...props, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Section Title</Label>
        <Input id="title" value={contactProps.title} onChange={(e) => updateProp('title', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input id="subtitle" value={contactProps.subtitle || ''} onChange={(e) => updateProp('subtitle', e.target.value || undefined)} placeholder="Optional subtitle" />
      </div>
      <div className="space-y-2">
        <Label>Layout</Label>
        <Select value={contactProps.layout} onValueChange={(value) => updateProp('layout', value as ContactBlockProps['layout'])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="card-grid">Card Grid</SelectItem>
            <SelectItem value="horizontal">Horizontal</SelectItem>
            <SelectItem value="vertical">Vertical</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4 p-4 bg-surface-secondary rounded-lg">
        <h4 className="font-medium text-sm">Display Options</h4>
        <div className="flex items-center justify-between">
          <Label htmlFor="showPhone">Show Phone</Label>
          <Switch id="showPhone" checked={contactProps.showPhone} onCheckedChange={(checked) => updateProp('showPhone', checked)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="showEmail">Show Email</Label>
          <Switch id="showEmail" checked={contactProps.showEmail} onCheckedChange={(checked) => updateProp('showEmail', checked)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="showAddress">Show Address</Label>
          <Switch id="showAddress" checked={contactProps.showAddress} onCheckedChange={(checked) => updateProp('showAddress', checked)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="showHours">Show Hours</Label>
          <Switch id="showHours" checked={contactProps.showHours} onCheckedChange={(checked) => updateProp('showHours', checked)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="showMap">Show Map</Label>
          <Switch id="showMap" checked={contactProps.showMap} onCheckedChange={(checked) => updateProp('showMap', checked)} />
        </div>
      </div>
    </div>
  );
}


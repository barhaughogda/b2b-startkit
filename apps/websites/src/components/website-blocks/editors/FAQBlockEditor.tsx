'use client';

import React from 'react';
import { FAQBlockProps, faqBlockPropsSchema } from '@/lib/website-builder/schema';
import { BlockEditorProps } from '../block-registry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export default function FAQBlockEditor({ props, onChange }: BlockEditorProps) {
  const faqProps = faqBlockPropsSchema.parse(props) as FAQBlockProps;

  const updateProp = <K extends keyof FAQBlockProps>(key: K, value: FAQBlockProps[K]) => {
    onChange({ ...props, [key]: value });
  };

  const addItem = () => {
    const newItem = { id: Date.now().toString(), question: 'New Question?', answer: 'Answer here...' };
    updateProp('items', [...faqProps.items, newItem]);
  };

  const updateItem = (index: number, updates: Partial<FAQBlockProps['items'][0]>) => {
    const newItems = [...faqProps.items];
    const current = newItems[index];
    if (current) {
      newItems[index] = { ...current, ...updates } as any;
      updateProp('items', newItems);
    }
  };

  const removeItem = (index: number) => {
    updateProp('items', faqProps.items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Section Title</Label>
        <Input id="title" value={faqProps.title} onChange={(e) => updateProp('title', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input id="subtitle" value={faqProps.subtitle || ''} onChange={(e) => updateProp('subtitle', e.target.value || undefined)} placeholder="Optional subtitle" />
      </div>
      <div className="space-y-2">
        <Label>Layout</Label>
        <Select value={faqProps.layout} onValueChange={(value) => updateProp('layout', value as 'accordion' | 'two-column')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="accordion">Single Column</SelectItem>
            <SelectItem value="two-column">Two Columns</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>FAQ Items</Label>
          <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
        {faqProps.items.map((item, index) => (
          <div key={item.id} className="p-4 bg-surface-secondary rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-text-tertiary cursor-move" />
                <span className="text-sm font-medium">Q{index + 1}</span>
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeItem(index)}><Trash2 className="w-4 h-4" /></Button>
            </div>
            <Input value={item.question} onChange={(e) => updateItem(index, { question: e.target.value })} placeholder="Question" />
            <Textarea value={item.answer} onChange={(e) => updateItem(index, { answer: e.target.value })} placeholder="Answer" rows={3} />
          </div>
        ))}
      </div>
    </div>
  );
}


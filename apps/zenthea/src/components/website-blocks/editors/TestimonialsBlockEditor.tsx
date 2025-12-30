'use client';

/**
 * Testimonials Block Editor (DEPRECATED)
 * 
 * This editor is no longer used. The website builder sidebar now uses
 * TestimonialsContentConfigForm instead. This file is kept for backwards
 * compatibility but may be removed in a future version.
 * 
 * @deprecated Use TestimonialsContentConfigForm from website-builder/block-config instead
 */

import React from 'react';
import { 
  TestimonialsBlockProps, 
  testimonialsBlockPropsSchema, 
  TestimonialsLayouts, 
  type TestimonialsLayout 
} from '@/lib/website-builder/schema';
import { BlockEditorProps } from '../block-registry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Star } from 'lucide-react';

/**
 * @deprecated Use TestimonialsContentConfigForm instead
 */
export default function TestimonialsBlockEditor({ props, onChange }: BlockEditorProps) {
  const testimonialsProps = testimonialsBlockPropsSchema.parse(props) as TestimonialsBlockProps;

  const updateProp = <K extends keyof TestimonialsBlockProps>(key: K, value: TestimonialsBlockProps[K]) => {
    onChange({ ...props, [key]: value });
  };

  const addTestimonial = () => {
    const newTestimonial = { 
      id: Date.now().toString(), 
      testimonial: 'Enter testimonial here...', 
      name: 'Patient Name', 
      tagline: '', 
      rating: 5 
    };
    updateProp('testimonials', [...testimonialsProps.testimonials, newTestimonial]);
  };

  const updateTestimonial = (index: number, updates: Partial<TestimonialsBlockProps['testimonials'][0]>) => {
    const newTestimonials = [...testimonialsProps.testimonials];
    const existing = newTestimonials[index];
    if (existing) {
      newTestimonials[index] = { ...existing, ...updates } as TestimonialsBlockProps['testimonials'][0];
      updateProp('testimonials', newTestimonials);
    }
  };

  const removeTestimonial = (index: number) => {
    updateProp('testimonials', testimonialsProps.testimonials.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Section Title</Label>
        <Input id="title" value={testimonialsProps.title} onChange={(e) => updateProp('title', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input id="subtitle" value={testimonialsProps.subtitle || ''} onChange={(e) => updateProp('subtitle', e.target.value || undefined)} placeholder="Optional subtitle" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Layout</Label>
          <Select value={testimonialsProps.layout} onValueChange={(value) => updateProp('layout', value as TestimonialsLayout)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TestimonialsLayouts.map((layout) => (
                <SelectItem key={layout} value={layout}>
                  {layout.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Max Visible: {testimonialsProps.maxVisible}</Label>
          <Slider 
            value={[testimonialsProps.maxVisible]} 
            onValueChange={(values) => {
              const val = values[0];
              if (val !== undefined) {
                updateProp('maxVisible', val);
              }
            }} 
            min={1} 
            max={6} 
            step={1} 
          />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Testimonials</Label>
          <Button size="sm" variant="outline" onClick={addTestimonial}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
        {testimonialsProps.testimonials.map((testimonial, index) => (
          <div key={testimonial.id} className="p-4 bg-surface-secondary rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className="w-4 h-4 cursor-pointer" 
                    style={{
                      color: star <= (testimonial.rating || 5) 
                        ? 'var(--zenthea-coral, #E8927C)' 
                        : 'var(--color-text-tertiary, #9ca3af)',
                      fill: star <= (testimonial.rating || 5) ? 'currentColor' : 'none',
                    }}
                    onClick={() => updateTestimonial(index, { rating: star })} 
                  />
                ))}
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeTestimonial(index)}><Trash2 className="w-4 h-4" /></Button>
            </div>
            <Textarea value={testimonial.testimonial} onChange={(e) => updateTestimonial(index, { testimonial: e.target.value })} placeholder="Testimonial quote" rows={3} />
            <div className="grid grid-cols-2 gap-2">
              <Input value={testimonial.name} onChange={(e) => updateTestimonial(index, { name: e.target.value })} placeholder="Author name" />
              <Input value={testimonial.tagline || ''} onChange={(e) => updateTestimonial(index, { tagline: e.target.value || undefined })} placeholder="Title (optional)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

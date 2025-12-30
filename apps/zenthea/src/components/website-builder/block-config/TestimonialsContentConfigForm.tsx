'use client';

/**
 * Testimonials Content Config Form
 * 
 * Configuration panel for editing Testimonials block content in the Website Builder sidebar.
 * Allows adding, editing, and deleting testimonial items with image upload, ratings, etc.
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Star, ChevronUp, ChevronDown } from 'lucide-react';
import { ImageUpload } from '../ImageUpload';

// =============================================================================
// TYPES
// =============================================================================

interface TestimonialItem {
  id: string;
  imageUrl?: string;
  imageAlt?: string;
  name: string;
  tagline?: string;
  rating?: number;
  header?: string;
  testimonial: string;
}

interface TestimonialsContentConfigFormProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

// =============================================================================
// STAR RATING COMPONENT
// =============================================================================

interface StarRatingProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}

function StarRating({ value, onChange, disabled }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => {
            // If clicking the same star, clear the rating
            if (value === star) {
              onChange(undefined);
            } else {
              onChange(star);
            }
          }}
          disabled={disabled}
          className="p-0.5 transition-colors hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Set rating to ${star} star${star !== 1 ? 's' : ''}`}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              value && star <= value
                ? 'fill-current'
                : ''
            }`}
            style={{
              color: value && star <= value 
                ? 'var(--zenthea-coral, #E8927C)' 
                : 'var(--color-text-tertiary, #9ca3af)',
            }}
          />
        </button>
      ))}
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          disabled={disabled}
          className="ml-2 text-xs text-text-tertiary hover:text-text-secondary disabled:cursor-not-allowed"
        >
          Clear
        </button>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TestimonialsContentConfigForm({
  props,
  onUpdate,
  disabled,
}: TestimonialsContentConfigFormProps) {
  const title = (props.title as string) || 'What Our Patients Say';
  const subtitle = (props.subtitle as string) || '';
  const testimonials = (props.testimonials as TestimonialItem[]) || [];

  // Add a new testimonial item
  const handleAddItem = () => {
    const newItem: TestimonialItem = {
      id: Date.now().toString(),
      name: 'Customer Name',
      testimonial: 'Share your experience...',
      rating: 5,
    };
    onUpdate({ ...props, testimonials: [...testimonials, newItem] });
  };

  // Update an existing testimonial item
  const handleUpdateItem = (index: number, updates: Partial<TestimonialItem>) => {
    const newItems = [...testimonials];
    const existing = newItems[index];
    if (existing) {
      newItems[index] = { ...existing, ...updates } as TestimonialItem;
      onUpdate({ ...props, testimonials: newItems });
    }
  };

  // Remove a testimonial item
  const handleRemoveItem = (index: number) => {
    const newItems = testimonials.filter((_, i) => i !== index);
    onUpdate({ ...props, testimonials: newItems });
  };

  // Move item up in the list
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...testimonials];
    const item1 = newItems[index - 1];
    const item2 = newItems[index];
    if (item1 && item2) {
      newItems[index - 1] = item2;
      newItems[index] = item1;
      onUpdate({ ...props, testimonials: newItems });
    }
  };

  // Move item down in the list
  const handleMoveDown = (index: number) => {
    if (index === testimonials.length - 1) return;
    const newItems = [...testimonials];
    const item1 = newItems[index];
    const item2 = newItems[index + 1];
    if (item1 && item2) {
      newItems[index] = item2;
      newItems[index + 1] = item1;
      onUpdate({ ...props, testimonials: newItems });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="testimonials-title">Section Title</Label>
        <Input
          id="testimonials-title"
          value={title}
          onChange={(e) => onUpdate({ ...props, title: e.target.value })}
          disabled={disabled}
          placeholder="What Our Patients Say"
        />
      </div>

      {/* Subtitle */}
      <div className="space-y-2">
        <Label htmlFor="testimonials-subtitle">Subtitle</Label>
        <Input
          id="testimonials-subtitle"
          value={subtitle}
          onChange={(e) => onUpdate({ ...props, subtitle: e.target.value || undefined })}
          disabled={disabled}
          placeholder="Optional subtitle"
        />
      </div>

      {/* Testimonial Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Testimonials</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddItem}
            disabled={disabled}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {testimonials.length === 0 && (
          <p className="text-sm text-text-tertiary text-center py-4">
            No testimonials yet. Click &quot;Add&quot; to create your first testimonial.
          </p>
        )}

        {testimonials.map((item, index) => (
          <div
            key={item.id}
            className="p-4 bg-surface-secondary rounded-lg space-y-4 border border-border-primary"
          >
            {/* Item Header with Reorder & Delete */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">
                Testimonial {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleMoveUp(index)}
                  disabled={disabled || index === 0}
                  className="h-7 w-7"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleMoveDown(index)}
                  disabled={disabled || index === testimonials.length - 1}
                  className="h-7 w-7"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemoveItem(index)}
                  disabled={disabled}
                  className="h-7 w-7 text-status-error hover:text-status-error hover:bg-status-error/10"
                  aria-label={`Delete testimonial ${index + 1}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">Photo (optional)</Label>
              <ImageUpload
                value={item.imageUrl || ''}
                onChange={(url) => handleUpdateItem(index, { imageUrl: url || undefined })}
                disabled={disabled}
                aspectRatio="square"
                maxSize={5}
                imageType="block"
                className="max-w-[120px]"
              />
              {item.imageUrl && (
                <Input
                  value={item.imageAlt || ''}
                  onChange={(e) => handleUpdateItem(index, { imageAlt: e.target.value || undefined })}
                  disabled={disabled}
                  placeholder="Image description (alt text)"
                  className="text-xs"
                />
              )}
            </div>

            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor={`testimonial-name-${index}`} className="text-xs text-text-secondary">
                Name
              </Label>
              <Input
                id={`testimonial-name-${index}`}
                value={item.name}
                onChange={(e) => handleUpdateItem(index, { name: e.target.value })}
                disabled={disabled}
                placeholder="Customer name"
              />
            </div>

            {/* Tagline / Title */}
            <div className="space-y-1">
              <Label htmlFor={`testimonial-tagline-${index}`} className="text-xs text-text-secondary">
                Title / Tagline (optional)
              </Label>
              <Input
                id={`testimonial-tagline-${index}`}
                value={item.tagline || ''}
                onChange={(e) => handleUpdateItem(index, { tagline: e.target.value || undefined })}
                disabled={disabled}
                placeholder="e.g. Patient since 2022, CEO at Company"
              />
            </div>

            {/* Star Rating */}
            <div className="space-y-1">
              <Label className="text-xs text-text-secondary">Rating (optional)</Label>
              <StarRating
                value={item.rating}
                onChange={(rating) => handleUpdateItem(index, { rating })}
                disabled={disabled}
              />
            </div>

            {/* Header */}
            <div className="space-y-1">
              <Label htmlFor={`testimonial-header-${index}`} className="text-xs text-text-secondary">
                Header (optional)
              </Label>
              <Input
                id={`testimonial-header-${index}`}
                value={item.header || ''}
                onChange={(e) => handleUpdateItem(index, { header: e.target.value || undefined })}
                disabled={disabled}
                placeholder="e.g. Exceptional Care!"
              />
            </div>

            {/* Testimonial Body */}
            <div className="space-y-1">
              <Label htmlFor={`testimonial-body-${index}`} className="text-xs text-text-secondary">
                Testimonial
              </Label>
              <Textarea
                id={`testimonial-body-${index}`}
                value={item.testimonial}
                onChange={(e) => handleUpdateItem(index, { testimonial: e.target.value })}
                disabled={disabled}
                placeholder="Share your experience..."
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TestimonialsContentConfigForm;

'use client';

/**
 * Testimonials Appearance Controls
 * 
 * Layout selector and appearance controls for the Testimonials block.
 * Rendered in the Appearance section of the block config panel.
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
import { TestimonialsLayouts, type TestimonialsLayout } from '@/lib/website-builder/schema';

// =============================================================================
// TYPES
// =============================================================================

interface TestimonialsAppearanceControlsProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LAYOUT_OPTIONS: { value: TestimonialsLayout; label: string; description: string }[] = [
  {
    value: 'hero-card',
    label: 'Hero Card',
    description: 'Large featured testimonial with prominent styling',
  },
  {
    value: 'carousel-cards',
    label: 'Carousel Cards',
    description: 'Horizontally scrollable cards',
  },
  {
    value: 'grid-cards',
    label: 'Grid Cards',
    description: 'Responsive 1–3 column grid',
  },
  {
    value: 'stacked-list',
    label: 'Stacked List',
    description: 'Vertical list with compact layout',
  },
  {
    value: 'centered-quote',
    label: 'Centered Quote',
    description: 'Centered quote with prominent typography',
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function TestimonialsAppearanceControls({
  props,
  onUpdate,
  disabled,
}: TestimonialsAppearanceControlsProps) {
  const layout = (props.layout as TestimonialsLayout) || 'carousel-cards';
  const maxVisible = (props.maxVisible as number) || 3;

  const handleLayoutChange = (value: TestimonialsLayout) => {
    onUpdate({ ...props, layout: value });
  };

  const handleMaxVisibleChange = (value: string) => {
    onUpdate({ ...props, maxVisible: parseInt(value) });
  };

  // Show max visible only for layouts that use it
  const showMaxVisible = layout === 'carousel-cards' || layout === 'grid-cards';

  return (
    <div className="space-y-4">
      {/* Layout Selector */}
      <div className="space-y-2">
        <Label htmlFor="testimonials-layout">Layout Style</Label>
        <Select
          value={layout}
          onValueChange={handleLayoutChange}
          disabled={disabled}
        >
          <SelectTrigger id="testimonials-layout">
            <SelectValue placeholder="Select layout" />
          </SelectTrigger>
          <SelectContent>
            {LAYOUT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-xs text-text-tertiary">
                    {option.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Max Visible (for carousel/grid layouts) */}
      {showMaxVisible && (
        <div className="space-y-2">
          <Label htmlFor="testimonials-max-visible">Max Visible</Label>
          <Select
            value={String(maxVisible)}
            onValueChange={handleMaxVisibleChange}
            disabled={disabled}
          >
            <SelectTrigger id="testimonials-max-visible">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <SelectItem key={num} value={String(num)}>
                  {num} {num === 1 ? 'testimonial' : 'testimonials'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export default TestimonialsAppearanceControls;

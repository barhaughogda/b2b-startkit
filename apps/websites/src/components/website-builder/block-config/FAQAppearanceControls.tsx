'use client';

/**
 * FAQ Appearance Controls
 * 
 * Layout selector and appearance controls for the FAQ block.
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

// =============================================================================
// TYPES
// =============================================================================

type FAQLayout = 'accordion' | 'two-column' | 'split-panel' | 'card-grid';

interface FAQAppearanceControlsProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const FAQ_LAYOUT_OPTIONS: { value: FAQLayout; label: string; description: string }[] = [
  {
    value: 'accordion',
    label: 'Accordion',
    description: 'Classic expandable Q&A list',
  },
  {
    value: 'two-column',
    label: 'Two-Column Accordion',
    description: 'Q&As split into two columns',
  },
  {
    value: 'split-panel',
    label: 'Split Panel',
    description: 'Questions on left, answer on right',
  },
  {
    value: 'card-grid',
    label: 'Card Grid',
    description: 'All Q&As visible as cards',
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function FAQAppearanceControls({
  props,
  onUpdate,
  disabled,
}: FAQAppearanceControlsProps) {
  const layout = (props.layout as FAQLayout) || 'accordion';

  const handleLayoutChange = (value: FAQLayout) => {
    onUpdate({ ...props, layout: value });
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Layout Style</Label>
      <div className="space-y-2">
        <Select
          value={layout}
          onValueChange={handleLayoutChange}
          disabled={disabled}
        >
          <SelectTrigger id="faq-layout" className="w-full h-8 text-xs">
            <SelectValue placeholder="Select layout" />
          </SelectTrigger>
          <SelectContent>
            {FAQ_LAYOUT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-[10px] text-text-tertiary">
                    {option.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default FAQAppearanceControls;


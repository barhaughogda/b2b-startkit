'use client';

/**
 * How It Works Appearance Controls
 *
 * Layout selector and icon shape controls for the How It Works block.
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
import {
  HowItWorksLayouts,
  HowItWorksIconShapes,
  type HowItWorksLayout,
  type HowItWorksIconShape,
} from '@/lib/website-builder/schema';

// =============================================================================
// TYPES
// =============================================================================

interface HowItWorksAppearanceControlsProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LAYOUT_OPTIONS: { value: HowItWorksLayout; label: string; description: string }[] = [
  {
    value: 'numbered-circles',
    label: 'Numbered Circles',
    description: 'Icons in colored circles with step numbers',
  },
  {
    value: 'timeline',
    label: 'Timeline',
    description: 'Vertical timeline with icons on the left',
  },
  {
    value: 'cards',
    label: 'Cards',
    description: 'Each step as an elevated card',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Simple icons without backgrounds',
  },
];

const ICON_SHAPE_OPTIONS: { value: HowItWorksIconShape; label: string; description: string }[] = [
  {
    value: 'circle',
    label: 'Circle',
    description: 'Fully round icons',
  },
  {
    value: 'rounded-square',
    label: 'Rounded Square',
    description: 'Softly rounded corners',
  },
  {
    value: 'square',
    label: 'Square',
    description: 'Sharp corners',
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function HowItWorksAppearanceControls({
  props,
  onUpdate,
  disabled,
}: HowItWorksAppearanceControlsProps) {
  const layout = (props.layout as HowItWorksLayout) || 'numbered-circles';
  const iconShape = (props.iconShape as HowItWorksIconShape) || 'circle';

  const handleLayoutChange = (value: HowItWorksLayout) => {
    onUpdate({ ...props, layout: value });
  };

  const handleIconShapeChange = (value: HowItWorksIconShape) => {
    onUpdate({ ...props, iconShape: value });
  };

  return (
    <div className="space-y-4">
      {/* Layout Selector */}
      <div className="space-y-2">
        <Label htmlFor="how-it-works-layout">Layout Style</Label>
        <Select
          value={layout}
          onValueChange={handleLayoutChange}
          disabled={disabled}
        >
          <SelectTrigger id="how-it-works-layout">
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

      {/* Icon Shape Selector */}
      <div className="space-y-2">
        <Label htmlFor="how-it-works-icon-shape">Icon Shape</Label>
        <Select
          value={iconShape}
          onValueChange={handleIconShapeChange}
          disabled={disabled}
        >
          <SelectTrigger id="how-it-works-icon-shape">
            <SelectValue placeholder="Select shape" />
          </SelectTrigger>
          <SelectContent>
            {ICON_SHAPE_OPTIONS.map((option) => (
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
    </div>
  );
}

export default HowItWorksAppearanceControls;

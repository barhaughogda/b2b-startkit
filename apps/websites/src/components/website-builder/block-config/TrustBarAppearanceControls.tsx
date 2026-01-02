'use client';

/**
 * Trust Bar Appearance Controls
 *
 * Appearance configuration for the Trust Bar block.
 * Displayed in the Appearance collapsible section of BlockConfigPanel.
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

interface TrustBarAppearanceControlsProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TrustBarAppearanceControls({
  props,
  onUpdate,
  disabled,
}: TrustBarAppearanceControlsProps) {
  const layout = (props.layout as 'horizontal' | 'grid') || 'horizontal';
  const showLabels = props.showLabels !== false;
  const grayscaleLogos = props.grayscaleLogos !== false;
  const compactMode = props.compactMode === true;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-text-primary">Display Options</h4>

      {/* Layout */}
      <div className="space-y-2">
        <Label className="text-xs">Layout</Label>
        <Select
          value={layout}
          onValueChange={(value) => onUpdate({ ...props, layout: value })}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="horizontal">Horizontal (scrollable row)</SelectItem>
            <SelectItem value="grid">Grid (wrapping columns)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Show Labels */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Show Labels</Label>
          <p className="text-xs text-text-tertiary">Display text labels next to icons</p>
        </div>
        <Switch
          checked={showLabels}
          onCheckedChange={(checked) => onUpdate({ ...props, showLabels: checked })}
          disabled={disabled}
        />
      </div>

      {/* Grayscale Logos */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Grayscale Logos</Label>
          <p className="text-xs text-text-tertiary">Apply grayscale filter, color on hover</p>
        </div>
        <Switch
          checked={grayscaleLogos}
          onCheckedChange={(checked) => onUpdate({ ...props, grayscaleLogos: checked })}
          disabled={disabled}
        />
      </div>

      {/* Compact Mode */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Compact Mode</Label>
          <p className="text-xs text-text-tertiary">Use short labels when available</p>
        </div>
        <Switch
          checked={compactMode}
          onCheckedChange={(checked) => onUpdate({ ...props, compactMode: checked })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default TrustBarAppearanceControls;

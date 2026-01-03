'use client';

/**
 * Shared form fields for Custom Text Block editing
 * Used by both CustomTextBlockEditor and CustomTextConfigForm
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor, EDITOR_MIN_HEIGHT, EDITOR_MAX_HEIGHT, EDITOR_SIDEBAR_MIN_HEIGHT, EDITOR_SIDEBAR_MAX_HEIGHT } from '@/components/ui/rich-text-editor';
import type { CustomTextBlockProps } from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';

// =============================================================================
// COLOR PICKER COMPONENT
// =============================================================================

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function ColorPicker({ label, value, onChange, disabled }: ColorPickerProps) {
  // Validate hex color format
  const isValidHex = (color: string): boolean => {
    if (!color) return true; // Allow empty for placeholder
    // Match 3 or 6 digit hex colors with optional #
    return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  };

  const handleInputChange = (newValue: string) => {
    // Normalize: add # if missing and valid
    let normalizedValue = newValue.trim();
    if (normalizedValue && !normalizedValue.startsWith('#')) {
      normalizedValue = '#' + normalizedValue;
    }
    
    // Only update if valid hex color or empty
    if (normalizedValue === '' || isValidHex(normalizedValue)) {
      onChange(normalizedValue);
    }
  };

  // Ensure value always has # prefix for display
  const displayValue = value && !value.startsWith('#') ? `#${value}` : value;

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg border border-border-primary overflow-hidden flex-shrink-0"
          style={{ backgroundColor: isValidHex(value) ? value : '#000000' }}
        >
          <input
            type="color"
            value={isValidHex(value) ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full opacity-0 cursor-pointer"
            disabled={disabled}
            aria-label={`Pick ${label} color`}
          />
        </div>
        <Input
          value={displayValue || ''}
          onChange={(e) => handleInputChange(e.target.value)}
          className={cn(
            "flex-1 font-mono text-sm",
            !isValidHex(value) && value && "border-border-error"
          )}
          placeholder="#000000"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export interface CustomTextBlockFormFieldsProps {
  props: CustomTextBlockProps | Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
  isSidebar?: boolean; // If true, uses sidebar-specific heights
}

export function CustomTextBlockFormFields({
  props,
  onUpdate,
  disabled = false,
  isSidebar = false,
}: CustomTextBlockFormFieldsProps) {
  const customTextProps = props as CustomTextBlockProps;
  const showTitle = (customTextProps.showTitle ?? true) as boolean;

  return (
    <div className="space-y-6">
      {/* Title Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="showTitle">Show Title</Label>
        <Switch
          id="showTitle"
          checked={showTitle}
          onCheckedChange={(checked) => onUpdate({ ...props, showTitle: checked })}
          disabled={disabled}
        />
      </div>

      {/* Title Input */}
      {showTitle && (
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={(customTextProps.title as string) || ''}
            onChange={(e) => onUpdate({ ...props, title: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}

      {/* Rich Text Content Editor */}
      <div className="space-y-2">
        <Label>Content</Label>
        <RichTextEditor
          value={(customTextProps.content as string) || ''}
          onChange={(html) => onUpdate({ ...props, content: html })}
          placeholder="Start typing your content..."
          minHeight={isSidebar ? EDITOR_SIDEBAR_MIN_HEIGHT : EDITOR_MIN_HEIGHT}
          maxHeight={isSidebar ? EDITOR_SIDEBAR_MAX_HEIGHT : EDITOR_MAX_HEIGHT}
          disabled={disabled}
        />
      </div>

      {/* Layout Settings */}
      <div className="p-4 bg-surface-secondary rounded-lg space-y-4">
        <h4 className="font-medium text-sm text-text-primary">Layout Settings</h4>

        <div className="space-y-2">
          <Label>Content Width</Label>
          <Select
            value={(customTextProps.maxWidth as string) || 'normal'}
            onValueChange={(value) => onUpdate({ ...props, maxWidth: value })}
            disabled={disabled}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="narrow">Narrow</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="wide">Wide</SelectItem>
              <SelectItem value="full">Full Width</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ColorPicker
            label="BG Color"
            value={(customTextProps.backgroundColor as string) || '#ffffff'}
            onChange={(value) => onUpdate({ ...props, backgroundColor: value })}
            disabled={disabled}
          />
          <ColorPicker
            label="Text Color"
            value={(customTextProps.textColor as string) || '#000000'}
            onChange={(value) => onUpdate({ ...props, textColor: value })}
            disabled={disabled}
          />
        </div>

        <p className="text-xs text-text-tertiary">
          Use the alignment buttons in the editor toolbar above to align individual paragraphs.
        </p>
      </div>
    </div>
  );
}


'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  FOOTER_VARIANTS,
  FOOTER_METADATA,
  type FooterVariant,
} from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import { Check, LayoutGrid, Minus, Palette } from 'lucide-react';
import { ColorPicker, ContrastWarning } from './ColorPicker';
import {
  DEFAULT_FOOTER_BACKGROUND,
  DEFAULT_FOOTER_TEXT,
} from '@/lib/website-builder/color-defaults';
import { getBackgroundColor, getPrimaryTextColor } from '@/lib/website-builder/theme-utils';
import type { ThemeConfig } from '@/lib/website-builder/schema';

// =============================================================================
// TYPES
// =============================================================================

interface FooterSelectorProps {
  selectedVariant?: FooterVariant;
  onSelect: (variant: FooterVariant) => void;
  // Color customization props
  backgroundColor?: string;
  textColor?: string;
  useThemeColors?: boolean;
  onBackgroundColorChange?: (color: string) => void;
  onTextColorChange?: (color: string) => void;
  onUseThemeColorsChange?: (use: boolean) => void;
  theme?: ThemeConfig;
  disabled?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const footerIcons: Record<FooterVariant, React.ComponentType<{ className?: string }>> = {
  'multi-column': LayoutGrid,
  'minimal': Minus,
};

// =============================================================================
// COMPONENT
// =============================================================================

export function FooterSelector({
  selectedVariant,
  onSelect,
  backgroundColor,
  textColor,
  useThemeColors = true,
  onBackgroundColorChange,
  onTextColorChange,
  onUseThemeColorsChange,
  theme,
  disabled,
}: FooterSelectorProps) {
  // Use theme colors as defaults when useThemeColors is false but no custom colors are provided
  const defaultBackgroundColor = theme 
    ? getBackgroundColor(theme) 
    : DEFAULT_FOOTER_BACKGROUND;
  const defaultTextColor = theme 
    ? getPrimaryTextColor(theme) 
    : DEFAULT_FOOTER_TEXT;
  
  const effectiveBackgroundColor = backgroundColor ?? defaultBackgroundColor;
  const effectiveTextColor = textColor ?? defaultTextColor;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">
          Footer Style
        </h3>
        <p className="text-sm text-text-secondary">
          Choose how your footer is organized
        </p>
      </div>

      <div
        className="grid grid-cols-1 gap-3"
        role="radiogroup"
        aria-label="Footer variants"
      >
        {FOOTER_VARIANTS.map((variant) => {
          const metadata = FOOTER_METADATA[variant];
          const Icon = footerIcons[variant];
          const isSelected = selectedVariant === variant;

          return (
            <Card
              key={variant}
              className={cn(
                'relative cursor-pointer transition-all duration-200',
                'border-2 hover:shadow-md',
                isSelected
                  ? 'border-interactive-primary bg-interactive-primary/5'
                  : 'border-border-primary hover:border-border-focus',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !disabled && onSelect(variant)}
              role="radio"
              tabIndex={disabled ? -1 : 0}
              aria-checked={isSelected}
              aria-disabled={disabled}
              onKeyDown={(e) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelect(variant);
                }
              }}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 rounded-full bg-interactive-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                </div>
              )}

              <CardContent className="p-4">
                {/* Preview mockup */}
                <div className="h-16 mb-3 bg-surface-secondary rounded-lg p-2">
                  {variant === 'multi-column' ? (
                    <div className="grid grid-cols-4 gap-1 h-full">
                      {[1, 2, 3, 4].map((col) => (
                        <div key={col} className="flex flex-col gap-1">
                          <div className="h-2 bg-border-primary rounded w-3/4" />
                          <div className="h-1 bg-border-primary/50 rounded w-full" />
                          <div className="h-1 bg-border-primary/50 rounded w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col justify-center items-center gap-1">
                      <div className="h-2 bg-border-primary rounded w-1/4" />
                      <div className="flex gap-2">
                        <div className="h-1 bg-border-primary/50 rounded w-8" />
                        <div className="h-1 bg-border-primary/50 rounded w-8" />
                        <div className="h-1 bg-border-primary/50 rounded w-8" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-text-tertiary" aria-hidden="true" />
                  <span className="font-medium text-sm text-text-primary">
                    {metadata.name}
                  </span>
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  {metadata.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer Colors */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Toggle for theme colors */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-text-tertiary" />
                <Label className="text-sm font-medium">Footer Colors</Label>
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <span>Use theme colors</span>
                <Switch
                  checked={useThemeColors}
                  onCheckedChange={onUseThemeColorsChange}
                  disabled={disabled}
                />
              </label>
            </div>

            {!useThemeColors && (
              <div className="space-y-3 pt-2">
                <ColorPicker
                  label="Background Color"
                  value={effectiveBackgroundColor}
                  onChange={onBackgroundColorChange || (() => {})}
                  disabled={disabled}
                />
                <ColorPicker
                  label="Text & Link Color"
                  value={effectiveTextColor}
                  onChange={onTextColorChange || (() => {})}
                  disabled={disabled}
                />
                <ContrastWarning
                  backgroundColor={effectiveBackgroundColor}
                  textColor={effectiveTextColor}
                  label="Footer contrast warning"
                />
              </div>
            )}

            {useThemeColors && (
              <p className="text-sm text-text-secondary text-center py-4">
                Using global theme colors. Disable "Use theme colors" to customize footer appearance.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FooterSelector;

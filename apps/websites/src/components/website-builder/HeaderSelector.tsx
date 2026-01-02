'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  HEADER_VARIANTS,
  HEADER_METADATA,
  type HeaderVariant,
} from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import { Check, AlignLeft, AlignCenter, Info, Palette } from 'lucide-react';
import { ColorPicker, ContrastWarning } from './ColorPicker';
import {
  DEFAULT_HEADER_BACKGROUND,
  DEFAULT_HEADER_TEXT,
  DEFAULT_MOBILE_HEADER_BACKGROUND,
  DEFAULT_MOBILE_HEADER_TEXT,
} from '@/lib/website-builder/color-defaults';

// =============================================================================
// TYPES
// =============================================================================

interface HeaderSelectorProps {
  selectedVariant?: HeaderVariant;
  onSelect: (variant: HeaderVariant) => void;
  // Color customization props
  backgroundColor?: string;
  textColor?: string;
  mobileBackgroundColor?: string;
  mobileTextColor?: string;
  useThemeColors?: boolean;
  onBackgroundColorChange?: (color: string) => void;
  onTextColorChange?: (color: string) => void;
  onMobileBackgroundColorChange?: (color: string) => void;
  onMobileTextColorChange?: (color: string) => void;
  onUseThemeColorsChange?: (use: boolean) => void;
  disabled?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const headerIcons: Record<HeaderVariant, React.ComponentType<{ className?: string }>> = {
  'sticky-simple': AlignLeft,
  'centered': AlignCenter,
  'info-bar': Info,
};

// =============================================================================
// COMPONENT
// =============================================================================

export function HeaderSelector({
  selectedVariant,
  onSelect,
  backgroundColor = DEFAULT_HEADER_BACKGROUND,
  textColor = DEFAULT_HEADER_TEXT,
  mobileBackgroundColor = DEFAULT_MOBILE_HEADER_BACKGROUND,
  mobileTextColor = DEFAULT_MOBILE_HEADER_TEXT,
  useThemeColors = true,
  onBackgroundColorChange,
  onTextColorChange,
  onMobileBackgroundColorChange,
  onMobileTextColorChange,
  onUseThemeColorsChange,
  disabled,
}: HeaderSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">
          Header Style
        </h3>
        <p className="text-sm text-text-secondary">
          Choose how your navigation appears
        </p>
      </div>

      <div
        className="grid grid-cols-1 gap-3"
        role="radiogroup"
        aria-label="Header variants"
      >
        {HEADER_VARIANTS.map((variant) => {
          const metadata = HEADER_METADATA[variant];
          const Icon = headerIcons[variant];
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
                <div className="h-12 mb-3 bg-surface-secondary rounded-lg flex items-center px-3 gap-2">
                  {variant === 'info-bar' && (
                    <>
                      <div className="h-2 bg-zenthea-purple/30 rounded w-full absolute top-0 left-0 right-0" />
                    </>
                  )}
                  {variant === 'centered' ? (
                    <>
                      <div className="flex-1" />
                      <div className="w-8 h-4 bg-border-primary rounded" />
                      <div className="flex-1" />
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-4 bg-border-primary rounded" />
                      <div className="flex-1" />
                    </>
                  )}
                  <div className="w-6 h-3 bg-zenthea-teal/50 rounded" />
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

      {/* Header Colors */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Toggle for theme colors */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-text-tertiary" />
                <Label className="text-sm font-medium">Header Colors</Label>
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
              <>
                {/* Header Colors */}
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-text-tertiary">Desktop Header</p>
                  <ColorPicker
                    label="Background Color"
                    value={backgroundColor}
                    onChange={onBackgroundColorChange || (() => {})}
                    disabled={disabled}
                  />
                  <ColorPicker
                    label="Text & Menu Color"
                    value={textColor}
                    onChange={onTextColorChange || (() => {})}
                    disabled={disabled}
                  />
                  <ContrastWarning
                    backgroundColor={backgroundColor}
                    textColor={textColor}
                    label="Header contrast warning"
                  />
                </div>

                <div className="border-t border-border-primary pt-3" />

                {/* Mobile Menu Colors */}
                <div className="space-y-3">
                  <p className="text-xs text-text-tertiary">Mobile Menu</p>
                  <ColorPicker
                    label="Background Color"
                    value={mobileBackgroundColor}
                    onChange={onMobileBackgroundColorChange || (() => {})}
                    disabled={disabled}
                  />
                  <ColorPicker
                    label="Text & Menu Color"
                    value={mobileTextColor}
                    onChange={onMobileTextColorChange || (() => {})}
                    disabled={disabled}
                  />
                  <ContrastWarning
                    backgroundColor={mobileBackgroundColor}
                    textColor={mobileTextColor}
                    label="Mobile menu contrast warning"
                  />
                </div>
              </>
            )}

            {useThemeColors && (
              <p className="text-sm text-text-secondary text-center py-4">
                Using global theme colors. Disable "Use theme colors" to customize header appearance.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HeaderSelector;

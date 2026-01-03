'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type ThemeConfig, type HeaderConfig, FONT_PAIRS, DEFAULT_THEME } from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import { Palette, Type, Square, RotateCcw, ImageIcon } from 'lucide-react';
import { WebsiteLogoUpload } from './WebsiteLogoUpload';

// =============================================================================
// TYPES
// =============================================================================

interface ThemeSettingsProps {
  theme: ThemeConfig;
  onThemeChange: (theme: ThemeConfig) => void;
  headerConfig?: HeaderConfig;
  onHeaderConfigChange?: (config: Partial<HeaderConfig>) => void;
  disabled?: boolean;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Convert CSS variable to hex color value
 * Falls back to default hex if variable can't be resolved
 */
function cssVarToHex(cssVar: string): string {
  // If it's already a hex color, return it
  if (cssVar.startsWith('#')) {
    return cssVar;
  }
  
  // If it's a CSS variable, try to resolve it
  if (cssVar.startsWith('var(--')) {
    // Extract variable name
    const varName = cssVar.match(/var\(--([^)]+)\)/)?.[1];
    if (!varName) {
      return '#000000'; // Fallback
    }
    
    // Try to get computed value from document
    if (typeof window !== 'undefined') {
      const computed = getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim();
      if (computed) {
        // If it's already hex, return it
        if (computed.startsWith('#')) {
          return computed;
        }
        // Try to parse RGB/RGBA
        const rgbMatch = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
          const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
          const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
          const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`.toUpperCase();
        }
      }
    }
    
    // Known CSS variable defaults
    const knownVars: Record<string, string> = {
      'zenthea-teal': '#008080',
      'zenthea-purple': '#5F284A',
      'zenthea-coral': '#E07B7E',
      'zenthea-cream': '#F2DDC9',
    };
    
    return knownVars[varName] || '#000000';
  }
  
  // If it's not a CSS variable or hex, return fallback
  return '#000000';
}

function ColorPicker({ label, value, onChange, disabled }: ColorPickerProps) {
  // Convert CSS variables to hex for the color input
  const hexValue = cssVarToHex(value);
  
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg border border-border-primary overflow-hidden"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={hexValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full opacity-0 cursor-pointer"
            disabled={disabled}
            aria-label={`Pick ${label} color`}
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
          placeholder="#000000"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ThemeSettings({
  theme,
  onThemeChange,
  headerConfig,
  onHeaderConfigChange,
  disabled,
}: ThemeSettingsProps) {
  const updateTheme = (updates: Partial<ThemeConfig>) => {
    onThemeChange({ ...theme, ...updates });
  };

  const handleReset = () => {
    onThemeChange(DEFAULT_THEME);
  };

  const handleLogoChange = (logoUrl: string) => {
    if (onHeaderConfigChange) {
      onHeaderConfigChange({ logoUrl: logoUrl || undefined });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Theme Settings
          </h3>
          <p className="text-sm text-text-secondary">
            Customize colors, fonts, and styling
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={disabled}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Website Logo Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-interactive-primary" />
            Website Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-text-secondary">
            Upload a rectangular logo (4:1 aspect ratio) for your website header and footer. 
            This is separate from your clinic&apos;s branding logo.
          </p>
          <WebsiteLogoUpload
            value={headerConfig?.logoUrl || ''}
            onChange={handleLogoChange}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Colors Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4 text-interactive-primary" />
            Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ColorPicker
              label="Primary Color"
              value={theme.primaryColor}
              onChange={(value) => updateTheme({ primaryColor: value })}
              disabled={disabled}
            />
            <ColorPicker
              label="Secondary Color"
              value={theme.secondaryColor}
              onChange={(value) => updateTheme({ secondaryColor: value })}
              disabled={disabled}
            />
            <ColorPicker
              label="Accent Color"
              value={theme.accentColor || theme.primaryColor}
              onChange={(value) => updateTheme({ accentColor: value })}
              disabled={disabled}
            />
            <ColorPicker
              label="Background Color"
              value={theme.backgroundColor}
              onChange={(value) => updateTheme({ backgroundColor: value })}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Typography Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="w-4 h-4 text-interactive-primary" />
            Typography
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Font Pair</Label>
            <Select
              value={theme.fontPair}
              onValueChange={(value) => updateTheme({ fontPair: value })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select font pair" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FONT_PAIRS).map(([key, pair]) => (
                  <SelectItem key={key} value={key}>
                    {pair.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Heading Size</Label>
            <Select
              value={theme.headingSize}
              onValueChange={(value) => updateTheme({ headingSize: value as ThemeConfig['headingSize'] })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Spacing & Radius Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Square className="w-4 h-4 text-interactive-primary" />
            Spacing & Corners
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Section Spacing</Label>
            <Select
              value={theme.sectionSpacing}
              onValueChange={(value) => updateTheme({ sectionSpacing: value as ThemeConfig['sectionSpacing'] })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Corner Radius</Label>
            <div className="grid grid-cols-5 gap-2">
              {(['none', 'small', 'medium', 'large', 'full'] as const).map((radius) => (
                <button
                  key={radius}
                  onClick={() => updateTheme({ cornerRadius: radius })}
                  disabled={disabled}
                  className={cn(
                    'p-2 border-2 transition-all',
                    theme.cornerRadius === radius
                      ? 'border-interactive-primary bg-interactive-primary/10'
                      : 'border-border-primary hover:border-border-focus',
                    radius === 'none' && 'rounded-none',
                    radius === 'small' && 'rounded-sm',
                    radius === 'medium' && 'rounded-md',
                    radius === 'large' && 'rounded-lg',
                    radius === 'full' && 'rounded-full'
                  )}
                  aria-label={`${radius} radius`}
                  aria-pressed={theme.cornerRadius === radius}
                >
                  <div
                    className={cn(
                      'w-6 h-6 bg-surface-secondary',
                      radius === 'none' && 'rounded-none',
                      radius === 'small' && 'rounded-sm',
                      radius === 'medium' && 'rounded-md',
                      radius === 'large' && 'rounded-lg',
                      radius === 'full' && 'rounded-full'
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-text-tertiary text-center capitalize">
              {theme.cornerRadius}
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default ThemeSettings;

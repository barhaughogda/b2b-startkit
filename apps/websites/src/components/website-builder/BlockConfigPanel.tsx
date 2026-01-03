'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { CustomTextBlockFormFields } from '@/components/website-blocks/editors/CustomTextBlockFormFields';
import { FAQContentConfigForm } from './block-config/FAQContentConfigForm';
import { FAQAppearanceControls } from './block-config/FAQAppearanceControls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  BLOCK_METADATA,
  BackgroundTokens,
  TextTokens,
  DEFAULT_BLOCK_APPEARANCE,
  type BlockInstance,
  type BlockType,
  type BlockAppearance,
  type BackgroundToken,
  type TextToken,
  type ButtonAppearance,
  type CTABandBlockProps,
  type HeroBlockProps,
} from '@/lib/website-builder/schema';
import { Settings, ChevronDown, Palette } from 'lucide-react';
import { ImageUpload } from './ImageUpload';

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
  const normalized = cssVar.toLowerCase();
  if (normalized.startsWith('var(--')) {
    // Extract variable name
    const varName = normalized.match(/var\(--([^)]+)\)/)?.[1];
    if (!varName) {
      return '#000000'; // Fallback
    }
    
    // Try to get computed value from document
    if (varName && typeof window !== 'undefined') {
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
          className="w-10 h-10 rounded-lg border border-border-primary overflow-hidden flex-shrink-0"
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
// TYPES
// =============================================================================

interface BlockConfigPanelProps {
  block: BlockInstance | null;
  onUpdate: (props: Record<string, unknown>) => void;
  onAppearanceUpdate?: (appearance: BlockAppearance | undefined) => void;
  onClose: () => void;
  disabled?: boolean;
}

// =============================================================================
// APPEARANCE CONFIG
// =============================================================================

interface AppearanceConfigFormProps {
  appearance: BlockAppearance | undefined;
  onUpdate: (appearance: BlockAppearance | undefined) => void;
  disabled?: boolean;
}

/**
 * Token display labels for UI
 */
const BACKGROUND_TOKEN_LABELS: Record<BackgroundToken, string> = {
  'default': 'Block Default',
  'primary': 'Light (Primary)',
  'secondary': 'Light Gray (Secondary)',
  'surface': 'Surface',
  'accent': 'Brand Color',
  'accent-light': 'Brand Color (Light)',
  'transparent': 'Transparent',
};

const TEXT_TOKEN_LABELS: Record<TextToken, string> = {
  'default': 'Block Default',
  'primary': 'Dark (Primary)',
  'secondary': 'Medium (Secondary)',
  'tertiary': 'Light (Tertiary)',
  'on-accent': 'On Brand Color (Auto)',
  'accent': 'Brand Color',
};

function AppearanceConfigForm({
  appearance,
  onUpdate,
  disabled,
}: AppearanceConfigFormProps) {
  const [showCustomBg, setShowCustomBg] = useState(Boolean(appearance?.backgroundCustom));
  const [showCustomText, setShowCustomText] = useState(Boolean(appearance?.textCustom));

  const handleUpdate = (updates: Partial<BlockAppearance>) => {
    onUpdate({
      ...DEFAULT_BLOCK_APPEARANCE,
      ...appearance,
      ...updates,
    });
  };

  const handleBackgroundTokenChange = (value: BackgroundToken) => {
    handleUpdate({
      backgroundToken: value,
      backgroundCustom: showCustomBg ? appearance?.backgroundCustom : undefined,
    });
  };

  const handleTextTokenChange = (value: TextToken) => {
    handleUpdate({
      textToken: value,
      textCustom: showCustomText ? appearance?.textCustom : undefined,
    });
  };

  const handleCustomBgChange = (value: string) => {
    handleUpdate({
      backgroundCustom: value || undefined,
    });
  };

  const handleCustomTextChange = (value: string) => {
    handleUpdate({
      textCustom: value || undefined,
    });
  };

  const handleResetAppearance = () => {
    onUpdate(undefined);
    setShowCustomBg(false);
    setShowCustomText(false);
  };

  const hasCustomizations = 
    (appearance?.backgroundToken && appearance.backgroundToken !== 'default') ||
    (appearance?.textToken && appearance.textToken !== 'default') ||
    appearance?.backgroundCustom ||
    appearance?.textCustom ||
    (appearance?.paddingTop && appearance.paddingTop !== DEFAULT_BLOCK_APPEARANCE.paddingTop) ||
    (appearance?.paddingBottom && appearance.paddingBottom !== DEFAULT_BLOCK_APPEARANCE.paddingBottom) ||
    (appearance?.maxWidth && appearance.maxWidth !== DEFAULT_BLOCK_APPEARANCE.maxWidth) ||
    appearance?.borderTop ||
    appearance?.borderBottom;

  return (
    <div className="space-y-6">
      {/* Background Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Background</Label>
        
        <Select
          value={appearance?.backgroundToken || 'default'}
          onValueChange={(value) => handleBackgroundTokenChange(value as BackgroundToken)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select background" />
          </SelectTrigger>
          <SelectContent>
            {BackgroundTokens.map((token) => (
              <SelectItem key={token} value={token}>
                {BACKGROUND_TOKEN_LABELS[token]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Background Color */}
        <div className="flex items-center gap-2">
          <Switch
            id="custom-bg"
            checked={showCustomBg}
            onCheckedChange={(checked) => {
              setShowCustomBg(checked);
              if (!checked) {
                handleCustomBgChange('');
              }
            }}
            disabled={disabled}
          />
          <Label htmlFor="custom-bg" className="text-xs text-text-secondary">
            Custom color override
          </Label>
        </div>

        {showCustomBg && (
          <div className="flex items-center gap-2 pl-1">
            <div
              className="w-8 h-8 rounded border border-border-primary overflow-hidden flex-shrink-0"
              style={{ backgroundColor: appearance?.backgroundCustom || '#ffffff' }}
            >
              <input
                type="color"
                value={appearance?.backgroundCustom || '#ffffff'}
                onChange={(e) => handleCustomBgChange(e.target.value)}
                className="w-full h-full opacity-0 cursor-pointer"
                disabled={disabled}
                aria-label="Custom background color"
              />
            </div>
            <Input
              value={appearance?.backgroundCustom || ''}
              onChange={(e) => handleCustomBgChange(e.target.value)}
              className="flex-1 font-mono text-xs h-8"
              placeholder="#ffffff"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Text Color Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Text Color</Label>
        
        <Select
          value={appearance?.textToken || 'default'}
          onValueChange={(value) => handleTextTokenChange(value as TextToken)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select text color" />
          </SelectTrigger>
          <SelectContent>
            {TextTokens.map((token) => (
              <SelectItem key={token} value={token}>
                {TEXT_TOKEN_LABELS[token]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Text Color */}
        <div className="flex items-center gap-2">
          <Switch
            id="custom-text"
            checked={showCustomText}
            onCheckedChange={(checked) => {
              setShowCustomText(checked);
              if (!checked) {
                handleCustomTextChange('');
              }
            }}
            disabled={disabled}
          />
          <Label htmlFor="custom-text" className="text-xs text-text-secondary">
            Custom color override
          </Label>
        </div>

        {showCustomText && (
          <div className="flex items-center gap-2 pl-1">
            <div
              className="w-8 h-8 rounded border border-border-primary overflow-hidden flex-shrink-0"
              style={{ backgroundColor: appearance?.textCustom || '#1a1a1a' }}
            >
              <input
                type="color"
                value={appearance?.textCustom || '#1a1a1a'}
                onChange={(e) => handleCustomTextChange(e.target.value)}
                className="w-full h-full opacity-0 cursor-pointer"
                disabled={disabled}
                aria-label="Custom text color"
              />
            </div>
            <Input
              value={appearance?.textCustom || ''}
              onChange={(e) => handleCustomTextChange(e.target.value)}
              className="flex-1 font-mono text-xs h-8"
              placeholder="#1a1a1a"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Layout Section */}
      <div className="space-y-4 pt-4 border-t border-border-primary">
        <Label className="text-sm font-medium">Layout & Spacing</Label>

        {/* Max Width */}
        <div className="space-y-2">
          <Label className="text-xs text-text-secondary">Maximum Content Width</Label>
          <Select
            value={appearance?.maxWidth || 'normal'}
            onValueChange={(value) => handleUpdate({ maxWidth: value as any })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="narrow">Narrow</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="wide">Wide</SelectItem>
              <SelectItem value="full">Full Width</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Padding */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-text-secondary">Top Padding</Label>
            <Select
              value={appearance?.paddingTop || 'medium'}
              onValueChange={(value) => handleUpdate({ paddingTop: value as any })}
              disabled={disabled}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-text-secondary">Bottom Padding</Label>
            <Select
              value={appearance?.paddingBottom || 'medium'}
              onValueChange={(value) => handleUpdate({ paddingBottom: value as any })}
              disabled={disabled}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Borders */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="border-top"
              checked={appearance?.borderTop || false}
              onCheckedChange={(checked) => handleUpdate({ borderTop: checked })}
              disabled={disabled}
              className="scale-75"
            />
            <Label htmlFor="border-top" className="text-xs text-text-secondary">
              Top Border
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="border-bottom"
              checked={appearance?.borderBottom || false}
              onCheckedChange={(checked) => handleUpdate({ borderBottom: checked })}
              disabled={disabled}
              className="scale-75"
            />
            <Label htmlFor="border-bottom" className="text-xs text-text-secondary">
              Bottom Border
            </Label>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      {hasCustomizations && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetAppearance}
          disabled={disabled}
          className="w-full text-xs text-text-secondary hover:text-text-primary mt-2"
        >
          Reset to Block Defaults
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// HERO BACKGROUND CONFIG FORM (Consolidated Background Control)
// =============================================================================

interface HeroBackgroundConfigFormProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

/**
 * Text token labels for Hero text styling
 */
const HERO_TEXT_TOKEN_LABELS: Record<TextToken, string> = {
  'default': 'Auto (Smart Default)',
  'primary': 'Dark',
  'secondary': 'Medium',
  'tertiary': 'Light',
  'on-accent': 'White (High Contrast)',
  'accent': 'Brand Color',
};

/**
 * Consolidated background configuration for Hero blocks.
 * Supports gradient, solid color, and image backgrounds in one unified control.
 * Also includes text color controls for heading and tagline.
 */
function HeroBackgroundConfigForm({
  props,
  onUpdate,
  disabled,
  appearance,
  onAppearanceUpdate,
}: HeroBackgroundConfigFormProps & { 
  appearance?: BlockAppearance; 
  onAppearanceUpdate?: (appearance: BlockAppearance | undefined) => void 
}) {
  const backgroundType = (props.backgroundType as string) || 'gradient';
  
  // Text appearance state
  const headingAppearance = (props.headingTextAppearance as { textToken?: string; textCustom?: string }) || {};
  const taglineAppearance = (props.taglineTextAppearance as { textToken?: string; textCustom?: string }) || {};
  
  const [showHeadingCustom, setShowHeadingCustom] = useState(Boolean(headingAppearance.textCustom));
  const [showTaglineCustom, setShowTaglineCustom] = useState(Boolean(taglineAppearance.textCustom));
  
  const updateHeadingText = (updates: { textToken?: string; textCustom?: string }) => {
    const newAppearance = { ...headingAppearance, ...updates };
    // Clean up undefined values
    if (!newAppearance.textToken || newAppearance.textToken === 'default') delete newAppearance.textToken;
    if (!newAppearance.textCustom) delete newAppearance.textCustom;
    
    onUpdate({
      ...props,
      headingTextAppearance: Object.keys(newAppearance).length > 0 ? newAppearance : undefined,
    });
  };
  
  const updateTaglineText = (updates: { textToken?: string; textCustom?: string }) => {
    const newAppearance = { ...taglineAppearance, ...updates };
    // Clean up undefined values
    if (!newAppearance.textToken || newAppearance.textToken === 'default') delete newAppearance.textToken;
    if (!newAppearance.textCustom) delete newAppearance.textCustom;
    
    onUpdate({
      ...props,
      taglineTextAppearance: Object.keys(newAppearance).length > 0 ? newAppearance : undefined,
    });
  };

  const handleLayoutUpdate = (updates: Partial<BlockAppearance>) => {
    if (onAppearanceUpdate) {
      onAppearanceUpdate({
        ...DEFAULT_BLOCK_APPEARANCE,
        ...appearance,
        ...updates,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Background</Label>
        </div>
        
        {/* Background Type Selector */}
        <div className="space-y-2">
          <Label className="text-xs text-text-secondary">Type</Label>
          <Select
            value={backgroundType}
            onValueChange={(value) => onUpdate({ ...props, backgroundType: value })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gradient">Gradient</SelectItem>
              <SelectItem value="solid">Solid Color</SelectItem>
              <SelectItem value="image">Background Image</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gradient Controls */}
        {backgroundType === 'gradient' && (
          <div className="space-y-4 p-3 bg-surface-secondary rounded-lg">
            <ColorPicker
              label="Start Color"
              value={(props.gradientFrom as string) || 'var(--zenthea-teal)'}
              onChange={(value) => onUpdate({ ...props, gradientFrom: value })}
              disabled={disabled}
            />
            <ColorPicker
              label="End Color"
              value={(props.gradientTo as string) || 'var(--zenthea-purple)'}
              onChange={(value) => onUpdate({ ...props, gradientTo: value })}
              disabled={disabled}
            />
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">Direction</Label>
              <Select
                value={(props.gradientDirection as string) || 'to-br'}
                onValueChange={(value) => onUpdate({ ...props, gradientDirection: value })}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to-r">→ Right</SelectItem>
                  <SelectItem value="to-l">← Left</SelectItem>
                  <SelectItem value="to-t">↑ Up</SelectItem>
                  <SelectItem value="to-b">↓ Down</SelectItem>
                  <SelectItem value="to-tr">↗ Top Right</SelectItem>
                  <SelectItem value="to-tl">↖ Top Left</SelectItem>
                  <SelectItem value="to-br">↘ Bottom Right</SelectItem>
                  <SelectItem value="to-bl">↙ Bottom Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Solid Color Controls */}
        {backgroundType === 'solid' && (
          <div className="p-3 bg-surface-secondary rounded-lg">
            <ColorPicker
              label="Background Color"
              value={(props.backgroundColor as string) || 'var(--zenthea-teal)'}
              onChange={(value) => onUpdate({ ...props, backgroundColor: value })}
              disabled={disabled}
            />
          </div>
        )}

        {/* Image Controls */}
        {backgroundType === 'image' && (
          <div className="space-y-4 p-3 bg-surface-secondary rounded-lg">
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">Background Image</Label>
              <ImageUpload
                value={(props.backgroundImage as string) || ''}
                onChange={(url) => onUpdate({ ...props, backgroundImage: url })}
                disabled={disabled}
                aspectRatio="landscape"
                maxSize={10}
                imageType="hero"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">
                Overlay Darkness: {Math.round(((props.backgroundOverlay as number) || 0.4) * 100)}%
              </Label>
              <Slider
                value={[((props.backgroundOverlay as number) || 0.4) * 100]}
                onValueChange={(values) => {
                  const val = values[0];
                  if (val !== undefined) {
                    onUpdate({ ...props, backgroundOverlay: val / 100 });
                  }
                }}
                min={0}
                max={80}
                step={5}
                disabled={disabled}
                className="w-full"
              />
              <p className="text-xs text-text-tertiary">
                Darkens the image to improve text readability
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Layout & Spacing Section */}
      <div className="space-y-4 pt-4 border-t border-border-primary">
        <Label className="text-sm font-medium">Layout & Spacing</Label>

        {/* Padding */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-text-secondary">Top Padding</Label>
            <Select
              value={appearance?.paddingTop || 'medium'}
              onValueChange={(value) => handleLayoutUpdate({ paddingTop: value as any })}
              disabled={disabled}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-text-secondary">Bottom Padding</Label>
            <Select
              value={appearance?.paddingBottom || 'medium'}
              onValueChange={(value) => handleLayoutUpdate({ paddingBottom: value as any })}
              disabled={disabled}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Borders */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="hero-border-top"
              checked={appearance?.borderTop || false}
              onCheckedChange={(checked) => handleLayoutUpdate({ borderTop: checked })}
              disabled={disabled}
              className="scale-75"
            />
            <Label htmlFor="hero-border-top" className="text-xs text-text-secondary">
              Top Border
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="hero-border-bottom"
              checked={appearance?.borderBottom || false}
              onCheckedChange={(checked) => handleLayoutUpdate({ borderBottom: checked })}
              disabled={disabled}
              className="scale-75"
            />
            <Label htmlFor="hero-border-bottom" className="text-xs text-text-secondary">
              Bottom Border
            </Label>
          </div>
        </div>
      </div>

      {/* Text Colors Section */}
      <div className="space-y-4 pt-4 border-t border-border-primary">
        <Label className="text-sm font-medium">Text Colors</Label>
        
        {/* Heading Text Color */}
        <div className="space-y-3 p-3 bg-surface-secondary rounded-lg">
          <Label className="text-xs font-medium text-text-secondary">Heading</Label>
          
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <Select
              value={headingAppearance.textToken || 'default'}
              onValueChange={(value) => updateHeadingText({ textToken: value as TextToken })}
              disabled={disabled}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {TextTokens.map((token) => (
                  <SelectItem key={token} value={token} className="text-xs">
                    {HERO_TEXT_TOKEN_LABELS[token]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Switch
                id="heading-text-custom"
                checked={showHeadingCustom}
                onCheckedChange={(checked) => {
                  setShowHeadingCustom(checked);
                  if (!checked) updateHeadingText({ textCustom: undefined });
                }}
                disabled={disabled}
                className="scale-75"
              />
              <Label htmlFor="heading-text-custom" className="text-xs text-text-tertiary">
                Custom color
              </Label>
            </div>
            
            {showHeadingCustom && (
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-border-primary overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: headingAppearance.textCustom || '#ffffff' }}
                >
                  <input
                    type="color"
                    value={headingAppearance.textCustom || '#ffffff'}
                    onChange={(e) => updateHeadingText({ textCustom: e.target.value })}
                    className="w-full h-full opacity-0 cursor-pointer"
                    disabled={disabled}
                  />
                </div>
                <Input
                  value={headingAppearance.textCustom || ''}
                  onChange={(e) => updateHeadingText({ textCustom: e.target.value || undefined })}
                  className="flex-1 font-mono text-xs h-7"
                  placeholder="#ffffff"
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Tagline Text Color */}
        <div className="space-y-3 p-3 bg-surface-secondary rounded-lg">
          <Label className="text-xs font-medium text-text-secondary">Tagline</Label>
          
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <Select
              value={taglineAppearance.textToken || 'default'}
              onValueChange={(value) => updateTaglineText({ textToken: value as TextToken })}
              disabled={disabled}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {TextTokens.map((token) => (
                  <SelectItem key={token} value={token} className="text-xs">
                    {HERO_TEXT_TOKEN_LABELS[token]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Switch
                id="tagline-text-custom"
                checked={showTaglineCustom}
                onCheckedChange={(checked) => {
                  setShowTaglineCustom(checked);
                  if (!checked) updateTaglineText({ textCustom: undefined });
                }}
                disabled={disabled}
                className="scale-75"
              />
              <Label htmlFor="tagline-text-custom" className="text-xs text-text-tertiary">
                Custom color
              </Label>
            </div>
            
            {showTaglineCustom && (
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-border-primary overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: taglineAppearance.textCustom || '#ffffff' }}
                >
                  <input
                    type="color"
                    value={taglineAppearance.textCustom || '#ffffff'}
                    onChange={(e) => updateTaglineText({ textCustom: e.target.value })}
                    className="w-full h-full opacity-0 cursor-pointer"
                    disabled={disabled}
                  />
                </div>
                <Input
                  value={taglineAppearance.textCustom || ''}
                  onChange={(e) => updateTaglineText({ textCustom: e.target.value || undefined })}
                  className="flex-1 font-mono text-xs h-7"
                  placeholder="#ffffff"
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BUTTON APPEARANCE FORM (Used by Hero and CTA Band)
// =============================================================================

interface ButtonAppearanceFormProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

/**
 * Button token labels for UI - more appropriate for button styling
 */
const BUTTON_BACKGROUND_TOKEN_LABELS: Record<BackgroundToken, string> = {
  'default': 'Auto (Smart Default)',
  'primary': 'White',
  'secondary': 'Light Gray',
  'surface': 'Surface',
  'accent': 'Brand Color',
  'accent-light': 'Brand Color (Light)',
  'transparent': 'Transparent',
};

const BUTTON_TEXT_TOKEN_LABELS: Record<TextToken, string> = {
  'default': 'Auto (Smart Default)',
  'primary': 'Dark',
  'secondary': 'Medium',
  'tertiary': 'Light',
  'on-accent': 'Auto Contrast',
  'accent': 'Brand Color',
};

function ButtonAppearanceForm({
  props,
  onUpdate,
  disabled,
}: ButtonAppearanceFormProps) {
  const blockProps = props as unknown as (CTABandBlockProps | HeroBlockProps);
  
  // Primary button appearance
  const primaryBtnAppearance = blockProps.primaryButtonAppearance || {};
  const [showPrimaryBgCustom, setShowPrimaryBgCustom] = useState(Boolean(primaryBtnAppearance.backgroundCustom));
  const [showPrimaryTextCustom, setShowPrimaryTextCustom] = useState(Boolean(primaryBtnAppearance.textCustom));
  
  // Secondary button appearance
  const secondaryBtnAppearance = blockProps.secondaryButtonAppearance || {};
  const [showSecondaryBgCustom, setShowSecondaryBgCustom] = useState(Boolean(secondaryBtnAppearance.backgroundCustom));
  const [showSecondaryTextCustom, setShowSecondaryTextCustom] = useState(Boolean(secondaryBtnAppearance.textCustom));

  const updatePrimaryButton = (updates: Partial<ButtonAppearance>) => {
    const newAppearance = { ...primaryBtnAppearance, ...updates };
    // Clean up undefined values
    if (!newAppearance.backgroundToken || newAppearance.backgroundToken === 'default') delete newAppearance.backgroundToken;
    if (!newAppearance.backgroundCustom) delete newAppearance.backgroundCustom;
    if (!newAppearance.textToken || newAppearance.textToken === 'default') delete newAppearance.textToken;
    if (!newAppearance.textCustom) delete newAppearance.textCustom;
    
    onUpdate({
      ...props,
      primaryButtonAppearance: Object.keys(newAppearance).length > 0 ? newAppearance : undefined,
    });
  };

  const updateSecondaryButton = (updates: Partial<ButtonAppearance>) => {
    const newAppearance = { ...secondaryBtnAppearance, ...updates };
    // Clean up undefined values
    if (!newAppearance.backgroundToken || newAppearance.backgroundToken === 'default') delete newAppearance.backgroundToken;
    if (!newAppearance.backgroundCustom) delete newAppearance.backgroundCustom;
    if (!newAppearance.textToken || newAppearance.textToken === 'default') delete newAppearance.textToken;
    if (!newAppearance.textCustom) delete newAppearance.textCustom;
    
    onUpdate({
      ...props,
      secondaryButtonAppearance: Object.keys(newAppearance).length > 0 ? newAppearance : undefined,
    });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border-primary">
      <Label className="text-sm font-medium">Button Colors</Label>
      
      {/* Primary Button */}
      <div className="space-y-3 p-3 bg-surface-secondary rounded-lg">
        <Label className="text-xs font-medium text-text-secondary">Primary Button</Label>
        
        {/* Background */}
        <div className="space-y-2">
          <Label className="text-xs">Background</Label>
          <Select
            value={primaryBtnAppearance.backgroundToken || 'default'}
            onValueChange={(value) => updatePrimaryButton({ backgroundToken: value as BackgroundToken })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Select background" />
            </SelectTrigger>
            <SelectContent>
              {BackgroundTokens.map((token) => (
                <SelectItem key={token} value={token} className="text-xs">
                  {BUTTON_BACKGROUND_TOKEN_LABELS[token]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <Switch
              id="primary-btn-bg-custom"
              checked={showPrimaryBgCustom}
              onCheckedChange={(checked) => {
                setShowPrimaryBgCustom(checked);
                if (!checked) updatePrimaryButton({ backgroundCustom: undefined });
              }}
              disabled={disabled}
              className="scale-75"
            />
            <Label htmlFor="primary-btn-bg-custom" className="text-xs text-text-tertiary">
              Custom color
            </Label>
          </div>
          
          {showPrimaryBgCustom && (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded border border-border-primary overflow-hidden flex-shrink-0"
                style={{ backgroundColor: primaryBtnAppearance.backgroundCustom || '#ffffff' }}
              >
                <input
                  type="color"
                  value={primaryBtnAppearance.backgroundCustom || '#ffffff'}
                  onChange={(e) => updatePrimaryButton({ backgroundCustom: e.target.value })}
                  className="w-full h-full opacity-0 cursor-pointer"
                  disabled={disabled}
                />
              </div>
              <Input
                value={primaryBtnAppearance.backgroundCustom || ''}
                onChange={(e) => updatePrimaryButton({ backgroundCustom: e.target.value || undefined })}
                className="flex-1 font-mono text-xs h-7"
                placeholder="#ffffff"
                disabled={disabled}
              />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="space-y-2">
          <Label className="text-xs">Text</Label>
          <Select
            value={primaryBtnAppearance.textToken || 'default'}
            onValueChange={(value) => updatePrimaryButton({ textToken: value as TextToken })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Select text color" />
            </SelectTrigger>
            <SelectContent>
              {TextTokens.map((token) => (
                <SelectItem key={token} value={token} className="text-xs">
                  {BUTTON_TEXT_TOKEN_LABELS[token]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <Switch
              id="primary-btn-text-custom"
              checked={showPrimaryTextCustom}
              onCheckedChange={(checked) => {
                setShowPrimaryTextCustom(checked);
                if (!checked) updatePrimaryButton({ textCustom: undefined });
              }}
              disabled={disabled}
              className="scale-75"
            />
            <Label htmlFor="primary-btn-text-custom" className="text-xs text-text-tertiary">
              Custom color
            </Label>
          </div>
          
          {showPrimaryTextCustom && (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded border border-border-primary overflow-hidden flex-shrink-0"
                style={{ backgroundColor: primaryBtnAppearance.textCustom || '#008080' }}
              >
                <input
                  type="color"
                  value={primaryBtnAppearance.textCustom || '#008080'}
                  onChange={(e) => updatePrimaryButton({ textCustom: e.target.value })}
                  className="w-full h-full opacity-0 cursor-pointer"
                  disabled={disabled}
                />
              </div>
              <Input
                value={primaryBtnAppearance.textCustom || ''}
                onChange={(e) => updatePrimaryButton({ textCustom: e.target.value || undefined })}
                className="flex-1 font-mono text-xs h-7"
                placeholder="#008080"
                disabled={disabled}
              />
            </div>
          )}
        </div>
      </div>

      {/* Secondary Button */}
      <div className="space-y-3 p-3 bg-surface-secondary rounded-lg">
        <Label className="text-xs font-medium text-text-secondary">Secondary Button</Label>
        
        {/* Background */}
        <div className="space-y-2">
          <Label className="text-xs">Background</Label>
          <Select
            value={secondaryBtnAppearance.backgroundToken || 'default'}
            onValueChange={(value) => updateSecondaryButton({ backgroundToken: value as BackgroundToken })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Select background" />
            </SelectTrigger>
            <SelectContent>
              {BackgroundTokens.map((token) => (
                <SelectItem key={token} value={token} className="text-xs">
                  {BUTTON_BACKGROUND_TOKEN_LABELS[token]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <Switch
              id="secondary-btn-bg-custom"
              checked={showSecondaryBgCustom}
              onCheckedChange={(checked) => {
                setShowSecondaryBgCustom(checked);
                if (!checked) updateSecondaryButton({ backgroundCustom: undefined });
              }}
              disabled={disabled}
              className="scale-75"
            />
            <Label htmlFor="secondary-btn-bg-custom" className="text-xs text-text-tertiary">
              Custom color
            </Label>
          </div>
          
          {showSecondaryBgCustom && (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded border border-border-primary overflow-hidden flex-shrink-0"
                style={{ backgroundColor: secondaryBtnAppearance.backgroundCustom || 'transparent' }}
              >
                <input
                  type="color"
                  value={secondaryBtnAppearance.backgroundCustom || '#ffffff'}
                  onChange={(e) => updateSecondaryButton({ backgroundCustom: e.target.value })}
                  className="w-full h-full opacity-0 cursor-pointer"
                  disabled={disabled}
                />
              </div>
              <Input
                value={secondaryBtnAppearance.backgroundCustom || ''}
                onChange={(e) => updateSecondaryButton({ backgroundCustom: e.target.value || undefined })}
                className="flex-1 font-mono text-xs h-7"
                placeholder="transparent"
                disabled={disabled}
              />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="space-y-2">
          <Label className="text-xs">Text / Border</Label>
          <Select
            value={secondaryBtnAppearance.textToken || 'default'}
            onValueChange={(value) => updateSecondaryButton({ textToken: value as TextToken })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Select text color" />
            </SelectTrigger>
            <SelectContent>
              {TextTokens.map((token) => (
                <SelectItem key={token} value={token} className="text-xs">
                  {BUTTON_TEXT_TOKEN_LABELS[token]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <Switch
              id="secondary-btn-text-custom"
              checked={showSecondaryTextCustom}
              onCheckedChange={(checked) => {
                setShowSecondaryTextCustom(checked);
                if (!checked) updateSecondaryButton({ textCustom: undefined });
              }}
              disabled={disabled}
              className="scale-75"
            />
            <Label htmlFor="secondary-btn-text-custom" className="text-xs text-text-tertiary">
              Custom color
            </Label>
          </div>
          
          {showSecondaryTextCustom && (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded border border-border-primary overflow-hidden flex-shrink-0"
                style={{ backgroundColor: secondaryBtnAppearance.textCustom || '#ffffff' }}
              >
                <input
                  type="color"
                  value={secondaryBtnAppearance.textCustom || '#ffffff'}
                  onChange={(e) => updateSecondaryButton({ textCustom: e.target.value })}
                  className="w-full h-full opacity-0 cursor-pointer"
                  disabled={disabled}
                />
              </div>
              <Input
                value={secondaryBtnAppearance.textCustom || ''}
                onChange={(e) => updateSecondaryButton({ textCustom: e.target.value || undefined })}
                className="flex-1 font-mono text-xs h-7"
                placeholder="#ffffff"
                disabled={disabled}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BLOCK CONFIG FORMS
// =============================================================================

interface ConfigFormProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

function HeroConfigForm({ props, onUpdate, disabled }: ConfigFormProps) {
  return (
    <div className="space-y-4">
      {/* Content Section */}
      <div className="space-y-4 pb-4 border-b border-border-primary">
        <h4 className="font-medium text-text-primary">Content</h4>
        
        <div className="space-y-2">
          <Label>Headline</Label>
          <Input
            value={(props.headline as string) || ''}
            onChange={(e) => onUpdate({ ...props, headline: e.target.value })}
            placeholder="Welcome to Our Clinic"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label>Tagline</Label>
          <Textarea
            value={(props.tagline as string) || ''}
            onChange={(e) => onUpdate({ ...props, tagline: e.target.value })}
            placeholder="Quality healthcare for you and your family"
            rows={2}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label>Text Alignment</Label>
          <Select
            value={(props.alignment as string) || 'center'}
            onValueChange={(value) => onUpdate({ ...props, alignment: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Primary Button Section */}
      <div className="space-y-4 pb-4 border-b border-border-primary">
        <h4 className="font-medium text-text-primary">Primary Button</h4>
        
        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input
            value={(props.primaryCtaText as string) || ''}
            onChange={(e) => onUpdate({ ...props, primaryCtaText: e.target.value })}
            placeholder="Book Appointment"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label>Button Link</Label>
          <Input
            value={(props.primaryCtaLink as string) || ''}
            onChange={(e) => onUpdate({ ...props, primaryCtaLink: e.target.value || undefined })}
            placeholder="/book"
            disabled={disabled}
          />
          <p className="text-xs text-text-tertiary">
            Leave empty to use your default booking page
          </p>
        </div>
      </div>

      {/* Secondary Button Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-text-primary">Secondary Button</h4>
        
        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input
            value={(props.secondaryCtaText as string) || ''}
            onChange={(e) => onUpdate({ ...props, secondaryCtaText: e.target.value || undefined })}
            placeholder="Learn More"
            disabled={disabled}
          />
          <p className="text-xs text-text-tertiary">
            Leave empty to hide the secondary button
          </p>
        </div>

        {(props.secondaryCtaText as string) && (
          <div className="space-y-2">
            <Label>Button Link</Label>
            <Input
              value={(props.secondaryCtaLink as string) || ''}
              onChange={(e) => onUpdate({ ...props, secondaryCtaLink: e.target.value || undefined })}
              placeholder="#services"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Note: Background is now controlled via Appearance section */}
    </div>
  );
}

function CareTeamConfigForm({ props, onUpdate, disabled }: ConfigFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={(props.title as string) || ''}
          onChange={(e) => onUpdate({ ...props, title: e.target.value })}
          placeholder="Meet Our Care Team"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>Subtitle</Label>
        <Textarea
          value={(props.subtitle as string) || ''}
          onChange={(e) => onUpdate({ ...props, subtitle: e.target.value })}
          placeholder="Experienced healthcare professionals"
          rows={2}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>Number of Providers</Label>
        <Select
          value={String((props.displayCount as number) || 4)}
          onValueChange={(value) => onUpdate({ ...props, displayCount: parseInt(value) })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="6">6</SelectItem>
            <SelectItem value="8">8</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-credentials">Show Credentials</Label>
        <Switch
          id="show-credentials"
          checked={(props.showCredentials as boolean) ?? true}
          onCheckedChange={(checked) => onUpdate({ ...props, showCredentials: checked })}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-specialties">Show Specialties</Label>
        <Switch
          id="show-specialties"
          checked={(props.showSpecialties as boolean) ?? true}
          onCheckedChange={(checked) => onUpdate({ ...props, showSpecialties: checked })}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-photo">Show Photos</Label>
        <Switch
          id="show-photo"
          checked={(props.showPhoto as boolean) ?? true}
          onCheckedChange={(checked) => onUpdate({ ...props, showPhoto: checked })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function ServicesConfigForm({ props, onUpdate, disabled }: ConfigFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={(props.title as string) || ''}
          onChange={(e) => onUpdate({ ...props, title: e.target.value })}
          placeholder="Our Services"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>Subtitle</Label>
        <Textarea
          value={(props.subtitle as string) || ''}
          onChange={(e) => onUpdate({ ...props, subtitle: e.target.value })}
          placeholder="Comprehensive healthcare services"
          rows={2}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>Layout</Label>
        <Select
          value={(props.layout as string) || 'grid'}
          onValueChange={(value) => onUpdate({ ...props, layout: value })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="list">List</SelectItem>
            <SelectItem value="cards">Cards</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Columns</Label>
        <Select
          value={String((props.columns as number) || 3)}
          onValueChange={(value) => onUpdate({ ...props, columns: parseInt(value) })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-duration">Show Duration</Label>
        <Switch
          id="show-duration"
          checked={(props.showDuration as boolean) ?? true}
          onCheckedChange={(checked) => onUpdate({ ...props, showDuration: checked })}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-price">Show Price</Label>
        <Switch
          id="show-price"
          checked={(props.showPrice as boolean) ?? false}
          onCheckedChange={(checked) => onUpdate({ ...props, showPrice: checked })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function ContactConfigForm({ props, onUpdate, disabled }: ConfigFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={(props.title as string) || ''}
          onChange={(e) => onUpdate({ ...props, title: e.target.value })}
          placeholder="Contact Us"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>Subtitle</Label>
        <Textarea
          value={(props.subtitle as string) || ''}
          onChange={(e) => onUpdate({ ...props, subtitle: e.target.value })}
          placeholder="We're here to help"
          rows={2}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-map">Show Map</Label>
        <Switch
          id="show-map"
          checked={(props.showMap as boolean) ?? false}
          onCheckedChange={(checked) => onUpdate({ ...props, showMap: checked })}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-hours">Show Hours</Label>
        <Switch
          id="show-hours"
          checked={(props.showHours as boolean) ?? true}
          onCheckedChange={(checked) => onUpdate({ ...props, showHours: checked })}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-phone">Show Phone</Label>
        <Switch
          id="show-phone"
          checked={(props.showPhone as boolean) ?? true}
          onCheckedChange={(checked) => onUpdate({ ...props, showPhone: checked })}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-email">Show Email</Label>
        <Switch
          id="show-email"
          checked={(props.showEmail as boolean) ?? true}
          onCheckedChange={(checked) => onUpdate({ ...props, showEmail: checked })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function CTABandConfigForm({ props, onUpdate, disabled }: ConfigFormProps) {
  return (
    <div className="space-y-4">
      {/* Content Section */}
      <div className="space-y-4 pb-4 border-b border-border-primary">
        <h4 className="font-medium text-text-primary">Content</h4>
        
        <div className="space-y-2">
          <Label>Headline</Label>
          <Input
            value={(props.headline as string) || ''}
            onChange={(e) => onUpdate({ ...props, headline: e.target.value })}
            placeholder="Ready to Get Started?"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label>Tagline</Label>
          <Textarea
            value={(props.subheadline as string) || ''}
            onChange={(e) => onUpdate({ ...props, subheadline: e.target.value || undefined })}
            placeholder="Book your appointment today"
            rows={2}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Primary Button Section */}
      <div className="space-y-4 pb-4 border-b border-border-primary">
        <h4 className="font-medium text-text-primary">Primary Button</h4>
        
        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input
            value={(props.primaryCtaText as string) || ''}
            onChange={(e) => onUpdate({ ...props, primaryCtaText: e.target.value })}
            placeholder="Book Now"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label>Button Link</Label>
          <Input
            value={(props.primaryCtaLink as string) || ''}
            onChange={(e) => onUpdate({ ...props, primaryCtaLink: e.target.value || undefined })}
            placeholder="/book"
            disabled={disabled}
          />
          <p className="text-xs text-text-tertiary">
            Leave empty to use your default booking page
          </p>
        </div>
      </div>

      {/* Secondary Button Section */}
      <div className="space-y-4 pb-4 border-b border-border-primary">
        <h4 className="font-medium text-text-primary">Secondary Button</h4>
        
        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input
            value={(props.secondaryCtaText as string) || ''}
            onChange={(e) => onUpdate({ ...props, secondaryCtaText: e.target.value || undefined })}
            placeholder="Learn More"
            disabled={disabled}
          />
          <p className="text-xs text-text-tertiary">
            Leave empty to hide the secondary button
          </p>
        </div>

        {(props.secondaryCtaText as string) && (
          <div className="space-y-2">
            <Label>Button Link</Label>
            <Input
              value={(props.secondaryCtaLink as string) || ''}
              onChange={(e) => onUpdate({ ...props, secondaryCtaLink: e.target.value || undefined })}
              placeholder="#contact"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Note: Background is now controlled via Appearance section */}
    </div>
  );
}

function CustomTextConfigForm({ props, onUpdate, disabled }: ConfigFormProps) {
  return (
    <CustomTextBlockFormFields
      props={props}
      onUpdate={onUpdate}
      disabled={disabled}
      isSidebar={true}
    />
  );
}

function GenericConfigForm({ props, onUpdate, disabled }: ConfigFormProps) {
  return (
    <div className="space-y-4">
      {props.title !== undefined && (
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={(props.title as string) || ''}
            onChange={(e) => onUpdate({ ...props, title: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}

      {props.subtitle !== undefined && (
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Textarea
            value={(props.subtitle as string) || ''}
            onChange={(e) => onUpdate({ ...props, subtitle: e.target.value })}
            rows={2}
            disabled={disabled}
          />
        </div>
      )}

      {props.layout !== undefined && (
        <div className="space-y-2">
          <Label>Layout</Label>
          <Select
            value={(props.layout as string) || 'grid'}
            onValueChange={(value) => onUpdate({ ...props, layout: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="list">List</SelectItem>
              <SelectItem value="carousel">Carousel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BlockConfigPanel({
  block,
  onUpdate,
  onAppearanceUpdate,
  onClose,
  disabled,
}: BlockConfigPanelProps) {
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);

  if (!block) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary">
        <div className="text-center">
          <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Select a block to configure</p>
        </div>
      </div>
    );
  }

  const metadata = BLOCK_METADATA[block.type];

  // Check if block has appearance customizations
  const blockProps = block.props as Record<string, unknown>;
  const hasAppearanceCustomizations: boolean = 
    // Generic block appearance tokens
    (block.appearance?.backgroundToken !== 'default' && block.appearance?.backgroundToken !== undefined) ||
    (block.appearance?.textToken !== 'default' && block.appearance?.textToken !== undefined) ||
    Boolean(block.appearance?.backgroundCustom) ||
    Boolean(block.appearance?.textCustom) ||
    // Hero block-specific background customizations
    (block.type === 'hero' && (
      String(blockProps.backgroundType) !== 'gradient' ||
      Boolean(blockProps.backgroundImage) ||
      Boolean(blockProps.primaryButtonAppearance) ||
      Boolean(blockProps.secondaryButtonAppearance)
    ));

  const renderConfigForm = () => {
    const formProps = {
      props: block.props as Record<string, unknown>,
      onUpdate,
      disabled,
    };

    switch (block.type) {
      case 'hero':
        return <HeroConfigForm {...formProps} />;
      case 'care-team':
        return <CareTeamConfigForm {...formProps} />;
      case 'services':
        return <ServicesConfigForm {...formProps} />;
      case 'contact':
        return <ContactConfigForm {...formProps} />;
      case 'cta-band':
        return <CTABandConfigForm {...formProps} />;
      case 'custom-text':
        return <CustomTextConfigForm {...formProps} />;
      case 'faq':
        return <FAQContentConfigForm {...formProps} />;
      default:
        return <GenericConfigForm {...formProps} />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - Block name and description */}
      <div className="px-4 py-3 border-b border-border-primary">
        <h3 className="font-semibold text-text-primary">{metadata.name}</h3>
        <p className="text-xs text-text-tertiary">{metadata.description}</p>
      </div>

      {/* Config Form */}
      <div className="flex-1 overflow-auto">
        {/* Content Configuration */}
        <div className="p-4">
          {renderConfigForm()}
        </div>

        {/* Appearance Section (collapsible) */}
        {onAppearanceUpdate && (
          <div className="border-t border-border-primary">
            <Collapsible open={isAppearanceOpen} onOpenChange={setIsAppearanceOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-surface-secondary transition-colors">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-text-secondary" />
                  <span className="font-medium text-sm text-text-primary">Appearance</span>
                  {hasAppearanceCustomizations && (
                    <span className="w-2 h-2 rounded-full bg-interactive-primary" />
                  )}
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-text-secondary transition-transform ${
                    isAppearanceOpen ? 'rotate-180' : ''
                  }`} 
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-6">
                  {/* FAQ Layout Controls */}
                  {block.type === 'faq' && (
                    <FAQAppearanceControls
                      props={block.props as Record<string, unknown>}
                      onUpdate={onUpdate}
                      disabled={disabled}
                    />
                  )}
                  
                  {/* Hero blocks use consolidated background control */}
                  {block.type === 'hero' ? (
                    <HeroBackgroundConfigForm
                      props={block.props as Record<string, unknown>}
                      onUpdate={onUpdate}
                      disabled={disabled}
                      appearance={block.appearance}
                      onAppearanceUpdate={onAppearanceUpdate}
                    />
                  ) : (
                    <AppearanceConfigForm
                      appearance={block.appearance}
                      onUpdate={onAppearanceUpdate}
                      disabled={disabled}
                    />
                  )}
                  
                  {/* Button Colors for Hero and CTA Band */}
                  {(block.type === 'hero' || block.type === 'cta-band') && (
                    <ButtonAppearanceForm
                      props={block.props as Record<string, unknown>}
                      onUpdate={onUpdate}
                      disabled={disabled}
                    />
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </div>
  );
}

export default BlockConfigPanel;

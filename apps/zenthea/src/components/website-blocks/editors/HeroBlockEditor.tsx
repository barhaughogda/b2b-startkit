'use client';

/**
 * Hero Block Editor
 * 
 * Configuration panel for editing hero block properties.
 * Includes background, button appearance, and content controls.
 */

import React from 'react';
import { HeroBlockProps, heroBlockPropsSchema } from '@/lib/website-builder/schema';
import { BlockEditorProps } from '../block-registry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, ChevronRight, Palette, Type, ImageIcon } from 'lucide-react';

// Button appearance tokens for dropdown options
const BACKGROUND_TOKENS = [
  { value: 'default', label: 'Default' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'surface', label: 'Surface' },
  { value: 'accent', label: 'Accent' },
  { value: 'accent-light', label: 'Accent Light' },
  { value: 'transparent', label: 'Transparent' },
] as const;

const TEXT_TOKENS = [
  { value: 'default', label: 'Default' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'tertiary', label: 'Tertiary' },
  { value: 'on-accent', label: 'On Accent (White)' },
  { value: 'accent', label: 'Accent Color' },
] as const;

const GRADIENT_DIRECTIONS = [
  { value: 'to-r', label: 'Left to Right →' },
  { value: 'to-l', label: 'Right to Left ←' },
  { value: 'to-t', label: 'Bottom to Top ↑' },
  { value: 'to-b', label: 'Top to Bottom ↓' },
  { value: 'to-tr', label: 'Diagonal ↗' },
  { value: 'to-tl', label: 'Diagonal ↖' },
  { value: 'to-br', label: 'Diagonal ↘' },
  { value: 'to-bl', label: 'Diagonal ↙' },
] as const;

type ButtonAppearance = {
  backgroundToken?: string;
  backgroundCustom?: string;
  textToken?: string;
  textCustom?: string;
};

export default function HeroBlockEditor({ props, onChange }: BlockEditorProps) {
  const heroProps = heroBlockPropsSchema.parse(props) as HeroBlockProps;
  
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    content: true,
    primaryButton: true,
    secondaryButton: false,
    background: false,
    buttonAppearance: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateProp = <K extends keyof HeroBlockProps>(
    key: K,
    value: HeroBlockProps[K]
  ) => {
    onChange({ ...props, [key]: value });
  };

  const updateButtonAppearance = (
    buttonKey: 'primaryButtonAppearance' | 'secondaryButtonAppearance',
    field: keyof ButtonAppearance,
    value: string | undefined
  ) => {
    const currentAppearance = (heroProps[buttonKey] || {}) as ButtonAppearance;
    onChange({
      ...props,
      [buttonKey]: {
        ...currentAppearance,
        [field]: value || undefined,
      },
    });
  };

  const SectionHeader = ({ 
    id, 
    title, 
    icon: Icon 
  }: { 
    id: string; 
    title: string; 
    icon?: React.ElementType;
  }) => (
    <button
      type="button"
      className="flex items-center gap-2 w-full text-left py-2 hover:text-zenthea-teal transition-colors"
      onClick={() => toggleSection(id)}
    >
      {expandedSections[id] ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
      {Icon && <Icon className="h-4 w-4" />}
      <span className="font-medium text-sm">{title}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Content Section */}
      <div className="border-b border-border-primary pb-4">
        <SectionHeader id="content" title="Content" icon={Type} />
        {expandedSections.content && (
          <div className="space-y-4 mt-3 pl-6">
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={heroProps.headline}
                onChange={(e) => updateProp('headline', e.target.value)}
                placeholder="Enter headline"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Textarea
                id="tagline"
                value={heroProps.tagline}
                onChange={(e) => updateProp('tagline', e.target.value)}
                placeholder="Enter tagline or description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Text Alignment</Label>
              <Select
                value={heroProps.alignment}
                onValueChange={(value) => updateProp('alignment', value as HeroBlockProps['alignment'])}
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
        )}
      </div>

      {/* Primary Button Section */}
      <div className="border-b border-border-primary pb-4">
        <SectionHeader id="primaryButton" title="Primary Button" />
        {expandedSections.primaryButton && (
          <div className="space-y-4 mt-3 pl-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryCtaText">Button Text</Label>
                <Input
                  id="primaryCtaText"
                  value={heroProps.primaryCtaText}
                  onChange={(e) => updateProp('primaryCtaText', e.target.value)}
                  placeholder="Book Appointment"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryCtaLink">Button Link</Label>
                <Input
                  id="primaryCtaLink"
                  value={heroProps.primaryCtaLink || ''}
                  onChange={(e) => updateProp('primaryCtaLink', e.target.value || undefined)}
                  placeholder="/book"
                />
              </div>
            </div>
            
            {/* Primary Button Appearance */}
            <div className="space-y-3 p-3 bg-surface-secondary rounded-lg">
              <h5 className="text-xs font-medium text-text-secondary">Button Appearance</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Background</Label>
                  <Select
                    value={heroProps.primaryButtonAppearance?.backgroundToken || 'default'}
                    onValueChange={(value) => updateButtonAppearance('primaryButtonAppearance', 'backgroundToken', value === 'default' ? undefined : value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKGROUND_TOKENS.map((token) => (
                        <SelectItem key={token.value} value={token.value}>
                          {token.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Text Color</Label>
                  <Select
                    value={heroProps.primaryButtonAppearance?.textToken || 'default'}
                    onValueChange={(value) => updateButtonAppearance('primaryButtonAppearance', 'textToken', value === 'default' ? undefined : value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEXT_TOKENS.map((token) => (
                        <SelectItem key={token.value} value={token.value}>
                          {token.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Custom BG (hex)</Label>
                  <Input
                    className="h-8 text-xs"
                    value={heroProps.primaryButtonAppearance?.backgroundCustom || ''}
                    onChange={(e) => updateButtonAppearance('primaryButtonAppearance', 'backgroundCustom', e.target.value || undefined)}
                    placeholder="#5FBFAF"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Custom Text (hex)</Label>
                  <Input
                    className="h-8 text-xs"
                    value={heroProps.primaryButtonAppearance?.textCustom || ''}
                    onChange={(e) => updateButtonAppearance('primaryButtonAppearance', 'textCustom', e.target.value || undefined)}
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Button Section */}
      <div className="border-b border-border-primary pb-4">
        <SectionHeader id="secondaryButton" title="Secondary Button" />
        {expandedSections.secondaryButton && (
          <div className="space-y-4 mt-3 pl-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="secondaryCtaText">Button Text</Label>
                <Input
                  id="secondaryCtaText"
                  value={heroProps.secondaryCtaText || ''}
                  onChange={(e) => updateProp('secondaryCtaText', e.target.value || undefined)}
                  placeholder="Learn More"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryCtaLink">Button Link</Label>
                <Input
                  id="secondaryCtaLink"
                  value={heroProps.secondaryCtaLink || ''}
                  onChange={(e) => updateProp('secondaryCtaLink', e.target.value || undefined)}
                  placeholder="#services"
                />
              </div>
            </div>
            
            {/* Secondary Button Appearance */}
            <div className="space-y-3 p-3 bg-surface-secondary rounded-lg">
              <h5 className="text-xs font-medium text-text-secondary">Button Appearance</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Background</Label>
                  <Select
                    value={heroProps.secondaryButtonAppearance?.backgroundToken || 'default'}
                    onValueChange={(value) => updateButtonAppearance('secondaryButtonAppearance', 'backgroundToken', value === 'default' ? undefined : value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKGROUND_TOKENS.map((token) => (
                        <SelectItem key={token.value} value={token.value}>
                          {token.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Text Color</Label>
                  <Select
                    value={heroProps.secondaryButtonAppearance?.textToken || 'default'}
                    onValueChange={(value) => updateButtonAppearance('secondaryButtonAppearance', 'textToken', value === 'default' ? undefined : value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEXT_TOKENS.map((token) => (
                        <SelectItem key={token.value} value={token.value}>
                          {token.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Custom BG (hex)</Label>
                  <Input
                    className="h-8 text-xs"
                    value={heroProps.secondaryButtonAppearance?.backgroundCustom || ''}
                    onChange={(e) => updateButtonAppearance('secondaryButtonAppearance', 'backgroundCustom', e.target.value || undefined)}
                    placeholder="#5F284A"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Custom Text (hex)</Label>
                  <Input
                    className="h-8 text-xs"
                    value={heroProps.secondaryButtonAppearance?.textCustom || ''}
                    onChange={(e) => updateButtonAppearance('secondaryButtonAppearance', 'textCustom', e.target.value || undefined)}
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Background Section */}
      <div className="border-b border-border-primary pb-4">
        <SectionHeader id="background" title="Background" icon={heroProps.backgroundType === 'image' ? ImageIcon : Palette} />
        {expandedSections.background && (
          <div className="space-y-4 mt-3 pl-6">
            {/* Background Type */}
            <div className="space-y-2">
              <Label>Background Type</Label>
              <Select
                value={heroProps.backgroundType}
                onValueChange={(value) => updateProp('backgroundType', value as HeroBlockProps['backgroundType'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gradient">Gradient</SelectItem>
                  <SelectItem value="solid">Solid Color</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gradient Controls */}
            {heroProps.backgroundType === 'gradient' && (
              <div className="space-y-4 p-3 bg-surface-secondary rounded-lg">
                <h5 className="text-xs font-medium text-text-secondary">Gradient Settings</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">From Color</Label>
                    <Input
                      className="h-8 text-xs"
                      value={heroProps.gradientFrom}
                      onChange={(e) => updateProp('gradientFrom', e.target.value)}
                      placeholder="var(--zenthea-teal)"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To Color</Label>
                    <Input
                      className="h-8 text-xs"
                      value={heroProps.gradientTo}
                      onChange={(e) => updateProp('gradientTo', e.target.value)}
                      placeholder="var(--zenthea-purple)"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Direction</Label>
                  <Select
                    value={heroProps.gradientDirection}
                    onValueChange={(value) => updateProp('gradientDirection', value as HeroBlockProps['gradientDirection'])}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADIENT_DIRECTIONS.map((dir) => (
                        <SelectItem key={dir.value} value={dir.value}>
                          {dir.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Solid Color Control */}
            {heroProps.backgroundType === 'solid' && (
              <div className="space-y-2">
                <Label>Background Color</Label>
                <Input
                  value={heroProps.backgroundColor}
                  onChange={(e) => updateProp('backgroundColor', e.target.value)}
                  placeholder="var(--zenthea-teal)"
                />
                <p className="text-xs text-text-tertiary">
                  Use CSS variables (e.g., var(--zenthea-teal)) or hex colors (#5FBFAF)
                </p>
              </div>
            )}

            {/* Image Controls */}
            {heroProps.backgroundType === 'image' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backgroundImage">Image URL</Label>
                  <Input
                    id="backgroundImage"
                    value={heroProps.backgroundImage || ''}
                    onChange={(e) => updateProp('backgroundImage', e.target.value || undefined)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Overlay Opacity: {Math.round((heroProps.backgroundOverlay || 0.4) * 100)}%</Label>
                  <Slider
                    value={[heroProps.backgroundOverlay || 0.4]}
                    onValueChange={(values) => {
                      const val = values[0];
                      if (val !== undefined) {
                        updateProp('backgroundOverlay', val);
                      }
                    }}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-text-tertiary">
                    Controls the dark overlay on the image to ensure text readability
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

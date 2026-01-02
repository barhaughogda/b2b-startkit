'use client';

/**
 * CTA Band Block Editor
 * 
 * Configuration panel for editing CTA band block properties.
 * Includes button text, links, and appearance controls.
 */

import React from 'react';
import { CTABandBlockProps, ctaBandBlockPropsSchema } from '@/lib/website-builder/schema';
import { BlockEditorProps } from '../block-registry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight } from 'lucide-react';

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

type ButtonAppearance = {
  backgroundToken?: string;
  backgroundCustom?: string;
  textToken?: string;
  textCustom?: string;
};

export default function CTABandBlockEditor({ props, onChange }: BlockEditorProps) {
  const ctaProps = ctaBandBlockPropsSchema.parse(props) as CTABandBlockProps;
  
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    primaryButton: true,
    secondaryButton: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateProp = <K extends keyof CTABandBlockProps>(key: K, value: CTABandBlockProps[K]) => {
    onChange({ ...props, [key]: value });
  };

  const updateButtonAppearance = (
    buttonKey: 'primaryButtonAppearance' | 'secondaryButtonAppearance',
    field: keyof ButtonAppearance,
    value: string | undefined
  ) => {
    const currentAppearance = (ctaProps[buttonKey] || {}) as ButtonAppearance;
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
  }: { 
    id: string; 
    title: string; 
  }) => (
    <button
      type="button"
      className="flex items-center gap-2 w-full text-left py-1 hover:text-zenthea-teal transition-colors"
      onClick={() => toggleSection(id)}
    >
      {expandedSections[id] ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
      <span className="font-medium text-sm">{title}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Input id="headline" value={ctaProps.headline} onChange={(e) => updateProp('headline', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subheadline">Subheadline</Label>
        <Input id="subheadline" value={ctaProps.subheadline || ''} onChange={(e) => updateProp('subheadline', e.target.value || undefined)} placeholder="Optional subheadline" />
      </div>

      {/* Primary Button */}
      <div className="space-y-3 p-4 bg-surface-secondary rounded-lg">
        <SectionHeader id="primaryButton" title="Primary Button" />
        {expandedSections.primaryButton && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryCtaText">Text</Label>
                <Input id="primaryCtaText" value={ctaProps.primaryCtaText} onChange={(e) => updateProp('primaryCtaText', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryCtaLink">Link</Label>
                <Input id="primaryCtaLink" value={ctaProps.primaryCtaLink || ''} onChange={(e) => updateProp('primaryCtaLink', e.target.value || undefined)} placeholder="/book" />
              </div>
            </div>
            
            {/* Primary Button Appearance */}
            <div className="space-y-3 p-3 bg-background-primary rounded border border-border-primary">
              <h5 className="text-xs font-medium text-text-secondary">Button Appearance</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Background</Label>
                  <Select
                    value={ctaProps.primaryButtonAppearance?.backgroundToken || 'default'}
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
                    value={ctaProps.primaryButtonAppearance?.textToken || 'default'}
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
                    value={ctaProps.primaryButtonAppearance?.backgroundCustom || ''}
                    onChange={(e) => updateButtonAppearance('primaryButtonAppearance', 'backgroundCustom', e.target.value || undefined)}
                    placeholder="#5FBFAF"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Custom Text (hex)</Label>
                  <Input
                    className="h-8 text-xs"
                    value={ctaProps.primaryButtonAppearance?.textCustom || ''}
                    onChange={(e) => updateButtonAppearance('primaryButtonAppearance', 'textCustom', e.target.value || undefined)}
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Button */}
      <div className="space-y-3 p-4 bg-surface-secondary rounded-lg">
        <SectionHeader id="secondaryButton" title="Secondary Button" />
        {expandedSections.secondaryButton && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="secondaryCtaText">Text</Label>
                <Input id="secondaryCtaText" value={ctaProps.secondaryCtaText || ''} onChange={(e) => updateProp('secondaryCtaText', e.target.value || undefined)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryCtaLink">Link</Label>
                <Input id="secondaryCtaLink" value={ctaProps.secondaryCtaLink || ''} onChange={(e) => updateProp('secondaryCtaLink', e.target.value || undefined)} placeholder="#contact" />
              </div>
            </div>
            
            {/* Secondary Button Appearance */}
            <div className="space-y-3 p-3 bg-background-primary rounded border border-border-primary">
              <h5 className="text-xs font-medium text-text-secondary">Button Appearance</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Background</Label>
                  <Select
                    value={ctaProps.secondaryButtonAppearance?.backgroundToken || 'default'}
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
                    value={ctaProps.secondaryButtonAppearance?.textToken || 'default'}
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
                    value={ctaProps.secondaryButtonAppearance?.backgroundCustom || ''}
                    onChange={(e) => updateButtonAppearance('secondaryButtonAppearance', 'backgroundCustom', e.target.value || undefined)}
                    placeholder="#5F284A"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Custom Text (hex)</Label>
                  <Input
                    className="h-8 text-xs"
                    value={ctaProps.secondaryButtonAppearance?.textCustom || ''}
                    onChange={(e) => updateButtonAppearance('secondaryButtonAppearance', 'textCustom', e.target.value || undefined)}
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Background Color (legacy - deprecated notice) */}
      <div className="space-y-2">
        <Label>Background Color (Legacy)</Label>
        <Select value={ctaProps.backgroundColor || 'primary'} onValueChange={(value) => updateProp('backgroundColor', value as CTABandBlockProps['backgroundColor'])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary (Teal)</SelectItem>
            <SelectItem value="secondary">Secondary (Purple)</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-text-tertiary">
          Use block appearance controls for more customization
        </p>
      </div>
    </div>
  );
}

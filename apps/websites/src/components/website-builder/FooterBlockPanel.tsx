'use client';

/**
 * FooterBlockPanel Component
 *
 * A dedicated panel for editing the site footer when selected as a "block" in the Page Blocks sidebar.
 * Includes footer variant selection, color customization, social links, and page visibility.
 * External links are now managed through the Footer Menu Editor columns.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FooterSelector } from './FooterSelector';
import { PageNavVisibilitySettings } from './PageNavVisibilitySettings';
import { FooterMenuEditor } from './FooterMenuEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  type FooterConfig,
  type FooterVariant,
  type SocialLink,
  type SocialPlatform,
  type ExternalLink,
  type ThemeConfig,
  type PageConfig,
  type FooterMenuColumn,
  socialPlatforms,
} from '@/lib/website-builder/schema';
import {
  pruneFooterMenuForPages,
  hasMenuColumnsV2,
} from '@/lib/website-builder/footer-utils';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Palette,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface FooterBlockPanelProps {
  footerConfig: FooterConfig;
  theme?: ThemeConfig;
  onFooterChange: (variant: FooterVariant) => void;
  onFooterConfigChange: (config: Partial<FooterConfig>) => void;
  onSocialLinksChange: (socialLinks: SocialLink[], showSocial: boolean) => void;
  onExternalLinksChange: (links: ExternalLink[]) => void;
  /** Callback when v2 menu columns are updated */
  onMenuColumnsChange?: (columns: FooterMenuColumn[]) => void;
  /** All pages in the site (for visibility toggles) */
  pages?: PageConfig[];
  /** Callback when pages are updated (visibility toggles) */
  onPagesChange?: (pages: PageConfig[]) => void;
  disabled?: boolean;
}

// =============================================================================
// SOCIAL PLATFORM CONFIG
// =============================================================================

const socialPlatformConfig: Record<SocialPlatform, {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
}> = {
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    placeholder: 'https://facebook.com/yourpage',
  },
  twitter: {
    name: 'Twitter / X',
    icon: Twitter,
    placeholder: 'https://twitter.com/yourhandle',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    placeholder: 'https://instagram.com/yourhandle',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    placeholder: 'https://linkedin.com/company/yourcompany',
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    placeholder: 'https://youtube.com/@yourchannel',
  },
  tiktok: {
    name: 'TikTok',
    icon: ({ className }: { className?: string }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    placeholder: 'https://tiktok.com/@yourhandle',
  },
};

// =============================================================================
// SOCIAL LINK ITEM
// =============================================================================

interface SocialLinkItemProps {
  link: SocialLink;
  onUpdate: (link: SocialLink) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function SocialLinkItem({ link, onUpdate, onRemove, disabled }: SocialLinkItemProps) {
  const config = socialPlatformConfig[link.platform];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-background-primary flex items-center justify-center">
        <Icon className="w-4 h-4 text-text-secondary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <Label className="text-xs text-text-tertiary mb-1 block">
          {config.name}
        </Label>
        <Input
          value={link.url}
          onChange={(e) => onUpdate({ ...link, url: e.target.value })}
          placeholder={config.placeholder}
          disabled={disabled}
          className="h-8 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={link.enabled !== false}
          onCheckedChange={(enabled) => onUpdate({ ...link, enabled })}
          disabled={disabled}
          className="scale-75"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          className="h-8 w-8 text-text-tertiary hover:text-status-error"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// ADD SOCIAL LINK SELECTOR
// =============================================================================

interface AddSocialLinkProps {
  existingPlatforms: SocialPlatform[];
  onAdd: (platform: SocialPlatform) => void;
  disabled?: boolean;
}

function AddSocialLink({ existingPlatforms, onAdd, disabled }: AddSocialLinkProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const availablePlatforms = socialPlatforms.filter(
    p => !existingPlatforms.includes(p)
  );

  if (availablePlatforms.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Social Link
        {isOpen ? (
          <ChevronUp className="w-4 h-4 ml-2" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-2" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background-primary border border-border-primary rounded-lg shadow-lg z-10 p-2">
          <div className="grid grid-cols-2 gap-2">
            {availablePlatforms.map((platform) => {
              const config = socialPlatformConfig[platform];
              const Icon = config.icon;
              return (
                <button
                  key={platform}
                  onClick={() => {
                    onAdd(platform);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-secondary text-left transition-colors"
                >
                  <Icon className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm text-text-primary">{config.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function FooterBlockPanel({
  footerConfig,
  theme,
  onFooterChange,
  onFooterConfigChange,
  onSocialLinksChange,
  onExternalLinksChange,
  onMenuColumnsChange,
  pages,
  onPagesChange,
  disabled,
}: FooterBlockPanelProps) {
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const socialLinks = footerConfig?.socialLinks || [];
  const showSocial = footerConfig?.showSocial ?? true;
  const menuColumns = footerConfig?.menuColumns || [];
  
  // Determine footer variant
  const isMinimalFooter = footerConfig?.variant === 'minimal';
  const isMultiColumnFooter = footerConfig?.variant === 'multi-column' || !footerConfig?.variant;
  
  // Check if footer has appearance customizations
  const hasAppearanceCustomizations = 
    footerConfig?.useThemeColors === false ||
    Boolean(footerConfig?.backgroundColor) ||
    Boolean(footerConfig?.textColor);

  // Handle menu columns change
  const handleMenuColumnsChange = useCallback((columns: FooterMenuColumn[]) => {
    if (onMenuColumnsChange) {
      onMenuColumnsChange(columns);
    } else {
      // Fallback: update via onFooterConfigChange
      onFooterConfigChange({ menuColumns: columns });
    }
  }, [onMenuColumnsChange, onFooterConfigChange]);

  // Prune menu columns when pages change (auto-remove items for disabled/hidden pages)
  const handlePagesChange = useCallback((updatedPages: PageConfig[]) => {
    // First, call the original pages change handler
    if (onPagesChange) {
      onPagesChange(updatedPages);
    }

    // Then, prune menu columns if we have v2 menus
    if (hasMenuColumnsV2(footerConfig) && footerConfig.menuColumns) {
      const prunedColumns = pruneFooterMenuForPages(
        footerConfig.menuColumns,
        updatedPages
      );
      
      // Only update if something changed
      if (JSON.stringify(prunedColumns) !== JSON.stringify(footerConfig.menuColumns)) {
        handleMenuColumnsChange(prunedColumns);
      }
    }
  }, [onPagesChange, footerConfig, handleMenuColumnsChange]);

  // Handlers for social links
  const handleAddSocialLink = (platform: SocialPlatform) => {
    const newLink: SocialLink = {
      id: `social-${platform}-${Date.now()}`,
      platform,
      url: '',
      enabled: true,
    };
    onSocialLinksChange([...socialLinks, newLink], showSocial);
  };

  const handleUpdateSocialLink = (index: number, link: SocialLink) => {
    const updated = [...socialLinks];
    updated[index] = link;
    onSocialLinksChange(updated, showSocial);
  };

  const handleRemoveSocialLink = (index: number) => {
    const updated = socialLinks.filter((_, i) => i !== index);
    onSocialLinksChange(updated, showSocial);
  };

  const handleShowSocialChange = (show: boolean) => {
    onSocialLinksChange(socialLinks, show);
  };

  const existingPlatforms = socialLinks.map(l => l.platform);

  return (
    <div className="h-full flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          {/* Branding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Branding
          </CardTitle>
          <p className="text-xs text-text-tertiary mt-1">
            Customize your footer branding elements
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="footer-tagline">Tagline</Label>
            <Input
              id="footer-tagline"
              value={footerConfig?.tagline || ''}
              onChange={(e) => onFooterConfigChange({ tagline: e.target.value || undefined })}
              placeholder="Enter footer tagline (e.g., Quality healthcare for you and your family)"
              disabled={disabled}
            />
            <p className="text-xs text-text-tertiary">
              This tagline appears below your logo in the footer
            </p>
          </div>
        </CardContent>
      </Card>

          {/* Page Visibility in Footer Navigation */}
          {pages && pages.length > 0 && onPagesChange && (
            <PageNavVisibilitySettings
              pages={pages}
              mode="footer"
              onPagesChange={handlePagesChange}
              disabled={disabled}
            />
          )}

          {/* Footer Menu Sections (v2) - Only for multi-column footer */}
          {isMultiColumnFooter && pages && pages.length > 0 && (
            <FooterMenuEditor
              menuColumns={menuColumns}
              onMenuColumnsChange={handleMenuColumnsChange}
              pages={pages}
              disabled={disabled}
            />
          )}

          {/* Social Media Links */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Social Media Links
                </CardTitle>
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <span>Show in footer</span>
                  <Switch
                    checked={showSocial}
                    onCheckedChange={handleShowSocialChange}
                    disabled={disabled}
                  />
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {socialLinks.length === 0 ? (
                <p className="text-sm text-text-tertiary text-center py-4">
                  No social media links added yet
                </p>
              ) : (
                socialLinks.map((link, index) => (
                  <SocialLinkItem
                    key={link.id}
                    link={link}
                    onUpdate={(updated) => handleUpdateSocialLink(index, updated)}
                    onRemove={() => handleRemoveSocialLink(index)}
                    disabled={disabled || !showSocial}
                  />
                ))
              )}
              
              <AddSocialLink
                existingPlatforms={existingPlatforms}
                onAdd={handleAddSocialLink}
                disabled={disabled}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appearance Section (collapsible) */}
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
            <div className="px-4 pb-4">
              <FooterSelector
                selectedVariant={footerConfig?.variant}
                onSelect={onFooterChange}
                backgroundColor={footerConfig?.backgroundColor}
                textColor={footerConfig?.textColor}
                useThemeColors={footerConfig?.useThemeColors ?? true}
                onBackgroundColorChange={(color) => onFooterConfigChange({ backgroundColor: color })}
                onTextColorChange={(color) => onFooterConfigChange({ textColor: color })}
                onUseThemeColorsChange={(use) => onFooterConfigChange({ useThemeColors: use })}
                theme={theme}
                disabled={disabled}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

export default FooterBlockPanel;


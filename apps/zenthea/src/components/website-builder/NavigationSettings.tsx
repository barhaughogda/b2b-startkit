'use client';

/**
 * NavigationSettings Component
 *
 * Configures navigation-related settings including:
 * - Social media links
 * - External footer links
 * - Navigation color customization
 * - Navigation preview
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  type SocialLink,
  type SocialPlatform,
  type ExternalLink,
  type PageConfig,
  socialPlatforms,
  getHeaderNavPages,
  getFooterNavPages,
} from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Plus,
  Trash2,
  ExternalLink as ExternalLinkIcon,
  Link,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface NavigationSettingsProps {
  pages: PageConfig[];
  socialLinks: SocialLink[];
  showSocial: boolean;
  externalLinks: ExternalLink[];
  onSocialLinksChange: (links: SocialLink[]) => void;
  onShowSocialChange: (show: boolean) => void;
  onExternalLinksChange: (links: ExternalLink[]) => void;
  disabled?: boolean;
}

// =============================================================================
// SOCIAL PLATFORM CONFIG
// =============================================================================

const socialPlatformConfig: Record<SocialPlatform, {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  baseUrl: string;
}> = {
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    placeholder: 'https://facebook.com/yourpage',
    baseUrl: 'https://facebook.com/',
  },
  twitter: {
    name: 'Twitter / X',
    icon: Twitter,
    placeholder: 'https://twitter.com/yourhandle',
    baseUrl: 'https://twitter.com/',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    placeholder: 'https://instagram.com/yourhandle',
    baseUrl: 'https://instagram.com/',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    placeholder: 'https://linkedin.com/company/yourcompany',
    baseUrl: 'https://linkedin.com/',
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    placeholder: 'https://youtube.com/@yourchannel',
    baseUrl: 'https://youtube.com/',
  },
  tiktok: {
    name: 'TikTok',
    icon: ({ className }: { className?: string }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    placeholder: 'https://tiktok.com/@yourhandle',
    baseUrl: 'https://tiktok.com/',
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated border border-border-primary rounded-lg shadow-lg z-10 p-2">
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
// EXTERNAL LINK ITEM
// =============================================================================

interface ExternalLinkItemProps {
  link: ExternalLink;
  onUpdate: (link: ExternalLink) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function ExternalLinkItem({ link, onUpdate, onRemove, disabled }: ExternalLinkItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-surface-secondary rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-background-primary flex items-center justify-center mt-1">
        <ExternalLinkIcon className="w-4 h-4 text-text-secondary" />
      </div>
      
      <div className="flex-1 space-y-2">
        <div>
          <Label className="text-xs text-text-tertiary mb-1 block">
            Link Text
          </Label>
          <Input
            value={link.label}
            onChange={(e) => onUpdate({ ...link, label: e.target.value })}
            placeholder="e.g., Blog"
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-text-tertiary mb-1 block">
            URL
          </Label>
          <Input
            value={link.url}
            onChange={(e) => onUpdate({ ...link, url: e.target.value })}
            placeholder="https://example.com"
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
          <Switch
            checked={link.openInNewTab !== false}
            onCheckedChange={(openInNewTab) => onUpdate({ ...link, openInNewTab })}
            disabled={disabled}
            className="scale-75"
          />
          <span>Open in new tab</span>
        </label>
      </div>

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
  );
}

// =============================================================================
// NAVIGATION PREVIEW
// =============================================================================

interface NavigationPreviewProps {
  pages: PageConfig[];
  showHeader?: boolean;
}

function NavigationPreview({ pages, showHeader = true }: NavigationPreviewProps) {
  const headerPages = getHeaderNavPages(pages);
  const footerPages = getFooterNavPages(pages);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Navigation Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showHeader && (
          <div>
            <Label className="text-xs text-text-tertiary mb-2 block">
              Header Navigation
            </Label>
            <div className="flex flex-wrap gap-2">
              {headerPages.length > 0 ? (
                headerPages.map((page) => (
                  <Badge key={page.id} variant="secondary">
                    {page.title}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-text-tertiary italic">
                  No pages in header
                </span>
              )}
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs text-text-tertiary mb-2 block">
            Footer Navigation
          </Label>
          <div className="flex flex-wrap gap-2">
            {footerPages.length > 0 ? (
              footerPages.map((page) => (
                <Badge key={page.id} variant="outline">
                  {page.title}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-text-tertiary italic">
                No pages in footer
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function NavigationSettings({
  pages,
  socialLinks,
  showSocial,
  externalLinks,
  onSocialLinksChange,
  onShowSocialChange,
  onExternalLinksChange,
  disabled,
}: NavigationSettingsProps) {
  // Handlers for social links
  const handleAddSocialLink = (platform: SocialPlatform) => {
    const newLink: SocialLink = {
      id: `social-${platform}-${Date.now()}`,
      platform,
      url: '',
      enabled: true,
    };
    onSocialLinksChange([...socialLinks, newLink]);
  };

  const handleUpdateSocialLink = (index: number, link: SocialLink) => {
    const updated = [...socialLinks];
    updated[index] = link;
    onSocialLinksChange(updated);
  };

  const handleRemoveSocialLink = (index: number) => {
    const updated = socialLinks.filter((_, i) => i !== index);
    onSocialLinksChange(updated);
  };

  // Handlers for external links
  const handleAddExternalLink = () => {
    const newLink: ExternalLink = {
      id: `external-${Date.now()}`,
      label: '',
      url: '',
      openInNewTab: true,
    };
    onExternalLinksChange([...externalLinks, newLink]);
  };

  const handleUpdateExternalLink = (index: number, link: ExternalLink) => {
    const updated = [...externalLinks];
    updated[index] = link;
    onExternalLinksChange(updated);
  };

  const handleRemoveExternalLink = (index: number) => {
    const updated = externalLinks.filter((_, i) => i !== index);
    onExternalLinksChange(updated);
  };

  const existingPlatforms = socialLinks.map(l => l.platform);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">
          Navigation & Links
        </h3>
        <p className="text-sm text-text-secondary">
          Configure social media links and external links for your footer
        </p>
      </div>

      {/* Navigation Preview */}
      <NavigationPreview pages={pages} />

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
                onCheckedChange={onShowSocialChange}
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

      {/* External Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Link className="w-4 h-4" />
            External Links
          </CardTitle>
          <p className="text-xs text-text-tertiary mt-1">
            Add links to external websites in your footer
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {externalLinks.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">
              No external links added yet
            </p>
          ) : (
            externalLinks.map((link, index) => (
              <ExternalLinkItem
                key={link.id}
                link={link}
                onUpdate={(updated) => handleUpdateExternalLink(index, updated)}
                onRemove={() => handleRemoveExternalLink(index)}
                disabled={disabled}
              />
            ))
          )}
          
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={handleAddExternalLink}
            disabled={disabled}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add External Link
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default NavigationSettings;


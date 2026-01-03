'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SiteStructureSelector } from './SiteStructureSelector';
import { ThemeSettings } from './ThemeSettings';
import { PageManager } from './PageManager';
import { UrlDomainSettingsTab } from './UrlDomainSettingsTab';
import {
  type SiteStructure,
  type HeaderVariant,
  type FooterVariant,
  type ThemeConfig,
  type HeaderConfig,
  type FooterConfig,
  type PageConfig,
  type SocialLink,
  type ExternalLink,
} from '@/lib/website-builder/schema';
import { Files, FileText, Palette, Globe } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type TabId = 'structure' | 'pages' | 'theme' | 'domain';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Current values
  siteStructure?: SiteStructure;
  headerConfig?: HeaderConfig;
  footerConfig?: FooterConfig;
  theme?: ThemeConfig;
  pages?: PageConfig[];
  // Callbacks
  onStructureChange: (structure: SiteStructure) => void;
  onHeaderChange: (variant: HeaderVariant) => void;
  onFooterChange: (variant: FooterVariant) => void;
  onHeaderConfigChange?: (config: Partial<HeaderConfig>) => void;
  onFooterConfigChange?: (config: Partial<FooterConfig>) => void;
  onThemeChange: (theme: ThemeConfig) => void;
  onPagesChange?: (pages: PageConfig[]) => void;
  onSocialLinksChange?: (links: SocialLink[], showSocial: boolean) => void;
  onExternalLinksChange?: (links: ExternalLink[]) => void;
  onEditPage?: (pageId: string) => void;
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SettingsModal({
  open,
  onOpenChange,
  siteStructure,
  headerConfig,
  theme,
  pages = [],
  onStructureChange,
  onHeaderConfigChange,
  onThemeChange,
  onPagesChange,
  onEditPage,
  disabled,
}: SettingsModalProps) {
  const [currentTab, setCurrentTab] = useState<TabId>('structure');

  // Determine if we should show the pages tab (only for multi-page sites)
  const showPagesTab = siteStructure === 'multi-page';

  // If switching from multi-page to one-pager while on pages tab, go to structure
  const effectiveTab = currentTab === 'pages' && !showPagesTab ? 'structure' : currentTab;

  const handleStructureSelect = (structure: SiteStructure) => {
    onStructureChange(structure);
  };

  const handlePagesChange = (updatedPages: PageConfig[]) => {
    if (onPagesChange) {
      onPagesChange(updatedPages);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-background-elevated">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-text-primary">
            Site Settings
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure your website structure, pages, theme, and domain.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={effectiveTab}
          onValueChange={(value) => setCurrentTab(value as TabId)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full mb-4" style={{ gridTemplateColumns: showPagesTab ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)' }}>
            <TabsTrigger value="structure" className="flex items-center gap-2">
              <Files className="w-4 h-4" />
              <span className="hidden sm:inline">Structure</span>
            </TabsTrigger>
            {showPagesTab && (
              <TabsTrigger value="pages" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Pages</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Theme</span>
            </TabsTrigger>
            <TabsTrigger value="domain" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Domain</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="structure" className="mt-0 h-full">
              <SiteStructureSelector
                selectedStructure={siteStructure}
                onSelect={handleStructureSelect}
                disabled={disabled}
                hideHeader
              />
            </TabsContent>

            {showPagesTab && (
              <TabsContent value="pages" className="mt-0 h-full">
                <PageManager
                  pages={pages}
                  onPagesChange={handlePagesChange}
                  onEditPage={onEditPage}
                  disabled={disabled}
                />
              </TabsContent>
            )}

            <TabsContent value="theme" className="mt-0 h-full">
              {theme && (
                <ThemeSettings
                  theme={theme}
                  onThemeChange={onThemeChange}
                  headerConfig={headerConfig}
                  onHeaderConfigChange={onHeaderConfigChange}
                  disabled={disabled}
                />
              )}
            </TabsContent>

            <TabsContent value="domain" className="mt-0 h-full">
              <UrlDomainSettingsTab disabled={disabled} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-border-primary">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-interactive-primary hover:bg-interactive-primary-hover"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsModal;

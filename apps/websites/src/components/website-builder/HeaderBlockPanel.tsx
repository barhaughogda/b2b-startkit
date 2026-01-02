'use client';

/**
 * HeaderBlockPanel Component
 *
 * A dedicated panel for editing the site header when selected as a "block" in the Page Blocks sidebar.
 * Includes header variant selection, color customization, and page visibility in header navigation.
 */

import React, { useState, useCallback } from 'react';
import { HeaderSelector } from './HeaderSelector';
import { PageNavVisibilitySettings } from './PageNavVisibilitySettings';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Palette, ChevronDown } from 'lucide-react';
import {
  generateNavItemsFromPages,
  type HeaderConfig,
  type HeaderVariant,
  type PageConfig,
  type SiteStructure,
} from '@/lib/website-builder/schema';

// =============================================================================
// TYPES
// =============================================================================

interface HeaderBlockPanelProps {
  headerConfig: HeaderConfig;
  onHeaderChange: (variant: HeaderVariant) => void;
  onHeaderConfigChange: (config: Partial<HeaderConfig>) => void;
  /** All pages in the site (for visibility toggles) */
  pages?: PageConfig[];
  /** Site structure for nav item generation */
  siteStructure?: SiteStructure;
  /** Callback when pages are updated (visibility toggles) */
  onPagesChange?: (pages: PageConfig[]) => void;
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function HeaderBlockPanel({
  headerConfig,
  onHeaderChange,
  onHeaderConfigChange,
  pages,
  siteStructure = 'multi-page',
  onPagesChange,
  disabled,
}: HeaderBlockPanelProps) {
  // State for Appearance section collapse
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  
  // Check if header has appearance customizations
  const hasAppearanceCustomizations = 
    headerConfig?.useThemeColors === false ||
    Boolean(headerConfig?.backgroundColor) ||
    Boolean(headerConfig?.textColor) ||
    Boolean(headerConfig?.mobileBackgroundColor) ||
    Boolean(headerConfig?.mobileTextColor);

  /**
   * Handle page visibility changes for header navigation.
   * Updates both the pages array AND regenerates header navItems to keep them in sync.
   */
  const handleHeaderPagesChange = useCallback((updatedPages: PageConfig[]) => {
    // First, update the pages via the provided callback
    onPagesChange?.(updatedPages);
    
    // Then, regenerate the header navItems from the updated pages
    const newNavItems = generateNavItemsFromPages(updatedPages, true, siteStructure);
    onHeaderConfigChange({ navItems: newNavItems });
  }, [onPagesChange, onHeaderConfigChange, siteStructure]);

  return (
    <div className="h-full flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          {/* Page Visibility in Header Navigation */}
          {pages && pages.length > 0 && onPagesChange && (
            <PageNavVisibilitySettings
              pages={pages}
              mode="header"
              onPagesChange={handleHeaderPagesChange}
              disabled={disabled}
            />
          )}
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
              <HeaderSelector
                selectedVariant={headerConfig?.variant}
                onSelect={onHeaderChange}
                backgroundColor={headerConfig?.backgroundColor}
                textColor={headerConfig?.textColor}
                mobileBackgroundColor={headerConfig?.mobileBackgroundColor}
                mobileTextColor={headerConfig?.mobileTextColor}
                useThemeColors={headerConfig?.useThemeColors ?? true}
                onBackgroundColorChange={(color) => onHeaderConfigChange({ backgroundColor: color })}
                onTextColorChange={(color) => onHeaderConfigChange({ textColor: color })}
                onMobileBackgroundColorChange={(color) => onHeaderConfigChange({ mobileBackgroundColor: color })}
                onMobileTextColorChange={(color) => onHeaderConfigChange({ mobileTextColor: color })}
                onUseThemeColorsChange={(use) => onHeaderConfigChange({ useThemeColors: use })}
                disabled={disabled}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

export default HeaderBlockPanel;


'use client';

/**
 * PageNavVisibilitySettings Component
 *
 * A shared component for displaying page visibility toggles in header/footer block panels.
 * Shows all pages with a toggle to control whether they appear in the specified navigation area.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  type PageConfig,
  type PageType,
  PAGE_METADATA,
} from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import {
  Home,
  Heart,
  Users,
  MapPin,
  Phone,
  FileText,
  Shield,
  Navigation,
  LayoutGrid,
  Lock,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type VisibilityMode = 'header' | 'footer';

interface PageNavVisibilitySettingsProps {
  pages: PageConfig[];
  mode: VisibilityMode;
  onPagesChange: (pages: PageConfig[]) => void;
  disabled?: boolean;
}

// =============================================================================
// ICON MAP
// =============================================================================

const pageIcons: Record<PageType, React.ComponentType<{ className?: string }>> = {
  home: Home,
  services: Heart,
  team: Users,
  locations: MapPin,
  contact: Phone,
  custom: FileText,
  terms: FileText,
  privacy: Shield,
};

// =============================================================================
// PAGE VISIBILITY ROW
// =============================================================================

interface PageVisibilityRowProps {
  page: PageConfig;
  mode: VisibilityMode;
  onToggle: (checked: boolean) => void;
  disabled?: boolean;
}

function PageVisibilityRow({ page, mode, onToggle, disabled }: PageVisibilityRowProps) {
  const metadata = PAGE_METADATA[page.type];
  const Icon = pageIcons[page.type];
  const isLegalPage = page.type === 'terms' || page.type === 'privacy';
  
  // Determine the current visibility value based on mode
  const isVisible = mode === 'header' ? page.showInHeader : page.showInFooter;
  
  // Legal pages can't be shown in header (per business rule)
  const isLegalHeaderBlocked = mode === 'header' && isLegalPage;
  
  // Determine if toggle should be disabled
  const isToggleDisabled = disabled || !page.enabled || isLegalHeaderBlocked;
  
  // Get help text for disabled state
  const getDisabledReason = (): string | null => {
    if (!page.enabled) return 'Page is disabled in Site Settings';
    if (isLegalHeaderBlocked) return 'Legal pages only appear in footer';
    return null;
  };
  
  const disabledReason = getDisabledReason();

  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 px-3 rounded-lg transition-colors',
        page.enabled ? 'bg-surface-secondary' : 'bg-surface-secondary/50'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Page Icon */}
        <div
          className={cn(
            'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
            page.enabled
              ? 'bg-interactive-primary/10 text-interactive-primary'
              : 'bg-surface-primary text-text-tertiary'
          )}
        >
          <Icon className="w-4 h-4" />
        </div>

        {/* Page Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium truncate',
                page.enabled ? 'text-text-primary' : 'text-text-tertiary'
              )}
            >
              {page.title}
            </span>
            {page.type === 'custom' && (
              <Badge variant="secondary" className="text-xs shrink-0">
                Custom
              </Badge>
            )}
            {isLegalPage && (
              <Badge variant="outline" className="text-xs shrink-0">
                Legal
              </Badge>
            )}
          </div>
          {disabledReason && (
            <p className="text-xs text-text-tertiary mt-0.5 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {disabledReason}
            </p>
          )}
        </div>
      </div>

      {/* Toggle */}
      <Switch
        checked={isVisible}
        onCheckedChange={onToggle}
        disabled={isToggleDisabled}
        className="shrink-0"
        aria-label={`Show ${page.title} in ${mode}`}
      />
    </div>
  );
}

// =============================================================================
// PAGE GROUP
// =============================================================================

interface PageGroupProps {
  title: string;
  pages: PageConfig[];
  mode: VisibilityMode;
  onTogglePage: (pageId: string, checked: boolean) => void;
  disabled?: boolean;
}

function PageGroup({ title, pages, mode, onTogglePage, disabled }: PageGroupProps) {
  if (pages.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-1">
        {title}
      </h4>
      <div className="space-y-1">
        {pages.map((page) => (
          <PageVisibilityRow
            key={page.id}
            page={page}
            mode={mode}
            onToggle={(checked) => onTogglePage(page.id, checked)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PageNavVisibilitySettings({
  pages,
  mode,
  onPagesChange,
  disabled,
}: PageNavVisibilitySettingsProps) {
  // Group pages by type
  const standardPages = pages
    .filter((p) => !['custom', 'terms', 'privacy', 'home'].includes(p.type))
    .sort((a, b) => a.order - b.order);
  
  const homePage = pages.filter((p) => p.type === 'home');
  
  const customPages = pages
    .filter((p) => p.type === 'custom')
    .sort((a, b) => a.order - b.order);
  
  const legalPages = pages
    .filter((p) => p.type === 'terms' || p.type === 'privacy')
    .sort((a, b) => a.order - b.order);

  // Handler for toggling page visibility
  const handleTogglePage = (pageId: string, checked: boolean) => {
    const updatedPages = pages.map((page) => {
      if (page.id === pageId) {
        return {
          ...page,
          ...(mode === 'header' ? { showInHeader: checked } : { showInFooter: checked }),
        };
      }
      return page;
    });
    onPagesChange(updatedPages);
  };

  const modeIcon = mode === 'header' ? Navigation : LayoutGrid;
  const ModeIcon = modeIcon;
  const modeLabel = mode === 'header' ? 'Header Navigation' : 'Footer Navigation';
  const modeDescription = mode === 'header'
    ? 'Choose which pages appear in your site header navigation'
    : 'Choose which pages appear in your site footer links';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ModeIcon className="w-4 h-4" />
          {modeLabel}
        </CardTitle>
        <p className="text-xs text-text-tertiary mt-1">
          {modeDescription}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Home page - separate since it's always enabled */}
        <PageGroup
          title="Home"
          pages={homePage}
          mode={mode}
          onTogglePage={handleTogglePage}
          disabled={disabled}
        />
        
        {/* Standard pages */}
        <PageGroup
          title="Standard Pages"
          pages={standardPages}
          mode={mode}
          onTogglePage={handleTogglePage}
          disabled={disabled}
        />

        {/* Custom pages */}
        {customPages.length > 0 && (
          <PageGroup
            title="Custom Pages"
            pages={customPages}
            mode={mode}
            onTogglePage={handleTogglePage}
            disabled={disabled}
          />
        )}

        {/* Legal pages */}
        <PageGroup
          title="Legal Pages"
          pages={legalPages}
          mode={mode}
          onTogglePage={handleTogglePage}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}

export default PageNavVisibilitySettings;


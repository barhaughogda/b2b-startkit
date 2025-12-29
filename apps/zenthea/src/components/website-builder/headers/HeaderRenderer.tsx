'use client';

/**
 * Header Renderer
 * 
 * Dynamically renders website headers based on variant selection.
 */

import React, { Suspense, lazy, useMemo } from 'react';
import { HeaderVariant, HeaderConfig } from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface HeaderRendererProps {
  /** Header configuration */
  config: HeaderConfig;
  /** Tenant ID for context */
  tenantId?: string;
  /** Whether in preview/edit mode */
  isPreview?: boolean;
  /** Whether in editing mode (alias for isPreview) */
  isEditing?: boolean;
  /** Tenant name for logo alt */
  tenantName?: string;
  /** Theme configuration */
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    cornerRadius?: string;
  };
  /** Callback when a nav link is clicked in edit mode */
  onNavigate?: (pageId: string) => void;
}

export interface HeaderComponentProps {
  config: HeaderConfig;
  tenantId?: string;
  isPreview?: boolean;
  tenantName?: string;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    cornerRadius?: string;
  };
  onNavigate?: (pageId: string) => void;
}

// =============================================================================
// LAZY LOADING
// =============================================================================

const headerComponents: Record<HeaderVariant, React.LazyExoticComponent<React.ComponentType<HeaderComponentProps>>> = {
  'sticky-simple': lazy(() => import('./StickySimpleHeader')),
  'centered': lazy(() => import('./CenteredHeader')),
  'info-bar': lazy(() => import('./InfoBarHeader')),
};

function HeaderLoader() {
  return (
    <div className="h-16 bg-surface-primary flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
    </div>
  );
}

// =============================================================================
// HEADER RENDERER
// =============================================================================

export function HeaderRenderer({
  config,
  tenantId,
  isPreview = false,
  isEditing = false,
  tenantName,
  theme,
  onNavigate,
}: HeaderRendererProps) {
  const HeaderComponent = useMemo(() => {
    return headerComponents[config.variant] || headerComponents['sticky-simple'];
  }, [config.variant]);

  // Use isEditing as alias for isPreview
  const previewMode = isPreview || isEditing;

  return (
    <Suspense fallback={<HeaderLoader />}>
      <HeaderComponent
        config={config}
        tenantId={tenantId}
        isPreview={previewMode}
        tenantName={tenantName}
        theme={theme}
        onNavigate={onNavigate}
      />
    </Suspense>
  );
}

export default HeaderRenderer;

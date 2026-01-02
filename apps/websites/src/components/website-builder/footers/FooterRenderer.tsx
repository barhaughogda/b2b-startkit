'use client';

import React from 'react';
import type { FooterConfig, PageConfig, SiteStructure } from '@/lib/website-builder/schema';
import { MultiColumnFooter } from './MultiColumnFooter';
import { MinimalFooter } from './MinimalFooter';

// =============================================================================
// TYPES
// =============================================================================

export interface FooterRendererProps {
  config: FooterConfig;
  tenantName?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  logoUrl?: string;
  isEditing?: boolean;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    cornerRadius: string;
  };
  /** Pages for resolving v2 menu columns */
  pages?: PageConfig[];
  /** Site structure for URL generation */
  siteStructure?: SiteStructure;
  /** Base path for URLs */
  basePath?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function FooterRenderer({
  config,
  tenantName,
  contactInfo,
  logoUrl,
  isEditing,
  theme,
  pages,
  siteStructure,
  basePath,
}: FooterRendererProps) {
  const commonProps = {
    config,
    tenantName,
    contactInfo,
    logoUrl,
    isEditing,
    theme,
  };

  // Props needed for v2 menu resolution (only MultiColumnFooter uses these)
  const v2Props = {
    pages,
    siteStructure,
    basePath,
  };

  switch (config.variant) {
    case 'multi-column':
      return <MultiColumnFooter {...commonProps} {...v2Props} />;
    case 'minimal':
      return <MinimalFooter {...commonProps} />;
    default:
      return <MultiColumnFooter {...commonProps} {...v2Props} />;
  }
}

export default FooterRenderer;

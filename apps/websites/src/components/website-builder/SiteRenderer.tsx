'use client';

import React from 'react';
import type {
  HeaderConfig,
  FooterConfig,
  ThemeConfig,
  BlockInstance,
  SiteStructure,
  PageConfig,
} from '@/lib/website-builder/schema';
import { TemplateRenderer } from '@/components/website-templates';
import { transformFooterWithTenantData, type TenantFooterData } from '@/lib/website-builder/footer-utils';

// =============================================================================
// TYPES
// =============================================================================

export interface SiteRendererProps {
  /** Website definition from database */
  websiteBuilder: {
    version: string;
    /** Site structure type - determines navigation behavior */
    siteStructure?: SiteStructure;
    /** @deprecated Use siteStructure instead */
    templateId: string;
    header: HeaderConfig;
    footer: FooterConfig;
    theme: ThemeConfig;
    blocks: BlockInstance[];
    /** Pages for multi-page sites */
    pages?: PageConfig[];
    seo?: {
      title?: string;
      description?: string;
    };
  };
  /** Tenant name */
  tenantName?: string;
  /** Tenant ID for data fetching */
  tenantId?: string;
  /** Tenant slug for URL generation */
  tenantSlug?: string;
  /** Logo URL */
  logoUrl?: string;
  /** Contact info */
  contactInfo?: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  /** Booking URL override */
  bookUrl?: string;
  /** Booking button text override */
  bookText?: string;
  /** Base path for navigation links (e.g., '/clinic/my-clinic') */
  basePath?: string;
  /** Tenant data for populating footer with real data */
  tenantFooterData?: TenantFooterData;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SiteRenderer - Renders a complete website from the builder configuration
 * 
 * This component takes the stored website definition and renders the full site
 * including header, blocks, and footer.
 * 
 * For multi-page sites, navigation links are transformed to use the basePath.
 * For one-pager sites, navigation uses anchor links.
 */
export function SiteRenderer({
  websiteBuilder,
  tenantName,
  tenantId,
  tenantSlug,
  logoUrl,
  contactInfo,
  bookUrl,
  bookText,
  basePath = '',
  tenantFooterData,
}: SiteRendererProps) {
  const siteStructure = websiteBuilder.siteStructure || 'multi-page';
  
  // Transform navigation items to use proper paths for multi-page sites
  const transformedHeader = React.useMemo(() => {
    if (siteStructure === 'one-pager' || !basePath) {
      return websiteBuilder.header;
    }
    
    // For multi-page sites, prefix page URLs with basePath
    const transformedNavItems = websiteBuilder.header.navItems.map(item => {
      // Skip external links and anchor links
      if (item.isExternal || item.href.startsWith('#')) {
        return item;
      }
      
      // Skip special paths that shouldn't be prefixed
      if (item.href.startsWith('/login') || item.href.startsWith('/book')) {
        return item;
      }
      
      // Prefix internal page URLs with basePath
      const href = item.href === '/' 
        ? basePath 
        : `${basePath}${item.href}`;
      
      return { ...item, href };
    });
    
    return {
      ...websiteBuilder.header,
      navItems: transformedNavItems,
    };
  }, [websiteBuilder.header, siteStructure, basePath]);

  // Transform footer with real tenant data
  const transformedFooter = React.useMemo(() => {
    let footer = websiteBuilder.footer;

    // If tenant data is provided, transform footer columns with real data
    if (tenantFooterData) {
      footer = transformFooterWithTenantData(footer, {
        ...tenantFooterData,
        siteStructure,
        basePath,
      });
    }

    // Transform URLs for multi-page sites
    if (siteStructure === 'multi-page' && basePath) {
      const transformedColumns = footer.columns.map(column => ({
        ...column,
        links: column.links.map(link => {
          // Skip external links and anchor links
          if (link.isExternal || link.href.startsWith('#') || link.href.startsWith('http')) {
            return link;
          }
          
          // Skip special paths
          if (link.href.startsWith('/login') || link.href.startsWith('/book')) {
            return link;
          }
          
          // Prefix internal URLs with basePath
          const href = link.href === '/'
            ? basePath
            : `${basePath}${link.href}`;
          
          return { ...link, href };
        }),
      }));
      
      // Transform legal links
      const transformedLegalLinks = footer.legalLinks.map(link => {
        if (link.href.startsWith('http') || link.href.startsWith('#')) {
          return link;
        }
        
        const href = `${basePath}${link.href}`;
        return { ...link, href };
      });
      
      footer = {
        ...footer,
        columns: transformedColumns,
        legalLinks: transformedLegalLinks,
      };
    }
    
    return footer;
  }, [websiteBuilder.footer, siteStructure, basePath, tenantFooterData]);

  const zentheaAppUrl = process.env.NEXT_PUBLIC_ZENTHEA_APP_URL || 'https://app.zenthea.ai';
  const effectiveBookUrl = React.useMemo(() => {
    const rawUrl = bookUrl || websiteBuilder.header.bookUrl || '/book';
    if (rawUrl.startsWith('http')) return rawUrl;
    
    // For tenant sites, the booking URL should point to the secure portal
    // Example: https://app.zenthea.ai/clinic/[slug]/book
    if (rawUrl === '/book' && tenantSlug) {
      return `${zentheaAppUrl}/clinic/${tenantSlug}/book`;
    }
    
    return rawUrl.startsWith('/') ? `${zentheaAppUrl}${rawUrl}` : rawUrl;
  }, [bookUrl, websiteBuilder.header.bookUrl, zentheaAppUrl, tenantSlug]);

  return (
    <TemplateRenderer
      templateId={websiteBuilder.templateId as 'classic-stacked'}
      header={transformedHeader}
      footer={transformedFooter}
      theme={websiteBuilder.theme}
      blocks={websiteBuilder.blocks}
      tenantName={tenantName}
      tenantId={tenantId}
      logoUrl={logoUrl}
      contactInfo={contactInfo}
      isEditing={false}
      showMobileBookingCTA={true}
      bookUrl={effectiveBookUrl}
      bookText={bookText || websiteBuilder.header.bookText}
      pages={websiteBuilder.pages}
    />
  );
}

export default SiteRenderer;

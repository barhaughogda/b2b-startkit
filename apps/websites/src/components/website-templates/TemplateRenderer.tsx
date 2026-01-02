'use client';

import React, { useEffect, useMemo } from 'react';
import type { TemplateId, BlockInstance, ThemeConfig, HeaderConfig, FooterConfig, PageConfig, SiteStructure } from '@/lib/website-builder/schema';
import { BlocksRenderer } from '@/components/website-blocks';
import { HeaderRenderer } from '@/components/website-builder/headers';
import { FooterRenderer } from '@/components/website-builder/footers';
import { MobileBookingCTA } from '@/components/website-builder/MobileBookingCTA';
import { SkipLinks } from '@/components/website-builder/SkipLinks';
import type { BlockComponentProps } from '@/components/website-blocks/block-registry';
import { cn } from '@/lib/utils';
import { SKIP_LINK_TARGETS } from '@/lib/website-builder/accessibility';
import { getThemeStyles, getFontUrl } from '@/lib/website-builder/theme-utils';
import { resolveFooterWithPages } from '@/lib/website-builder/footer-utils';

// =============================================================================
// TYPES
// =============================================================================

export interface TemplateRendererProps {
  /** Template ID to render */
  templateId: TemplateId;
  /** Header configuration */
  header: HeaderConfig;
  /** Footer configuration */
  footer: FooterConfig;
  /** Theme configuration */
  theme: ThemeConfig;
  /** Blocks to render */
  blocks: BlockInstance[];
  /** Tenant name for branding */
  tenantName?: string;
  /** Tenant ID for data fetching */
  tenantId?: string;
  /** Logo URL */
  logoUrl?: string;
  /** Contact info for footer/blocks */
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
  /** Whether in edit mode */
  isEditing?: boolean;
  /** Currently selected block ID (for editing) */
  selectedBlockId?: string | null;
  /** Callback when a block is selected */
  onSelectBlock?: (blockId: string) => void;
  /** Whether to show mobile booking CTA */
  showMobileBookingCTA?: boolean;
  /** Booking URL for mobile CTA */
  bookUrl?: string;
  /** Booking button text for mobile CTA */
  bookText?: string;
  /** Callback when navigation link is clicked in edit mode */
  onNavigate?: (pageId: string) => void;
  /** Pages configuration for multi-page support */
  pages?: PageConfig[];
  /** Currently active page ID */
  activePageId?: string;
  /** Site structure type */
  siteStructure?: SiteStructure;
  /** Base path for URLs (e.g., '/clinic/my-clinic') */
  basePath?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TemplateRenderer({
  templateId,
  header,
  footer,
  theme,
  blocks,
  tenantName,
  tenantId,
  logoUrl,
  contactInfo,
  isEditing = false,
  selectedBlockId,
  onSelectBlock,
  showMobileBookingCTA = true,
  bookUrl,
  bookText,
  onNavigate,
  pages,
  activePageId,
  siteStructure,
  basePath = '',
}: TemplateRendererProps) {
  // Resolve footer links with current pages state
  // This ensures footer menus update when pages are toggled, renamed, or have slugs changed
  const resolvedFooter = useMemo(() => {
    if (!pages || pages.length === 0) {
      return footer;
    }
    
    // Infer site structure from pages if not provided
    const effectiveSiteStructure = siteStructure || (pages.length > 0 ? 'multi-page' : 'one-pager');
    
    return resolveFooterWithPages(footer, {
      pages,
      siteStructure: effectiveSiteStructure,
      basePath,
    });
  }, [footer, pages, siteStructure, basePath]);

  // Convert theme to format expected by blocks
  const blockTheme = {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    accentColor: theme.accentColor || theme.primaryColor,
    backgroundColor: theme.backgroundColor,
    textColor: theme.textColor,
    fontPair: theme.fontPair,
    cornerRadius: theme.cornerRadius,
    sectionSpacing: theme.sectionSpacing,
  };

  const headerTheme = {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    cornerRadius: theme.cornerRadius,
  };

  const footerTheme = {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    cornerRadius: theme.cornerRadius,
  };

  const tenantData = tenantName || tenantId
    ? {
        name: tenantName || '',
        id: tenantId,
        contactInfo: contactInfo || {
          phone: '',
          email: '',
          address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
          },
        },
      }
    : undefined;

  // Generate comprehensive CSS variables from theme
  const themeStyles = getThemeStyles(theme);
  
  // Get Google Fonts URL for selected font pair
  const fontUrl = getFontUrl(theme.fontPair || 'inter-system');

  // Load Google Fonts dynamically
  useEffect(() => {
    const fontLinkId = 'theme-google-fonts';
    let link = document.getElementById(fontLinkId) as HTMLLinkElement | null;
    
    if (!link) {
      link = document.createElement('link');
      link.id = fontLinkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    
    link.href = fontUrl;
    
    return () => {
      // Cleanup is optional - leaving the font loaded is fine
    };
  }, [fontUrl]);

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col',
        theme.colorMode === 'dark' && 'dark'
      )}
      style={themeStyles}
    >
      {/* Skip Links for Keyboard Navigation */}
      {!isEditing && <SkipLinks showBookingLink={header.showBook ?? true} />}

      {/* Header with Navigation Landmark */}
      {/* Logo precedence: header.logoUrl (website builder) > logoUrl prop (tenant branding) */}
      {(() => {
        const effectiveLogoUrl = header.logoUrl || logoUrl;
        return (
          <div
            id={SKIP_LINK_TARGETS.NAVIGATION}
            className={cn(
              'relative',
              isEditing && 'cursor-pointer transition-all',
              isEditing && selectedBlockId === 'header' && 'ring-2 ring-interactive-primary ring-offset-2'
            )}
            onClick={isEditing ? (e) => {
              e.stopPropagation();
              onSelectBlock?.('header');
            } : undefined}
          >
            <HeaderRenderer
              config={{
                ...header,
                logoUrl: effectiveLogoUrl,
              }}
              tenantName={tenantName}
              isEditing={isEditing}
              theme={headerTheme}
              onNavigate={onNavigate}
            />
          </div>
        );
      })()}

      {/* Main Content Landmark */}
      <main 
        id={SKIP_LINK_TARGETS.MAIN_CONTENT}
        className="flex-grow"
        role="main"
        aria-label={`${tenantName || 'Clinic'} main content`}
      >
        <BlocksRenderer
          blocks={blocks}
          isEditing={isEditing}
          selectedBlockId={selectedBlockId}
          onSelectBlock={onSelectBlock}
          theme={blockTheme}
          tenantData={tenantData}
          bookUrl={bookUrl || header.bookUrl}
        />
      </main>

      {/* Footer Landmark */}
      {/* Logo precedence: header.logoUrl (website builder) > logoUrl prop (tenant branding) */}
      {(() => {
        const effectiveLogoUrl = header.logoUrl || logoUrl;
        return (
          <div
            id={SKIP_LINK_TARGETS.FOOTER}
            className={cn(
              'relative',
              isEditing && 'cursor-pointer transition-all',
              isEditing && selectedBlockId === 'footer' && 'ring-2 ring-interactive-primary ring-offset-2'
            )}
            onClick={isEditing ? (e) => {
              e.stopPropagation();
              onSelectBlock?.('footer');
            } : undefined}
          >
            <FooterRenderer
              config={resolvedFooter}
              tenantName={tenantName}
              contactInfo={contactInfo}
              logoUrl={effectiveLogoUrl}
              isEditing={isEditing}
              theme={footerTheme}
              pages={pages}
              siteStructure={siteStructure || (pages && pages.length > 0 ? 'multi-page' : 'one-pager')}
              basePath={basePath}
            />
          </div>
        );
      })()}

      {/* Mobile Sticky Booking CTA */}
      {showMobileBookingCTA && !isEditing && (
        <MobileBookingCTA
          bookUrl={bookUrl || header.bookUrl}
          bookText={bookText || header.bookText}
          phoneNumber={contactInfo?.phone}
          primaryColor={theme.primaryColor}
          isPreview={isEditing}
          showPhone={!!contactInfo?.phone}
          tenantName={tenantName}
        />
      )}
    </div>
  );
}

export default TemplateRenderer;

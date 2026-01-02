'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import type { FooterConfig, PageConfig, SiteStructure } from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';
import { getPrimaryColor, getPrimaryTextColor, getSecondaryTextColor, getTertiaryTextColor, getBackgroundColor } from '@/lib/website-builder/theme-utils';
import {
  hasMenuColumnsV2,
  resolveFooterMenuV2,
  type ResolvedFooterMenuColumn,
  type ResolvedFooterMenuSection,
} from '@/lib/website-builder/footer-utils';

// =============================================================================
// TYPES
// =============================================================================

interface MultiColumnFooterProps {
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
  /** Pages for resolving v2 menu columns (optional) */
  pages?: PageConfig[];
  /** Site structure for URL generation */
  siteStructure?: SiteStructure;
  /** Base path for URLs */
  basePath?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const socialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  ),
};

// =============================================================================
// COMPONENT
// =============================================================================

export function MultiColumnFooter({
  config,
  tenantName = 'Clinic',
  contactInfo,
  logoUrl,
  isEditing,
  theme,
  pages = [],
  siteStructure = 'multi-page',
  basePath = '',
}: MultiColumnFooterProps) {
  const currentYear = new Date().getFullYear();

  // Resolve v2 menu columns if present
  const resolvedMenuColumns = useMemo((): ResolvedFooterMenuColumn[] | null => {
    if (!hasMenuColumnsV2(config)) {
      return null;
    }
    return resolveFooterMenuV2(config.menuColumns!, {
      pages,
      siteStructure,
      basePath,
    });
  }, [config, pages, siteStructure, basePath]);

  // Determine if we should use v2 rendering
  const useV2 = resolvedMenuColumns !== null && resolvedMenuColumns.length > 0;

  // Theme colors (fallback)
  const themePrimaryColor = getPrimaryColor(theme);
  const themePrimaryTextColor = getPrimaryTextColor(theme);
  const themeSecondaryTextColor = getSecondaryTextColor(theme);
  const themeTertiaryTextColor = getTertiaryTextColor(theme);

  // Determine which colors to use based on useThemeColors flag
  const useThemeColors = config.useThemeColors ?? true;
  // When useThemeColors is true, use theme's backgroundColor; when false, use custom colors if provided, otherwise fall back to theme colors
  const footerBgColor = useThemeColors 
    ? getBackgroundColor(theme)
    : (config.backgroundColor || getBackgroundColor(theme));
  const footerTextColor = useThemeColors 
    ? themePrimaryTextColor 
    : (config.textColor || themePrimaryTextColor);
  const primaryColor = themePrimaryColor;
  const primaryTextColor = footerTextColor;
  const secondaryTextColor = footerTextColor;
  const tertiaryTextColor = footerTextColor;

  const handleLinkClick = (href: string, isExternal?: boolean) => {
    if (isEditing) return;
    
    if (isExternal) {
      window.open(href, '_blank');
    } else if (href.startsWith('#')) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = href;
    }
  };

  return (
    <footer
      className="border-t border-border-primary"
      style={{ backgroundColor: footerBgColor }}
    >
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            {/* Logo */}
            {config.showLogo && (
              <div className="mb-4">
                {logoUrl ? (
                  // Use regular img for external URLs to avoid next/image domain restrictions
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={`${tenantName} logo`}
                    className="h-10 w-auto object-contain"
                    onError={(e) => {
                      // If image fails to load, hide it and show text fallback
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="font-bold text-xl" style={{ color: primaryTextColor }}>
                    {tenantName}
                  </span>
                )}
              </div>
            )}

            {/* Tagline */}
            {config.tagline && (
              <p className="mb-6 max-w-xs" style={{ color: secondaryTextColor }}>
                {config.tagline}
              </p>
            )}

            {/* Contact Info */}
            {contactInfo && (
              <div className="space-y-2 text-sm" style={{ color: secondaryTextColor }}>
                {contactInfo.address && (
                  <p>
                    {contactInfo.address.street}<br />
                    {contactInfo.address.city}, {contactInfo.address.state} {contactInfo.address.zipCode}
                  </p>
                )}
                {contactInfo.phone && (
                  <p>
                    <a
                      href={isEditing ? undefined : `tel:${contactInfo.phone}`}
                      className="transition-colors"
                      style={{ ['--hover-color' as string]: primaryColor }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                      onClick={(e) => isEditing && e.preventDefault()}
                    >
                      {contactInfo.phone}
                    </a>
                  </p>
                )}
                {contactInfo.email && (
                  <p>
                    <a
                      href={isEditing ? undefined : `mailto:${contactInfo.email}`}
                      className="transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                      onClick={(e) => isEditing && e.preventDefault()}
                    >
                      {contactInfo.email}
                    </a>
                  </p>
                )}
              </div>
            )}

            {/* Social Links */}
            {config.showSocial && config.socialLinks && config.socialLinks.length > 0 && (
              <div className="flex gap-4 mt-6">
                {config.socialLinks.map((social) => {
                  const Icon = socialIcons[social.platform] || Facebook;
                  return (
                    <a
                      key={social.id}
                      href={isEditing ? undefined : social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'w-10 h-10 rounded-lg bg-surface-interactive flex items-center justify-center',
                        'text-text-secondary transition-colors',
                        isEditing && 'pointer-events-none'
                      )}
                      aria-label={`Visit our ${social.platform} page`}
                      onClick={(e) => isEditing && e.preventDefault()}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = primaryColor;
                        e.currentTarget.style.backgroundColor = `${primaryColor}1a`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '';
                        e.currentTarget.style.backgroundColor = '';
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Link Columns - V2 (sections per column) or Legacy (single title per column) */}
          {useV2 ? (
            // V2 rendering: columns with multiple sections
            resolvedMenuColumns!.map((column) => (
              <div key={column.id} className="space-y-6">
                {column.sections.map((section) => (
                  <div key={section.id}>
                    <h3 className="font-semibold mb-4" style={{ color: primaryTextColor }}>
                      {section.title}
                    </h3>
                    <ul className="space-y-3">
                      {section.items.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => handleLinkClick(item.href, item.isExternal)}
                            className={cn(
                              'transition-colors text-sm text-left',
                              isEditing && 'pointer-events-none'
                            )}
                            style={{ color: secondaryTextColor }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = secondaryTextColor)}
                          >
                            {item.label}
                            {item.isExternal && (
                              <span className="ml-1 text-xs opacity-60">↗</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))
          ) : (
            // Legacy rendering: single title per column
            config.columns?.map((column) => (
              <div key={column.id}>
                <h3 className="font-semibold mb-4" style={{ color: primaryTextColor }}>
                  {column.title}
                </h3>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.id}>
                      <button
                        onClick={() => handleLinkClick(link.href, link.isExternal)}
                        className={cn(
                          'transition-colors text-sm text-left',
                          isEditing && 'pointer-events-none'
                        )}
                        style={{ color: secondaryTextColor }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = secondaryTextColor)}
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}

          {/* Newsletter (Optional) */}
          {config.showNewsletter && (
            <div>
              <h3 className="font-semibold mb-4" style={{ color: primaryTextColor }}>
                {config.newsletterTitle || 'Stay Updated'}
              </h3>
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => e.preventDefault()}
              >
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="px-4 py-2 rounded-lg border border-border-primary bg-background-primary focus:outline-none focus:ring-2 focus:ring-interactive-primary"
                  style={{ 
                    color: primaryTextColor,
                    ['--placeholder-color' as string]: tertiaryTextColor
                  }}
                  disabled={isEditing}
                />
                <button
                  type="submit"
                  className={cn(
                    'px-4 py-2 rounded-lg text-white font-medium transition-colors hover:opacity-90',
                    isEditing && 'pointer-events-none'
                  )}
                  style={{ backgroundColor: primaryColor }}
                  disabled={isEditing}
                >
                  Subscribe
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border-primary">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-sm text-center md:text-left" style={{ color: tertiaryTextColor }}>
              {config.copyrightText || `© ${currentYear} ${tenantName}. All rights reserved.`}
            </p>

            {/* Legal Links */}
            {config.legalLinks && config.legalLinks.length > 0 && (
              <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6" aria-label="Legal">
                {config.legalLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    className={cn(
                      'text-sm transition-colors',
                      isEditing && 'pointer-events-none'
                    )}
                    style={{ color: tertiaryTextColor }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = primaryTextColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = tertiaryTextColor;
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* Powered By */}
            {config.poweredByZenthea && (
              <p className="text-xs" style={{ color: tertiaryTextColor }}>
                Powered by{' '}
                <a
                  href="https://zenthea.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'transition-colors',
                    isEditing && 'pointer-events-none'
                  )}
                  onClick={(e) => isEditing && e.preventDefault()}
                  onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = tertiaryTextColor)}
                >
                  Zenthea
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default MultiColumnFooter;

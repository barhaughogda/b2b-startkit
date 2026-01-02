'use client';

import React from 'react';
import Link from 'next/link';
import type { FooterConfig } from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import { Facebook, Twitter, Instagram, Linkedin, Youtube, MapPin, Phone } from 'lucide-react';
import { getPrimaryColor, getPrimaryTextColor, getSecondaryTextColor, getTertiaryTextColor, getBackgroundColor } from '@/lib/website-builder/theme-utils';
import {
  DEFAULT_FOOTER_BACKGROUND,
  DEFAULT_FOOTER_TEXT,
} from '@/lib/website-builder/color-defaults';

// =============================================================================
// TYPES
// =============================================================================

interface MinimalFooterProps {
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

export function MinimalFooter({
  config,
  tenantName = 'Clinic',
  contactInfo,
  logoUrl,
  isEditing,
  theme,
}: MinimalFooterProps) {
  const currentYear = new Date().getFullYear();

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

  return (
    <footer
      className="border-t border-border-primary"
      style={{ backgroundColor: footerBgColor }}
    >
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Name */}
          {config.showLogo && (
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // Use regular img for external URLs to avoid next/image domain restrictions
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={`${tenantName} logo`}
                  className="h-8 w-auto object-contain"
                  onError={(e) => {
                    // If image fails to load, hide it
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <span className="font-bold text-lg" style={{ color: primaryTextColor }}>
                  {tenantName}
                </span>
              )}
            </div>
          )}

          {/* Contact Info - Horizontal */}
          {contactInfo && (
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm" style={{ color: secondaryTextColor }}>
              {contactInfo.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: primaryColor }} aria-hidden="true" />
                  <span>
                    {contactInfo.address.city}, {contactInfo.address.state}
                  </span>
                </div>
              )}
              {contactInfo.phone && (
                <a
                  href={isEditing ? undefined : `tel:${contactInfo.phone}`}
                  className={cn(
                    'flex items-center gap-2 transition-colors',
                    isEditing && 'pointer-events-none'
                  )}
                  onClick={(e) => isEditing && e.preventDefault()}
                  onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                >
                  <Phone className="w-4 h-4" style={{ color: primaryColor }} aria-hidden="true" />
                  <span>{contactInfo.phone}</span>
                </a>
              )}
            </div>
          )}

          {/* Social Links */}
          {config.showSocial && config.socialLinks && config.socialLinks.length > 0 && (
            <div className="flex gap-3">
              {config.socialLinks.map((social) => {
                const Icon = socialIcons[social.platform] || Facebook;
                return (
                  <a
                    key={social.id}
                    href={isEditing ? undefined : social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'w-9 h-9 rounded-full bg-surface-interactive flex items-center justify-center',
                      'transition-colors',
                      isEditing && 'pointer-events-none'
                    )}
                    style={{ color: secondaryTextColor }}
                    aria-label={`Visit our ${social.platform} page`}
                    onClick={(e) => isEditing && e.preventDefault()}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = primaryColor;
                      e.currentTarget.style.backgroundColor = `${primaryColor}1a`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = secondaryTextColor;
                      e.currentTarget.style.backgroundColor = '';
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border-primary">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ color: tertiaryTextColor }}>
            {/* Copyright */}
            <p>
              {config.copyrightText || `© ${currentYear} ${tenantName}. All rights reserved.`}
            </p>

            {/* Legal Links */}
            {config.legalLinks && config.legalLinks.length > 0 && (
              <nav className="flex items-center gap-4" aria-label="Legal">
                {config.legalLinks.map((link, index) => (
                  <React.Fragment key={link.id}>
                    <Link
                      href={link.href}
                      className={cn(
                        'transition-colors',
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
                    {index < config.legalLinks.length - 1 && (
                      <span className="text-border-primary">·</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}

            {/* Powered By */}
            {config.poweredByZenthea && (
              <p>
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

export default MinimalFooter;

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { HeaderConfig } from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import { Menu, X, Phone, Clock, Info } from 'lucide-react';
import { getPrimaryColor, getPrimaryTextColor, getSecondaryTextColor } from '@/lib/website-builder/theme-utils';
import {
  DEFAULT_HEADER_BACKGROUND,
  DEFAULT_HEADER_TEXT,
  DEFAULT_MOBILE_HEADER_BACKGROUND,
  DEFAULT_MOBILE_HEADER_TEXT,
} from '@/lib/website-builder/color-defaults';

// =============================================================================
// TYPES
// =============================================================================

interface InfoBarHeaderProps {
  config: HeaderConfig;
  tenantName?: string;
  isEditing?: boolean;
  isPreview?: boolean;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    cornerRadius?: string;
  };
  onNavigate?: (pageId: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function InfoBarHeader({
  config,
  tenantName = 'Clinic',
  isEditing,
  isPreview,
  theme,
  onNavigate,
}: InfoBarHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Combine isEditing and isPreview for consistency
  const editMode = isEditing || isPreview;

  useEffect(() => {
    if (!config.sticky) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [config.sticky]);

  const cornerRadiusMap: Record<string, string> = {
    none: '0',
    small: '0.25rem',
    medium: '0.5rem',
    large: '0.75rem',
    full: '9999px',
  };
  const buttonRadius = cornerRadiusMap[theme?.cornerRadius || 'medium'];

  // Theme colors (fallback)
  const themePrimaryColor = getPrimaryColor(theme);
  const themePrimaryTextColor = getPrimaryTextColor(theme);
  const themeSecondaryTextColor = getSecondaryTextColor(theme);

  // Determine which colors to use based on useThemeColors flag
  const useThemeColors = config.useThemeColors ?? true;
  const headerBgColor = useThemeColors ? undefined : (config.backgroundColor || DEFAULT_HEADER_BACKGROUND);
  const headerTextColor = useThemeColors ? themePrimaryTextColor : (config.textColor || DEFAULT_HEADER_TEXT);
  const headerLinkColor = useThemeColors ? themeSecondaryTextColor : (config.textColor || DEFAULT_HEADER_TEXT);
  const mobileBgColor = useThemeColors ? undefined : (config.mobileBackgroundColor || DEFAULT_MOBILE_HEADER_BACKGROUND);
  const mobileTextColor = useThemeColors ? themePrimaryTextColor : (config.mobileTextColor || DEFAULT_MOBILE_HEADER_TEXT);
  const primaryColor = themePrimaryColor;

  // Extract page ID from href (e.g., "#services" -> "services", "/team" -> "team")
  const getPageIdFromHref = (href: string): string | null => {
    if (href.startsWith('#')) {
      return href.substring(1);
    }
    if (href.startsWith('/') && href.length > 1) {
      return href.substring(1).split('/')[0] || null;
    }
    return null;
  };

  const handleNavClick = (href: string, isExternal?: boolean, pageId?: string) => {
    // In edit mode, trigger navigation callback instead of actual navigation
    if (editMode) {
      if (onNavigate) {
        const targetPageId = pageId || getPageIdFromHref(href);
        if (targetPageId) {
          onNavigate(targetPageId);
        }
      }
      return;
    }
    
    if (isExternal) {
      window.open(href, '_blank');
    } else if (href.startsWith('#')) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    } else {
      window.location.href = href;
    }
  };

  const handleSignIn = () => {
    if (editMode) return;
    window.location.href = config.signInUrl || '/auth/signin';
  };

  const handleBook = () => {
    if (editMode) return;
    window.location.href = config.bookUrl || '/book';
  };

  const handlePhoneClick = () => {
    if (editMode || !config.infoBarPhone) return;
    window.location.href = `tel:${config.infoBarPhone}`;
  };

  const hasInfoBar = config.infoBarPhone || config.infoBarHours || config.infoBarText;

  return (
    <header
      className={cn(
        'w-full z-50',
        config.sticky && 'fixed top-0 left-0 right-0'
      )}
    >
      {/* Info Bar (Top) */}
      {hasInfoBar && (
        <div
          className={cn(
            'py-2 text-sm transition-all duration-300',
            isScrolled && config.sticky ? 'hidden' : 'block'
          )}
          style={{ backgroundColor: theme?.secondaryColor || 'var(--zenthea-purple)' }}
        >
          <div className="container mx-auto px-4 flex flex-wrap items-center justify-center md:justify-between gap-2 md:gap-4 text-white/90">
            <div className="flex items-center gap-4 md:gap-6">
              {/* Phone */}
              {config.infoBarPhone && (
                <button
                  onClick={handlePhoneClick}
                  className={cn(
                    'flex items-center gap-2 hover:text-white transition-colors',
                    editMode && 'pointer-events-none'
                  )}
                >
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{config.infoBarPhone}</span>
                </button>
              )}

              {/* Hours */}
              {config.infoBarHours && (
                <div className="hidden md:flex items-center gap-2">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span>{config.infoBarHours}</span>
                </div>
              )}
            </div>

            {/* Custom Message */}
            {config.infoBarText && (
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 hidden sm:block" aria-hidden="true" />
                <span>{config.infoBarText}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <div
        className={cn(
          !useThemeColors ? '' : 'bg-background-elevated',
          'transition-all duration-300',
          isScrolled && config.sticky && 'shadow-md'
        )}
        style={!useThemeColors ? { backgroundColor: headerBgColor } : undefined}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link
              href="/"
              className={cn(
                'flex items-center gap-2 flex-shrink-0',
                editMode && 'pointer-events-none'
              )}
            >
              {config.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.logoUrl}
                  alt={config.logoAlt || `${tenantName} logo`}
                  className="h-8 md:h-10 w-auto object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <span className="font-bold text-xl md:text-2xl" style={{ color: headerTextColor }}>
                  {tenantName}
                </span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {config.navItems?.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.href, link.isExternal, link.pageId)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium hover:bg-surface-interactive rounded-md transition-colors',
                    editMode && 'cursor-pointer'
                  )}
                  style={{ color: headerLinkColor }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = headerTextColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = headerLinkColor;
                  }}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {/* Sign In */}
              {config.showSignIn && (
                <Button
                  variant="ghost"
                  onClick={handleSignIn}
                  className={cn(
                    'transition-colors',
                    editMode && 'pointer-events-none'
                  )}
                  style={{
                    borderRadius: 'var(--theme-radius)',
                    color: headerLinkColor
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = headerTextColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = headerLinkColor;
                  }}
                >
                  {config.signInText || 'Sign In'}
                </Button>
              )}

              {/* Book Appointment */}
              {config.showBook && (
                <Button
                  onClick={handleBook}
                  style={{
                    borderRadius: 'var(--theme-radius)',
                    backgroundColor: theme?.primaryColor || 'var(--zenthea-teal)',
                  }}
                  className={cn(
                    'text-white hover:opacity-90',
                    editMode && 'pointer-events-none'
                  )}
                >
                  {config.bookText || 'Book Appointment'}
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-surface-interactive transition-colors"
              style={{ color: headerTextColor }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          'md:hidden absolute top-full left-0 right-0 shadow-lg overflow-hidden transition-all duration-300',
          !useThemeColors ? '' : 'bg-background-elevated',
          isMobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
        style={!useThemeColors ? { backgroundColor: mobileBgColor } : undefined}
      >
        {/* Mobile Info Bar */}
        {hasInfoBar && (
          <div className="px-4 py-3 bg-surface-secondary border-b border-border-primary">
            {config.infoBarPhone && (
              <a
                href={editMode ? undefined : `tel:${config.infoBarPhone}`}
                className="flex items-center gap-2 text-sm mb-2"
                style={{ color: mobileTextColor }}
                onClick={(e) => editMode && e.preventDefault()}
              >
                <Phone className="w-4 h-4 text-interactive-primary" />
                {config.infoBarPhone}
              </a>
            )}
            {config.infoBarHours && (
              <div className="flex items-center gap-2 text-sm" style={{ color: mobileTextColor }}>
                <Clock className="w-4 h-4 text-interactive-primary" />
                {config.infoBarHours}
              </div>
            )}
          </div>
        )}

        <nav className="container mx-auto px-4 py-4 space-y-2" aria-label="Mobile navigation">
          {config.navItems?.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.href, link.isExternal, link.pageId)}
              className="block w-full text-left px-4 py-3 hover:bg-surface-interactive rounded-lg transition-colors"
              style={{ color: mobileTextColor }}
            >
              {link.label}
            </button>
          ))}
          
          <div className="pt-4 border-t border-border-primary space-y-2">
            {config.showSignIn && (
              <Button
                variant="outline"
                className={cn(
                  'w-full',
                  editMode && 'pointer-events-none'
                )}
                onClick={handleSignIn}
                style={{ borderRadius: 'var(--theme-radius)' }}
              >
                {config.signInText || 'Sign In'}
              </Button>
            )}
            {config.showBook && (
              <Button
                className={cn(
                  'w-full',
                  editMode && 'pointer-events-none'
                )}
                onClick={handleBook}
                style={{
                  borderRadius: 'var(--theme-radius)',
                  backgroundColor: theme?.primaryColor || 'var(--zenthea-teal)',
                }}
              >
                {config.bookText || 'Book Appointment'}
              </Button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default InfoBarHeader;

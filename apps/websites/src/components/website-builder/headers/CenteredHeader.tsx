'use client';

/**
 * Centered Header
 * 
 * Logo center, nav links, Book always visible.
 */

import React, { useState } from 'react';
import { HeaderComponentProps } from './HeaderRenderer';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { getPrimaryColor, getPrimaryTextColor, getSecondaryTextColor } from '@/lib/website-builder/theme-utils';
import {
  DEFAULT_HEADER_BACKGROUND,
  DEFAULT_HEADER_TEXT,
  DEFAULT_MOBILE_HEADER_BACKGROUND,
  DEFAULT_MOBILE_HEADER_TEXT,
} from '@/lib/website-builder/color-defaults';

export default function CenteredHeader({
  config,
  tenantId,
  isPreview = false,
  tenantName = 'Clinic',
  theme,
  onNavigate,
}: HeaderComponentProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    logoUrl,
    logoAlt,
    navItems,
    showSignIn,
    signInText,
    signInUrl,
    showBook,
    bookText,
    bookUrl,
    sticky,
    transparent,
  } = config;

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

  const NavLink = ({ 
    href, 
    children, 
    className, 
    onClick, 
    pageId,
    style,
    onMouseEnter,
    onMouseLeave,
  }: { 
    href: string; 
    children: React.ReactNode; 
    className?: string; 
    onClick?: () => void; 
    pageId?: string;
    style?: React.CSSProperties;
    onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void;
    onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void;
  }) => {
    if (isPreview) {
      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onClick) onClick();
        if (onNavigate) {
          const targetPageId = pageId || getPageIdFromHref(href);
          if (targetPageId) {
            onNavigate(targetPageId);
          }
        }
      };
      // Use a span instead of button to avoid nested button issues when wrapping Button components
      return (
        <span 
          role="button"
          tabIndex={0}
          className={cn(className, 'cursor-pointer')} 
          style={style}
          onClick={handleClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick(e as unknown as React.MouseEvent);
            }
          }}
        >
          {children}
        </span>
      );
    }
    return (
      <Link 
        href={href} 
        className={className} 
        onClick={onClick}
        style={style}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </Link>
    );
  };

  // Split nav items for left/right sides
  const leftNav = navItems.slice(0, Math.ceil(navItems.length / 2));
  const rightNav = navItems.slice(Math.ceil(navItems.length / 2));

  return (
    <header
      className={cn(
        'w-full z-50 transition-all duration-300',
        sticky && 'sticky top-0',
        transparent ? 'bg-transparent' : !useThemeColors ? '' : 'bg-background-elevated',
        !transparent && 'border-b border-border-primary',
      )}
      style={!transparent && !useThemeColors ? { backgroundColor: headerBgColor } : undefined}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between h-20">
          {/* Left Nav */}
          <nav className="flex items-center gap-6 flex-1">
            {leftNav.map((item) => (
              <NavLink
                key={item.id}
                href={item.href}
                pageId={item.pageId}
                className="transition-colors font-medium"
                style={{ color: headerLinkColor }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = headerTextColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = headerLinkColor;
                }}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Center Logo */}
          <NavLink href="/" className="flex-shrink-0 mx-8">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={logoAlt || tenantName}
                className="h-12 w-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-2xl font-bold" style={{ color: headerTextColor }}>
                {tenantName}
              </span>
            )}
          </NavLink>

          {/* Right Nav + CTAs */}
          <div className="flex items-center gap-6 flex-1 justify-end">
            {rightNav.map((item) => (
              <NavLink
                key={item.id}
                href={item.href}
                pageId={item.pageId}
                className="transition-colors font-medium"
                style={{ color: headerLinkColor }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = headerTextColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = headerLinkColor;
                }}
              >
                {item.label}
              </NavLink>
            ))}
            {showSignIn && (
              <NavLink href={signInUrl}>
                <Button
                  variant="ghost"
                  size="sm"
                  style={{
                    color: headerLinkColor,
                    borderRadius: 'var(--theme-radius)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = headerTextColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = headerLinkColor;
                  }}
                >
                  {signInText}
                </Button>
              </NavLink>
            )}
            {showBook && (
              <NavLink href={bookUrl}>
                <Button
                  size="sm"
                  className="text-white hover:opacity-90"
                  style={{
                    backgroundColor: primaryColor,
                    borderRadius: 'var(--theme-radius)',
                  }}
                >
                  {bookText}
                </Button>
              </NavLink>
            )}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex items-center justify-between h-16">
          <NavLink href="/" className="flex-shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={logoAlt || tenantName}
                className="h-8 w-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-lg font-bold" style={{ color: headerTextColor }}>
                {tenantName}
              </span>
            )}
          </NavLink>

          <div className="flex items-center gap-2">
            {showBook && (
              <NavLink href={bookUrl}>
                <Button 
                  size="sm" 
                  className="text-white hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Book
                </Button>
              </NavLink>
            )}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-80"
                style={!useThemeColors ? { backgroundColor: mobileBgColor } : undefined}
              >
                <div className="flex flex-col h-full">
                  <div className="mb-8">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt={logoAlt || tenantName} className="h-8 w-auto" onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }} />
                    ) : (
                      <span className="text-lg font-bold" style={{ color: mobileTextColor }}>{tenantName}</span>
                    )}
                  </div>
                  <nav className="flex flex-col gap-4 flex-1">
                    {navItems.map((item) => (
                      <NavLink
                        key={item.id}
                        href={item.href}
                        pageId={item.pageId}
                        className="text-lg py-2 text-left transition-colors"
                        style={{ color: mobileTextColor }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = mobileTextColor;
                          e.currentTarget.style.opacity = '0.7';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = mobileTextColor;
                          e.currentTarget.style.opacity = '1';
                        }}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </nav>
                  <div className="flex flex-col gap-3 pt-8 border-t">
                    {showSignIn && (
                      <NavLink href={signInUrl}>
                        <Button
                          variant="outline"
                          className="w-full"
                          style={{ borderRadius: 'var(--theme-radius)' }}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {signInText}
                        </Button>
                      </NavLink>
                    )}
                    {showBook && (
                      <NavLink href={bookUrl}>
                        <Button
                          className="w-full text-white hover:opacity-90"
                          style={{
                            backgroundColor: primaryColor,
                            borderRadius: 'var(--theme-radius)',
                          }}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {bookText}
                        </Button>
                      </NavLink>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

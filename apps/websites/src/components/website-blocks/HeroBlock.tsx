'use client';

/**
 * Hero Block
 * 
 * Main banner section with headline, tagline, and call-to-action buttons.
 * Supports multiple background types: gradient, solid color, or image.
 */

import React from 'react';
import { HeroBlockProps, type BlockAppearance, type TextToken } from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection, useAppearanceStyles, resolveTextToken } from './BlockSection';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getPrimaryColor, getButtonHoverBgColor, getButtonHoverTextColor } from '@/lib/website-builder/theme-utils';

export interface HeroBlockComponentProps extends BlockComponentProps<HeroBlockProps> {}

// Gradient direction mapping
const gradientDirections: Record<string, string> = {
  'to-r': 'to right',
  'to-l': 'to left',
  'to-t': 'to top',
  'to-b': 'to bottom',
  'to-tr': 'to top right',
  'to-tl': 'to top left',
  'to-br': 'to bottom right',
  'to-bl': 'to bottom left',
};

export default function HeroBlock({
  props,
  isPreview,
  theme,
  bookUrl,
  appearance,
  blockId,
}: HeroBlockComponentProps) {
  const {
    headline,
    tagline,
    primaryCtaText,
    primaryCtaLink,
    secondaryCtaText,
    secondaryCtaLink,
    // Background configuration
    backgroundType = 'gradient',
    backgroundColor = '#5FBFAF',
    gradientFrom: rawGradientFrom = '#5FBFAF',
    gradientTo: rawGradientTo = '#5F284A',
    gradientDirection = 'to-br',
    backgroundImage,
    backgroundOverlay = 0.4,
    alignment = 'center',
    // Text appearance
    headingTextAppearance,
    taglineTextAppearance,
  } = props;

  // Normalize color values (handle uppercase VAR -> var)
  const normalizeColor = (color: any): string => {
    if (typeof color !== 'string') return String(color || '');
    const trimmed = color.trim();
    if (trimmed.toLowerCase().startsWith('var(--')) {
      return trimmed.toLowerCase();
    }
    return trimmed;
  };

  const gradientFrom = normalizeColor(rawGradientFrom);
  const gradientTo = normalizeColor(rawGradientTo);
  const resolvedBgColorValue = normalizeColor(backgroundColor);

  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  // Resolve booking link (use tenant-specific bookUrl as fallback)
  const resolvedPrimaryLink = primaryCtaLink || bookUrl || '/book';
  const resolvedSecondaryLink = secondaryCtaLink || '#services';

  // Determine if background is dark (for text color)
  const isDarkBackground = backgroundType === 'image' || backgroundType === 'gradient';

  // Get theme primary color for buttons on light backgrounds
  const primaryColor = getPrimaryColor(theme);

  // Get appearance styles (appearance text color overrides theme)
  const { textColor: appearanceTextColor, backgroundColor: appearanceBackgroundColor } = useAppearanceStyles(appearance, theme);

  // Resolve text colors from appearance tokens
  const headingColor = headingTextAppearance 
    ? resolveTextToken(
        headingTextAppearance.textToken || 'default',
        headingTextAppearance.textCustom,
        theme
      ) || (isDarkBackground ? '#ffffff' : undefined)
    : appearanceTextColor || (isDarkBackground ? '#ffffff' : undefined);
    
  const taglineColor = taglineTextAppearance
    ? resolveTextToken(
        taglineTextAppearance.textToken || 'default',
        taglineTextAppearance.textCustom,
        theme
      ) || (isDarkBackground ? 'rgba(255, 255, 255, 0.9)' : undefined)
    : appearanceTextColor || (isDarkBackground ? 'rgba(255, 255, 255, 0.9)' : undefined);

  // Determine if we should use light buttons (for dark backgrounds)
  // If appearance is set, check if background is dark; otherwise use isDarkBackground
  const useLightButtons = appearance && appearanceBackgroundColor
    ? isColorDark(appearanceBackgroundColor)
    : isDarkBackground;

  // Helper to determine if a color is dark
  function isColorDark(color: string): boolean {
    const normalized = color.toLowerCase();
    // Simple heuristic: check if it's a common dark color or has low brightness
    const darkColors = ['primary', 'secondary', 'accent', 'var(--zenthea-teal)', 'var(--zenthea-purple)'];
    if (darkColors.includes(normalized)) return true;

    // For hex colors, calculate brightness
    if (normalized.startsWith('#')) {
      const hex = normalized.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 128;
    }

    return false;
  }

  // Build background style
  const getBackgroundStyle = (): React.CSSProperties => {
    switch (backgroundType) {
      case 'solid':
        return { backgroundColor: resolvedBgColorValue };
      case 'gradient':
        return {
          background: `linear-gradient(${gradientDirections[gradientDirection] || 'to bottom right'}, ${gradientFrom}, ${gradientTo})`,
        };
      case 'image':
        return {}; // Image handled separately for overlay support
      default:
        return {};
    }
  };

  return (
    <BlockSection
      appearance={appearance}
      theme={theme}
      blockType="hero"
      as="section"
      blockId={blockId}
      className="min-h-[400px] sm:min-h-[450px] md:min-h-[500px] flex items-center justify-center"
      style={{
        ...getBackgroundStyle(),
        ...(theme ? {
          '--hero-primary': theme.primaryColor,
          '--hero-secondary': theme.secondaryColor,
        } as React.CSSProperties : {}),
      }}
    >
      {/* Background Image with Overlay */}
      {backgroundType === 'image' && backgroundImage && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div 
            className="absolute inset-0 bg-black"
            style={{ opacity: backgroundOverlay }}
          />
        </>
      )}

      {/* Fallback for image type without uploaded image */}
      {backgroundType === 'image' && !backgroundImage && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
      )}

      {/* Content */}
      <div className={cn(
        'relative z-10 w-full max-w-4xl flex flex-col gap-6',
        alignmentClasses[alignment]
      )}>
        {/* Headline */}
        <h1
          className={cn(
            'font-bold tracking-tight',
            !headingColor && (isDarkBackground ? 'text-white' : 'text-text-primary')
          )}
          style={{
            fontSize: 'var(--theme-h1-size)',
            fontFamily: 'var(--theme-font-heading)',
            ...(headingColor ? { color: headingColor } : {}),
          }}
        >
          {headline}
        </h1>

        {/* Tagline */}
        {tagline && (
          <p
            className={cn(
              'text-lg sm:text-xl md:text-2xl max-w-2xl',
              !taglineColor && (isDarkBackground ? 'text-white/90' : 'text-text-secondary')
            )}
            style={{
              fontFamily: 'var(--theme-font-body)',
              ...(taglineColor ? { color: taglineColor } : {}),
            }}
          >
            {tagline}
          </p>
        )}

        {/* CTA Buttons */}
        <div 
          className={cn(
            'flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mt-4 w-full sm:w-auto',
            alignment === 'center' && 'sm:justify-center items-center',
            alignment === 'right' && 'sm:justify-end items-end',
            alignment === 'left' && 'items-start'
          )}
          id="booking-section"
          role="group"
          aria-label="Call to action buttons"
        >
          {primaryCtaText && (
            isPreview ? (
              <Button
                size="lg"
                className={cn(
                  'w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-lg min-h-[48px] focus:ring-2 focus:ring-offset-2 focus:outline-none whitespace-nowrap',
                  useLightButtons
                    ? 'bg-white text-gray-900 hover:bg-white/90 focus:ring-white'
                    : 'text-white'
                )}
                style={{
                  borderRadius: 'var(--theme-radius)',
                  ...(!useLightButtons ? { backgroundColor: primaryColor } : {}),
                }}
                onMouseEnter={(e) => {
                  if (useLightButtons) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                  } else {
                    e.currentTarget.style.backgroundColor = getButtonHoverBgColor(theme);
                  }
                }}
                onMouseLeave={(e) => {
                  if (useLightButtons) {
                    e.currentTarget.style.backgroundColor = '';
                  } else {
                    e.currentTarget.style.backgroundColor = primaryColor;
                  }
                }}
                aria-label={`${primaryCtaText} - Book an appointment`}
              >
                {primaryCtaText}
              </Button>
            ) : (
              <Link href={resolvedPrimaryLink} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className={cn(
                    'w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-lg min-h-[48px] focus:ring-2 focus:ring-offset-2 focus:outline-none whitespace-nowrap',
                    useLightButtons
                      ? 'bg-white text-gray-900 focus:ring-white'
                      : 'text-white'
                  )}
                  style={{
                    borderRadius: 'var(--theme-radius)',
                    ...(!useLightButtons ? { backgroundColor: primaryColor } : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (useLightButtons) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                    } else {
                      e.currentTarget.style.backgroundColor = getButtonHoverBgColor(theme);
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (useLightButtons) {
                      e.currentTarget.style.backgroundColor = '';
                    } else {
                      e.currentTarget.style.backgroundColor = primaryColor;
                    }
                  }}
                  aria-label={`${primaryCtaText} - Book an appointment`}
                >
                  {primaryCtaText}
                </Button>
              </Link>
            )
          )}

          {secondaryCtaText && (
            isPreview ? (
              <Button
                size="lg"
                variant="outline"
                className={cn(
                  'w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-lg min-h-[48px] focus:ring-2 focus:ring-offset-2 focus:outline-none whitespace-nowrap',
                  useLightButtons
                    ? 'border-white text-white focus:ring-white hover:!bg-transparent'
                    : 'border-border-primary text-text-primary focus:ring-interactive-primary'
                )}
                style={{
                  borderRadius: 'var(--theme-radius)',
                  ...(!useLightButtons ? {
                    borderColor: primaryColor,
                    color: primaryColor,
                  } : {
                    backgroundColor: 'transparent',
                  }),
                }}
                onMouseEnter={(e) => {
                  if (useLightButtons) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.transition = 'all 0.2s ease';
                  } else {
                    e.currentTarget.style.backgroundColor = primaryColor;
                    e.currentTarget.style.color = getButtonHoverTextColor(theme);
                  }
                }}
                onMouseLeave={(e) => {
                  if (useLightButtons) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '';
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.transition = '';
                  } else {
                    e.currentTarget.style.backgroundColor = '';
                    e.currentTarget.style.color = primaryColor;
                  }
                }}
                aria-label={secondaryCtaText}
              >
                {secondaryCtaText}
              </Button>
            ) : (
              <Link href={resolvedSecondaryLink} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className={cn(
                    'w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-lg min-h-[48px] focus:ring-2 focus:ring-offset-2 focus:outline-none whitespace-nowrap',
                    useLightButtons
                      ? 'border-white text-white focus:ring-white'
                      : 'border-border-primary text-text-primary focus:ring-interactive-primary'
                  )}
                  style={{
                    borderRadius: 'var(--theme-radius)',
                    ...(!useLightButtons ? {
                      borderColor: primaryColor,
                      color: primaryColor,
                    } : {
                      backgroundColor: 'transparent',
                    }),
                  }}
                  onMouseEnter={(e) => {
                    if (useLightButtons) {
                      // Use a more visible white background for better hover feedback
                      // Increased opacity (0.25) for better visibility on dark backgrounds
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                      e.currentTarget.style.color = '#ffffff';
                      // Add a subtle scale effect for better visibility
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.transition = 'all 0.2s ease';
                    } else {
                      e.currentTarget.style.backgroundColor = primaryColor;
                      e.currentTarget.style.color = getButtonHoverTextColor(theme);
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (useLightButtons) {
                      // Explicitly set transparent to override bg-background class
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.transition = '';
                    } else {
                      e.currentTarget.style.backgroundColor = '';
                      e.currentTarget.style.color = primaryColor;
                    }
                  }}
                  aria-label={secondaryCtaText}
                >
                  {secondaryCtaText}
                </Button>
              </Link>
            )
          )}
        </div>
      </div>

      {/* Decorative elements only for solid light backgrounds */}
      {backgroundType === 'solid' && !isDarkBackground && (
        <>
          <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-black/5 rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-black/5 rounded-tr-full" />
        </>
      )}
    </BlockSection>
  );
}

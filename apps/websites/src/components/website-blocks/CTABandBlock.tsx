'use client';

/**
 * CTA Band Block
 * 
 * Final call-to-action section with prominent booking button.
 * Uses the Appearance system for background/text colors.
 * Defaults to accent (theme primary) background with contrasting text.
 * 
 * Button colors can be customized via primaryButtonAppearance and secondaryButtonAppearance props.
 */

import React from 'react';
import { CTABandBlockProps, DEFAULT_BLOCK_APPEARANCE, type BackgroundToken, type TextToken } from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection, useAppearanceStyles, resolveBackgroundToken, resolveTextToken } from './BlockSection';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';
import { getPrimaryColor, isColorDark } from '@/lib/website-builder/theme-utils';

export interface CTABandBlockComponentProps extends BlockComponentProps<CTABandBlockProps> {}

export default function CTABandBlock({
  props,
  isPreview,
  theme,
  bookUrl,
  appearance,
  blockId,
}: CTABandBlockComponentProps) {
  const {
    headline,
    subheadline,
    primaryCtaText,
    primaryCtaLink,
    secondaryCtaText,
    secondaryCtaLink,
    primaryButtonAppearance,
    secondaryButtonAppearance,
  } = props;

  // CTA Band defaults to accent background + on-accent text when appearance is not explicitly set
  // This gives it the characteristic "band" look with brand color background
  const effectiveAppearance = {
    backgroundToken: appearance?.backgroundToken || 'accent' as BackgroundToken,
    backgroundCustom: appearance?.backgroundCustom,
    textToken: appearance?.textToken || 'on-accent' as TextToken,
    textCustom: appearance?.textCustom,
  };

  // Get resolved appearance styles for the section
  const { backgroundColor: resolvedBgColor, textColor: resolvedTextColor } = useAppearanceStyles(
    effectiveAppearance,
    theme
  );

  // Determine actual background color for button contrast calculations
  const actualBgColor = resolvedBgColor || getPrimaryColor(theme);
  const isDarkBg = isColorDark(actualBgColor);

  // Text color: use appearance text color or default to white for dark backgrounds
  const textColor = resolvedTextColor || (isDarkBg ? '#ffffff' : 'var(--color-text-primary)');
  const subTextColor = resolvedTextColor 
    ? resolvedTextColor 
    : (isDarkBg ? 'rgba(255, 255, 255, 0.9)' : 'var(--color-text-secondary)');

  // ===========================================================================
  // PRIMARY BUTTON COLOR RESOLUTION
  // ===========================================================================
  
  // Resolve primary button colors from appearance props or use smart defaults
  const primaryBtnBgFromAppearance = primaryButtonAppearance?.backgroundCustom ||
    (primaryButtonAppearance?.backgroundToken 
      ? resolveBackgroundToken(primaryButtonAppearance.backgroundToken, undefined, theme)
      : undefined);
  
  const primaryBtnTextFromAppearance = primaryButtonAppearance?.textCustom ||
    (primaryButtonAppearance?.textToken
      ? resolveTextToken(primaryButtonAppearance.textToken, undefined, theme, primaryButtonAppearance.backgroundToken, primaryButtonAppearance.backgroundCustom)
      : undefined);
  
  // Smart defaults: light button on dark bg, accent button on light bg
  const primaryBtnBgColor = primaryBtnBgFromAppearance || (isDarkBg ? '#ffffff' : getPrimaryColor(theme));
  const primaryBtnTextColor = primaryBtnTextFromAppearance || (isDarkBg ? getPrimaryColor(theme) : '#ffffff');

  // ===========================================================================
  // SECONDARY BUTTON COLOR RESOLUTION
  // ===========================================================================
  
  // Resolve secondary button colors from appearance props or use smart defaults
  const secondaryBtnBgFromAppearance = secondaryButtonAppearance?.backgroundCustom ||
    (secondaryButtonAppearance?.backgroundToken && secondaryButtonAppearance.backgroundToken !== 'default' && secondaryButtonAppearance.backgroundToken !== 'transparent'
      ? resolveBackgroundToken(secondaryButtonAppearance.backgroundToken, undefined, theme)
      : undefined);
  
  const secondaryBtnTextFromAppearance = secondaryButtonAppearance?.textCustom ||
    (secondaryButtonAppearance?.textToken
      ? resolveTextToken(secondaryButtonAppearance.textToken, undefined, theme, secondaryButtonAppearance.backgroundToken, secondaryButtonAppearance.backgroundCustom)
      : undefined);
  
  // Smart defaults: outline button matching section text color
  const secondaryBtnBgColor = secondaryBtnBgFromAppearance || 'transparent';
  const secondaryBtnTextColor = secondaryBtnTextFromAppearance || textColor;
  const secondaryBtnBorderColor = secondaryBtnTextColor;
  
  // Hover states
  const secondaryBtnHoverBgColor = isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

  // Resolve booking link (use tenant-specific bookUrl as fallback)
  const resolvedPrimaryLink = primaryCtaLink || bookUrl || '/book';
  const resolvedSecondaryLink = secondaryCtaLink || '#contact';

  // Build appearance for BlockSection with CTA Band defaults
  const blockSectionAppearance: import('@/lib/website-builder/schema').BlockAppearance = {
    ...appearance,
    backgroundToken: (appearance?.backgroundToken || 'accent') as import('@/lib/website-builder/schema').BackgroundToken,
    textToken: (appearance?.textToken || 'on-accent') as import('@/lib/website-builder/schema').TextToken,
  };

  return (
    <BlockSection
      appearance={blockSectionAppearance}
      theme={theme}
      blockType="cta-band"
      as="section"
      blockId={blockId}
    >
      <div className="text-center">
        {/* Headline */}
        <h2
          className="font-bold mb-3 sm:mb-4 text-2xl sm:text-3xl lg:text-4xl break-words"
          style={{
            fontFamily: 'var(--theme-font-heading)',
            color: textColor,
          }}
        >
          {headline}
        </h2>

        {/* Subheadline */}
        {subheadline && (
          <p
            className="text-base sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto break-words"
            style={{ 
              fontFamily: 'var(--theme-font-body)',
              color: subTextColor,
            }}
          >
            {subheadline}
          </p>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
          {primaryCtaText && (
            isPreview ? (
              <Button
                size="lg"
                className={cn(
                  "px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold whitespace-normal h-auto min-h-[48px]",
                  "hover:opacity-90 transition-opacity"
                )}
                style={{ 
                  backgroundColor: primaryBtnBgColor,
                  color: primaryBtnTextColor,
                  borderRadius: 'var(--theme-radius)',
                }}
              >
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                <span>{primaryCtaText}</span>
              </Button>
            ) : (
              <Link href={resolvedPrimaryLink} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className={cn(
                    "px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold whitespace-normal h-auto min-h-[48px] w-full sm:w-auto",
                    "hover:opacity-90 transition-opacity"
                  )}
                  style={{ 
                    backgroundColor: primaryBtnBgColor,
                    color: primaryBtnTextColor,
                    borderRadius: 'var(--theme-radius)',
                  }}
                >
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                  <span>{primaryCtaText}</span>
                </Button>
              </Link>
            )
          )}

          {secondaryCtaText && (
            isPreview ? (
              <Button
                size="lg"
                variant="outline"
                className="px-6 sm:px-8 py-3 text-base sm:text-lg whitespace-normal h-auto min-h-[48px] transition-colors"
                style={{ 
                  borderRadius: 'var(--theme-radius)',
                  borderColor: secondaryBtnBorderColor,
                  color: secondaryBtnTextColor,
                  backgroundColor: secondaryBtnBgColor,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = secondaryBtnHoverBgColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = secondaryBtnBgColor;
                }}
              >
                <span>{secondaryCtaText}</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 flex-shrink-0" />
              </Button>
            ) : (
              <Link href={resolvedSecondaryLink} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-6 sm:px-8 py-3 text-base sm:text-lg whitespace-normal h-auto min-h-[48px] w-full sm:w-auto transition-colors hover:bg-white/10"
                  style={{ 
                    borderRadius: 'var(--theme-radius)',
                    borderColor: secondaryBtnBorderColor,
                    color: secondaryBtnTextColor,
                    backgroundColor: secondaryBtnBgColor,
                  }}
                >
                  <span>{secondaryCtaText}</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 flex-shrink-0" />
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
    </BlockSection>
  );
}


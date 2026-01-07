'use client';

/**
 * Photo + Text Block
 * 
 * Displays an image alongside header, tagline, and body text.
 * Image can be positioned left or right, with configurable aspect ratio.
 * Mobile: Stacks vertically (image on top).
 */

import React from 'react';
import { PhotoTextBlockProps } from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection, useAppearanceStyles } from './BlockSection';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';
import {
  getPrimaryTextColor,
  getSecondaryTextColor,
  getTertiaryTextColor,
} from '@/lib/website-builder/theme-utils';

export interface PhotoTextBlockComponentProps
  extends BlockComponentProps<PhotoTextBlockProps> {}

export default function PhotoTextBlock({
  props,
  isPreview,
  theme,
  appearance,
  blockId,
}: PhotoTextBlockComponentProps) {
  const {
    imageUrl,
    imageAlt,
    imageAspect = 'square',
    imagePosition = 'left',
    header,
    tagline,
    body,
  } = props;

  const primaryTextColor = getPrimaryTextColor(theme);
  const secondaryTextColor = getSecondaryTextColor(theme);
  const tertiaryTextColor = getTertiaryTextColor(theme);

  // Get appearance styles (appearance text color overrides theme)
  const { textColor: appearanceTextColor } = useAppearanceStyles(appearance, theme);

  // Use appearance text color if set, otherwise fall back to theme colors
  const headerColor = appearanceTextColor || primaryTextColor;
  const taglineColor = appearanceTextColor || secondaryTextColor;
  const bodyColor = appearanceTextColor || primaryTextColor;

  // Aspect ratio classes for the image container
  const aspectClasses: Record<string, string> = {
    square: 'aspect-square',
    'portrait-3-4': 'aspect-[3/4]',
    'portrait-9-16': 'aspect-[9/16]',
  };

  const hasImage = Boolean(imageUrl);
  const hasText = Boolean(header || tagline || body);

  // If no content at all, show placeholder in preview mode
  if (!hasImage && !hasText && !isPreview) {
    return null;
  }

  return (
    <BlockSection
      appearance={appearance}
      theme={theme}
      blockType="photo-text"
      as="section"
      blockId={blockId}
    >
      <div
        className={cn(
          'grid gap-8 lg:gap-12 items-center',
            // Mobile: single column (image on top)
            'grid-cols-1',
            // Desktop: two columns
            'lg:grid-cols-2'
          )}
        >
          {/* Image Container - order changes based on position */}
          <div
            className={cn(
              'w-full',
              // On desktop, reverse order if image is on the right
              imagePosition === 'right' && 'lg:order-2'
            )}
          >
            <div
              className={cn(
                'relative w-full overflow-hidden rounded-lg bg-surface-secondary',
                aspectClasses[imageAspect]
              )}
            >
              {hasImage ? (
                <img
                  src={imageUrl}
                  alt={imageAlt || 'Photo'}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                // Placeholder for preview mode
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon
                      className="w-16 h-16 mx-auto mb-2"
                      style={{ color: tertiaryTextColor }}
                    />
                    <p
                      className="text-sm"
                      style={{ color: secondaryTextColor }}
                    >
                      Upload an image
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Text Container */}
          <div
            className={cn(
              'flex flex-col justify-center',
              imagePosition === 'right' && 'lg:order-1'
            )}
          >
            {header && (
              <h2
                className="font-bold mb-4"
                style={{
                  fontSize: 'var(--theme-h2-size)',
                  fontFamily: 'var(--theme-font-heading)',
                  color: headerColor,
                }}
              >
                {header}
              </h2>
            )}

            {tagline && (
              <p
                className="text-lg mb-4"
                style={{
                  fontFamily: 'var(--theme-font-body)',
                  color: taglineColor,
                }}
              >
                {tagline}
              </p>
            )}

            {body && (
              <div
                className="prose prose-lg max-w-none"
                style={{
                  fontFamily: 'var(--theme-font-body)',
                  color: bodyColor,
                }}
              >
                {/* Render body text - split by newlines for paragraphs */}
                {body.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {/* Preview mode placeholder for text */}
            {!hasText && isPreview && (
              <div className="space-y-4">
                <div
                  className="h-8 rounded w-3/4"
                  style={{ backgroundColor: `${tertiaryTextColor}20` }}
                />
                <div
                  className="h-4 rounded w-full"
                  style={{ backgroundColor: `${tertiaryTextColor}15` }}
                />
                <div
                  className="h-4 rounded w-5/6"
                  style={{ backgroundColor: `${tertiaryTextColor}15` }}
                />
              </div>
            )}
          </div>
        </div>
    </BlockSection>
  );
}


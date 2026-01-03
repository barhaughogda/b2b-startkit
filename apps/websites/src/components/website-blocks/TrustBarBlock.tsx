'use client';

/**
 * Trust Bar Block
 *
 * Displays insurance logos, accreditations, ratings, and other trust signals.
 * Supports clickable items, rating displays, and flexible styling options.
 */

import React from 'react';
import { TrustBarBlockProps, TrustBarItem } from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection } from './BlockSection';
import { cn } from '@/lib/utils';
import {
  Shield,
  Award,
  Star,
  CheckCircle,
  ShieldCheck,
  Users,
  Trophy,
  ExternalLink,
} from 'lucide-react';
import Image from 'next/image';
import { getPrimaryColor } from '@/lib/website-builder/theme-utils';
import {
  findRatingSourceById,
  formatRatingDisplay,
  TrustItemCategory,
} from '@/lib/website-builder/trust-bar-constants';

export interface TrustBarBlockComponentProps extends BlockComponentProps<TrustBarBlockProps> {}

// Icon mapping for each trust item type
const typeIcons: Record<
  TrustItemCategory | string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  insurance: Shield,
  accreditation: Award,
  compliance: ShieldCheck,
  rating: Star,
  affiliation: Users,
  award: Trophy,
  custom: CheckCircle,
};

// Default preview items for when there's no content
const DEFAULT_PREVIEW_ITEMS: TrustBarItem[] = [
  {
    id: '1',
    type: 'insurance',
    presetId: 'bcbs',
    label: 'Blue Cross Blue Shield',
    shortLabel: 'BCBS',
  },
  {
    id: '2',
    type: 'insurance',
    presetId: 'aetna',
    label: 'Aetna',
  },
  {
    id: '3',
    type: 'insurance',
    presetId: 'united',
    label: 'United Healthcare',
    shortLabel: 'UHC',
  },
  {
    id: '4',
    type: 'accreditation',
    presetId: 'jcaho',
    label: 'JCAHO Accredited',
    shortLabel: 'JCAHO',
    verifyUrl: 'https://www.jointcommission.org',
  },
  {
    id: '5',
    type: 'rating',
    ratingSource: 'google',
    label: 'Google Reviews',
    ratingValue: '4.9',
    ratingCount: '238',
  },
];

// =============================================================================
// TRUST ITEM COMPONENT
// =============================================================================

interface TrustItemDisplayProps {
  item: TrustBarItem;
  primaryColor: string;
  showLabels: boolean;
  grayscaleLogos: boolean;
  compactMode: boolean;
  isPreview?: boolean;
}

function TrustItemDisplay({
  item,
  primaryColor,
  showLabels,
  grayscaleLogos,
  compactMode,
}: TrustItemDisplayProps) {
  const IconComponent = typeIcons[item.type] || CheckCircle;
  const isRating = item.type === 'rating';

  // Determine the label to display
  const displayLabel = compactMode && item.shortLabel ? item.shortLabel : item.label;

  // Get rating display text
  let ratingText: string | undefined;
  let reviewText: string | undefined;

  if (isRating && item.ratingValue) {
    const formatted = formatRatingDisplay(
      item.ratingSource || 'custom',
      item.ratingValue,
      item.ratingCount
    );
    ratingText = formatted.ratingText;
    reviewText = formatted.reviewText;
  }

  // Determine click URL
  const clickUrl = isRating ? item.profileUrl : item.verifyUrl;
  const isClickable = Boolean(clickUrl);

  // Content wrapper - makes item clickable if there's a URL
  const ContentWrapper = isClickable ? 'a' : 'div';
  const wrapperProps = isClickable
    ? {
        href: clickUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `${displayLabel}${isRating ? ` - ${ratingText}` : ''} (opens in new tab)`,
      }
    : {};

  return (
    <ContentWrapper
      {...wrapperProps}
      className={cn(
        'flex items-center gap-3 text-text-secondary transition-colors min-w-0 group',
        isClickable && 'hover:text-text-primary cursor-pointer'
      )}
    >
      {/* Icon or Logo */}
      {item.imageUrl ? (
        <div
          className={cn(
            'relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 transition-all',
            grayscaleLogos && 'grayscale group-hover:grayscale-0'
          )}
        >
          <Image src={item.imageUrl} alt={displayLabel} fill className="object-contain" />
        </div>
      ) : (
        <IconComponent
          className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 transition-colors group-hover:scale-110"
          style={{ color: primaryColor }}
        />
      )}

      {/* Text Content */}
      {showLabels && (
        <div className="flex flex-col min-w-0">
          {isRating && ratingText ? (
            <>
              {/* Rating Display */}
              <div className="flex items-center gap-1">
                <Star
                  className="w-3.5 h-3.5 fill-current flex-shrink-0"
                  style={{ color: 'var(--zenthea-coral, #E8927C)' }}
                />
                <span className="text-xs sm:text-sm font-semibold" style={{ color: primaryColor }}>
                  {item.ratingValue}
                </span>
              </div>
              <span className="text-xs text-text-secondary truncate">
                {findRatingSourceById(item.ratingSource || 'custom')?.shortLabel || displayLabel}
              </span>
              {reviewText && (
                <span className="text-xs text-text-tertiary truncate">{reviewText}</span>
              )}
            </>
          ) : (
            <>
              {/* Standard Display */}
              <span className="text-xs sm:text-sm font-medium truncate">{displayLabel}</span>
              {/* Legacy value support */}
              {item.value && !isRating && (
                <span className="text-xs text-text-tertiary truncate">{item.value}</span>
              )}
            </>
          )}

          {/* External Link Indicator */}
          {isClickable && (
            <ExternalLink className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity absolute -right-4 top-1/2 -translate-y-1/2" />
          )}
        </div>
      )}

      {/* Icon-only mode with external link */}
      {!showLabels && isClickable && (
        <ExternalLink className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </ContentWrapper>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TrustBarBlock({
  props,
  isPreview,
  theme,
  appearance,
  blockId,
}: TrustBarBlockComponentProps) {
  const {
    items,
    layout = 'horizontal',
    showLabels = true,
    grayscaleLogos = true,
    compactMode = false,
  } = props;

  const primaryColor = getPrimaryColor(theme);

  // Use default preview items if no items configured
  const displayItems = items.length > 0 ? items : isPreview ? DEFAULT_PREVIEW_ITEMS : [];

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <BlockSection
      appearance={appearance}
      theme={theme}
      blockType="trust-bar"
      as="section"
      blockId={blockId}
    >
      <div
        className={cn(
          layout === 'horizontal'
            ? 'flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-12'
            : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6'
        )}
      >
        {displayItems.map((item) => (
          <div key={item.id} className="relative">
            <TrustItemDisplay
              item={item}
              primaryColor={primaryColor}
              showLabels={showLabels}
              grayscaleLogos={grayscaleLogos}
              compactMode={compactMode}
              isPreview={isPreview}
            />
          </div>
        ))}
      </div>
    </BlockSection>
  );
}

'use client';

/**
 * Testimonials Block
 * 
 * Displays patient reviews and quotes with 5 layout options:
 * - hero-card: Large featured testimonial with prominent styling
 * - carousel-cards: Horizontally scrollable cards
 * - grid-cards: Responsive 1–3 column grid
 * - stacked-list: Vertical list with compact layout
 * - centered-quote: Centered quote with prominent typography
 */

import React from 'react';
import { TestimonialsBlockProps, TestimonialsLayout, TestimonialItem } from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection, useAppearanceStyles } from './BlockSection';
import { MessageSquare } from 'lucide-react';
import { 
  getPrimaryTextColor, 
  getSecondaryTextColor, 
  getTertiaryTextColor 
} from '@/lib/website-builder/theme-utils';

// Import layout components
import {
  HeroCardLayout,
  CarouselCardsLayout,
  GridCardsLayout,
  StackedListLayout,
  CenteredQuoteLayout,
} from './testimonials';

export interface TestimonialsBlockComponentProps extends BlockComponentProps<TestimonialsBlockProps> {}

export default function TestimonialsBlock({
  props,
  isPreview,
  theme,
  appearance,
  blockId,
}: TestimonialsBlockComponentProps) {
  const {
    title,
    subtitle,
    testimonials,
    layout = 'carousel-cards',
    maxVisible = 3,
  } = props;

  // Placeholder testimonials for preview mode when empty
  const placeholderTestimonials: TestimonialItem[] = [
    {
      id: '1',
      name: 'Sarah M.',
      tagline: 'Patient since 2022',
      rating: 5,
      header: 'Exceptional Care',
      testimonial: 'The care I received was exceptional. The staff was friendly, professional, and truly cared about my wellbeing.',
    },
    {
      id: '2',
      name: 'Michael T.',
      tagline: 'Patient since 2021',
      rating: 5,
      header: 'Highly Recommend',
      testimonial: 'Easy online booking and minimal wait times. Dr. Johnson took the time to answer all my questions thoroughly.',
    },
    {
      id: '3',
      name: 'Jennifer L.',
      tagline: 'Patient since 2023',
      rating: 5,
      header: 'Life Changing',
      testimonial: 'Finally found a healthcare provider that treats me like a person, not just a number. Highly recommend!',
    },
  ];

  const displayTestimonials = testimonials.length > 0 
    ? testimonials 
    : (isPreview ? placeholderTestimonials : []);

  const primaryTextColor = getPrimaryTextColor(theme);
  const secondaryTextColor = getSecondaryTextColor(theme);
  const tertiaryTextColor = getTertiaryTextColor(theme);

  // Get appearance styles (appearance text color overrides theme)
  const { textColor: appearanceTextColor } = useAppearanceStyles(appearance, theme);

  // Use appearance text color if set, otherwise fall back to theme colors
  const titleColor = appearanceTextColor || primaryTextColor;
  const subtitleColor = appearanceTextColor || secondaryTextColor;

  // Render the appropriate layout component
  const renderLayout = () => {
    const layoutProps = {
      testimonials: displayTestimonials,
      maxVisible,
      theme,
      appearance,
      isPreview,
    };

    switch (layout as TestimonialsLayout) {
      case 'hero-card':
        return <HeroCardLayout {...layoutProps} />;
      case 'carousel-cards':
        return <CarouselCardsLayout {...layoutProps} />;
      case 'grid-cards':
        return <GridCardsLayout {...layoutProps} />;
      case 'stacked-list':
        return <StackedListLayout {...layoutProps} />;
      case 'centered-quote':
        return <CenteredQuoteLayout {...layoutProps} />;
      default:
        return <CarouselCardsLayout {...layoutProps} />;
    }
  };

  // Empty state - show in builder preview mode, hide in production
  const renderEmptyState = () => {
    if (!isPreview) return null;
    
    return (
      <div className="text-center py-12">
        <div 
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ 
            backgroundColor: 'var(--color-surface-secondary, #f3f4f6)',
          }}
        >
          <MessageSquare 
            className="w-8 h-8" 
            style={{ color: tertiaryTextColor }} 
          />
        </div>
        <p 
          className="text-lg font-medium mb-2"
          style={{ color: secondaryTextColor }}
        >
          No testimonials yet
        </p>
        <p 
          className="text-sm"
          style={{ color: tertiaryTextColor }}
        >
          Add testimonials using the sidebar editor to showcase patient reviews.
        </p>
      </div>
    );
  };

  return (
    <BlockSection
      appearance={appearance}
      theme={theme}
      blockType="testimonials"
      as="section"
      blockId={blockId}
    >
      {/* Header */}
      <div className="text-center mb-12">
          <h2
            className="font-bold mb-4"
            style={{
              fontSize: 'var(--theme-h2-size)',
              fontFamily: 'var(--theme-font-heading)',
              color: titleColor,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{
                fontFamily: 'var(--theme-font-body)',
                color: subtitleColor,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Content: Layout or Empty State */}
        {displayTestimonials.length > 0 ? renderLayout() : renderEmptyState()}
    </BlockSection>
  );
}

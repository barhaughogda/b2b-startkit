'use client';

/**
 * Carousel Cards Layout for Testimonials
 * 
 * Horizontally scrollable cards with navigation arrows.
 */

import React, { useState } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { TestimonialLayoutProps } from '../types';
import { 
  getPrimaryColor, 
  getPrimaryTextColor, 
  getSecondaryTextColor 
} from '@/lib/website-builder/theme-utils';
import { cn } from '@/lib/utils';

export function CarouselCardsLayout({
  testimonials,
  maxVisible,
  theme,
}: TestimonialLayoutProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const primaryColor = getPrimaryColor(theme);
  const primaryTextColor = getPrimaryTextColor(theme);
  const secondaryTextColor = getSecondaryTextColor(theme);

  const visibleTestimonials = testimonials.slice(currentIndex, currentIndex + maxVisible);
  const canGoNext = currentIndex + maxVisible < testimonials.length;
  const canGoPrev = currentIndex > 0;

  const handleNext = () => {
    if (canGoNext) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (canGoPrev) setCurrentIndex(currentIndex - 1);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className="w-4 h-4"
            style={{
              color: star <= rating 
                ? 'var(--zenthea-coral, #E8927C)' 
                : 'var(--color-text-tertiary, #9ca3af)',
              fill: star <= rating ? 'currentColor' : 'none',
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="relative">
      <div className={cn(
        'flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-px-4 pb-4 -mx-4 px-4 sm:-mx-0 sm:px-0'
      )}>
        {visibleTestimonials.map((testimonial) => (
          <Card 
            key={testimonial.id}
            className={cn(
              'shadow-md flex-shrink-0 w-[85vw] sm:w-[45vw] md:w-[calc(33.333%-1rem)] snap-start'
            )}
          >
            <CardContent className="p-4 sm:p-6">
              {/* Quote icon */}
              <Quote 
                className="w-10 h-10 mb-4" 
                style={{ color: `${primaryColor}4d` }}
              />

              {/* Avatar & Rating Row */}
              <div className="flex items-center gap-3 mb-4">
                {testimonial.imageUrl && (
                  <img
                    src={testimonial.imageUrl}
                    alt={testimonial.imageAlt || testimonial.name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    style={{ border: `2px solid ${primaryColor}` }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p 
                    className="font-semibold text-sm truncate"
                    style={{ color: primaryTextColor }}
                  >
                    {testimonial.name}
                  </p>
                  {testimonial.tagline && (
                    <p 
                      className="text-xs truncate"
                      style={{ color: secondaryTextColor }}
                    >
                      {testimonial.tagline}
                    </p>
                  )}
                </div>
              </div>

              {/* Rating */}
              {testimonial.rating && (
                <div className="mb-3">
                  {renderStars(testimonial.rating)}
                </div>
              )}

              {/* Header */}
              {testimonial.header && (
                <h4 
                  className="font-semibold text-sm mb-2"
                  style={{ 
                    color: primaryTextColor,
                    fontFamily: 'var(--theme-font-heading)',
                  }}
                >
                  {testimonial.header}
                </h4>
              )}

              {/* Quote text */}
              <p 
                className="italic text-sm leading-relaxed break-words"
                style={{ color: secondaryTextColor }}
              >
                &ldquo;{testimonial.testimonial}&rdquo;
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation Arrows */}
      {testimonials.length > maxVisible && (
        <div className="flex justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            disabled={!canGoPrev}
            className="rounded-full"
            style={{ borderRadius: 'var(--theme-radius)' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={!canGoNext}
            className="rounded-full"
            style={{ borderRadius: 'var(--theme-radius)' }}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default CarouselCardsLayout;

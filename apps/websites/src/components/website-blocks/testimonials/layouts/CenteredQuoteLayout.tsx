'use client';

/**
 * Centered Quote Layout for Testimonials
 * 
 * Centered quote with subtle background and prominent typography.
 * Shows testimonials in a paginated manner.
 */

import React, { useState } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TestimonialLayoutProps } from '../types';
import { 
  getPrimaryColor, 
  getPrimaryTextColor, 
  getSecondaryTextColor 
} from '@/lib/website-builder/theme-utils';

export function CenteredQuoteLayout({
  testimonials,
  theme,
}: TestimonialLayoutProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const primaryColor = getPrimaryColor(theme);
  const primaryTextColor = getPrimaryTextColor(theme);
  const secondaryTextColor = getSecondaryTextColor(theme);

  const testimonial = testimonials[currentIndex];
  if (!testimonial) return null;

  const canGoNext = currentIndex < testimonials.length - 1;
  const canGoPrev = currentIndex > 0;

  const handleNext = () => {
    if (canGoNext) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (canGoPrev) setCurrentIndex(currentIndex - 1);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className="w-5 h-5"
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
    <div className="max-w-4xl mx-auto text-center px-4">
      {/* Large decorative quote */}
      <Quote 
        className="w-16 h-16 mx-auto mb-6"
        style={{ color: `${primaryColor}33` }}
      />

      {/* Rating */}
      {testimonial.rating && (
        <div className="mb-6">
          {renderStars(testimonial.rating)}
        </div>
      )}

      {/* Header */}
      {testimonial.header && (
        <h3 
          className="text-xl md:text-2xl font-bold mb-4"
          style={{ 
            color: primaryTextColor,
            fontFamily: 'var(--theme-font-heading)',
          }}
        >
          {testimonial.header}
        </h3>
      )}

      {/* Testimonial Body */}
      <blockquote 
        className="text-xl md:text-2xl lg:text-3xl italic leading-relaxed mb-8"
        style={{ 
          color: primaryTextColor,
          fontFamily: 'var(--theme-font-body)',
        }}
      >
        &ldquo;{testimonial.testimonial}&rdquo;
      </blockquote>

      {/* Author Info */}
      <div className="flex flex-col items-center mb-8">
        {testimonial.imageUrl && (
          <img
            src={testimonial.imageUrl}
            alt={testimonial.imageAlt || testimonial.name}
            className="w-16 h-16 rounded-full object-cover mb-4"
            style={{ border: `3px solid ${primaryColor}` }}
          />
        )}
        <p 
          className="font-semibold text-lg"
          style={{ color: primaryTextColor }}
        >
          {testimonial.name}
        </p>
        {testimonial.tagline && (
          <p 
            className="text-sm"
            style={{ color: secondaryTextColor }}
          >
            {testimonial.tagline}
          </p>
        )}
      </div>

      {/* Pagination Dots & Navigation */}
      {testimonials.length > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            disabled={!canGoPrev}
            className="rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Dots */}
          <div className="flex gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  backgroundColor: index === currentIndex 
                    ? primaryColor 
                    : 'var(--color-border-primary, #e5e7eb)',
                  transform: index === currentIndex ? 'scale(1.25)' : 'scale(1)',
                }}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={!canGoNext}
            className="rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default CenteredQuoteLayout;

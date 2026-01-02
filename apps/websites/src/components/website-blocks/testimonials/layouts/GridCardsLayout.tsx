'use client';

/**
 * Grid Cards Layout for Testimonials
 * 
 * Responsive 1–3 column grid of testimonial cards.
 */

import React from 'react';
import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { TestimonialLayoutProps } from '../types';
import { 
  getPrimaryColor, 
  getPrimaryTextColor, 
  getSecondaryTextColor 
} from '@/lib/website-builder/theme-utils';

export function GridCardsLayout({
  testimonials,
  maxVisible,
  theme,
}: TestimonialLayoutProps) {
  const primaryColor = getPrimaryColor(theme);
  const primaryTextColor = getPrimaryTextColor(theme);
  const secondaryTextColor = getSecondaryTextColor(theme);

  const visibleTestimonials = testimonials.slice(0, maxVisible);

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {visibleTestimonials.map((testimonial) => (
        <Card 
          key={testimonial.id}
          className="shadow-md h-full"
        >
          <CardContent className="p-4 sm:p-6 flex flex-col h-full">
            {/* Quote icon */}
            <Quote 
              className="w-10 h-10 mb-4 flex-shrink-0" 
              style={{ color: `${primaryColor}4d` }}
            />

            {/* Header */}
            {testimonial.header && (
              <h4 
                className="font-semibold mb-2"
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
              className="italic text-sm leading-relaxed break-words flex-grow mb-4"
              style={{ color: secondaryTextColor }}
            >
              &ldquo;{testimonial.testimonial}&rdquo;
            </p>

            {/* Rating */}
            {testimonial.rating && (
              <div className="mb-4">
                {renderStars(testimonial.rating)}
              </div>
            )}

            {/* Author Info */}
            <div 
              className="flex items-center gap-3 pt-4 mt-auto"
              style={{ borderTop: '1px solid var(--color-border-primary, #e5e7eb)' }}
            >
              {testimonial.imageUrl && (
                <img
                  src={testimonial.imageUrl}
                  alt={testimonial.imageAlt || testimonial.name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  style={{ border: `2px solid ${primaryColor}` }}
                />
              )}
              <div className="min-w-0">
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default GridCardsLayout;

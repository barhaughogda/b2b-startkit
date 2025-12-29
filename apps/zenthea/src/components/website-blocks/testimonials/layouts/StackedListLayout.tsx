'use client';

/**
 * Stacked List Layout for Testimonials
 * 
 * Vertical list with compact avatars and horizontal card styling.
 */

import React from 'react';
import { Star } from 'lucide-react';
import type { TestimonialLayoutProps } from '../types';
import { 
  getPrimaryColor, 
  getPrimaryTextColor, 
  getSecondaryTextColor 
} from '@/lib/website-builder/theme-utils';

export function StackedListLayout({
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
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className="w-3.5 h-3.5"
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
    <div className="space-y-4 max-w-3xl mx-auto">
      {visibleTestimonials.map((testimonial) => (
        <div
          key={testimonial.id}
          className="flex gap-4 p-4 sm:p-6 rounded-lg"
          style={{ 
            backgroundColor: 'var(--color-surface-elevated, #ffffff)',
            border: '1px solid var(--color-border-primary, #e5e7eb)',
          }}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            {testimonial.imageUrl ? (
              <img
                src={testimonial.imageUrl}
                alt={testimonial.imageAlt || testimonial.name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover"
                style={{ border: `2px solid ${primaryColor}` }}
              />
            ) : (
              <div 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {testimonial.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Author Info & Rating */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <p 
                className="font-semibold"
                style={{ color: primaryTextColor }}
              >
                {testimonial.name}
              </p>
              {testimonial.tagline && (
                <>
                  <span style={{ color: secondaryTextColor }}>·</span>
                  <p 
                    className="text-sm"
                    style={{ color: secondaryTextColor }}
                  >
                    {testimonial.tagline}
                  </p>
                </>
              )}
              {testimonial.rating && (
                <>
                  <span style={{ color: secondaryTextColor }}>·</span>
                  {renderStars(testimonial.rating)}
                </>
              )}
            </div>

            {/* Header */}
            {testimonial.header && (
              <h4 
                className="font-semibold text-sm mb-1"
                style={{ 
                  color: primaryTextColor,
                  fontFamily: 'var(--theme-font-heading)',
                }}
              >
                {testimonial.header}
              </h4>
            )}

            {/* Testimonial */}
            <p 
              className="text-sm leading-relaxed"
              style={{ color: secondaryTextColor }}
            >
              {testimonial.testimonial}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StackedListLayout;

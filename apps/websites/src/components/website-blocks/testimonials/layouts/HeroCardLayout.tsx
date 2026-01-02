'use client';

/**
 * Hero Card Layout for Testimonials
 * 
 * Large featured testimonial with avatar, quote marks, header + body, name/title, rating.
 * Shows one testimonial prominently (the first one).
 */

import React from 'react';
import { Star, Quote } from 'lucide-react';
import type { TestimonialLayoutProps } from '../types';
import { 
  getPrimaryColor, 
  getSecondaryColor, 
  getPrimaryTextColor, 
  getSecondaryTextColor 
} from '@/lib/website-builder/theme-utils';

export function HeroCardLayout({
  testimonials,
  theme,
}: TestimonialLayoutProps) {
  const primaryColor = getPrimaryColor(theme);
  const secondaryColor = getSecondaryColor(theme);
  const primaryTextColor = getPrimaryTextColor(theme);
  const secondaryTextColor = getSecondaryTextColor(theme);

  // Show only the first testimonial in hero layout
  const testimonial = testimonials[0];
  if (!testimonial) return null;

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
    <div className="max-w-4xl mx-auto">
      <div 
        className="relative rounded-2xl p-8 md:p-12 shadow-lg"
        style={{ 
          backgroundColor: 'var(--color-surface-elevated, #ffffff)',
          border: '1px solid var(--color-border-primary, #e5e7eb)',
        }}
      >
        {/* Decorative Quote Icon */}
        <div className="absolute -top-6 left-8 md:left-12">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            <Quote className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="pt-4 text-center">
          {/* Avatar */}
          {testimonial.imageUrl && (
            <div className="mb-6">
              <img
                src={testimonial.imageUrl}
                alt={testimonial.imageAlt || testimonial.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full mx-auto object-cover shadow-md"
                style={{ border: `3px solid ${primaryColor}` }}
              />
            </div>
          )}

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
            className="text-lg md:text-xl italic leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ 
              color: secondaryTextColor,
              fontFamily: 'var(--theme-font-body)',
            }}
          >
            &ldquo;{testimonial.testimonial}&rdquo;
          </blockquote>

          {/* Author Info */}
          <div className="flex flex-col items-center">
            <p 
              className="font-semibold text-lg"
              style={{ color: primaryTextColor }}
            >
              {testimonial.name}
            </p>
            {testimonial.tagline && (
              <p 
                className="text-sm mt-1"
                style={{ color: secondaryTextColor }}
              >
                {testimonial.tagline}
              </p>
            )}
          </div>
        </div>

        {/* Decorative accent line */}
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full"
          style={{ backgroundColor: primaryColor }}
        />
      </div>
    </div>
  );
}

export default HeroCardLayout;

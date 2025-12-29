'use client';

import React from 'react';
import Link from 'next/link';
import { ProviderGalleryCard, PublicProviderData } from './ProviderGalleryCard';
import { Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProviderGalleryProps {
  providers: PublicProviderData[];
  tenantSlug: string;
  isBookingEnabled?: boolean;
  brandingColor?: string;
  onProviderClick: (providerId: string) => void;
  onBookClick?: (providerId: string) => void;
  /** Maximum providers to display (for preview mode) */
  limit?: number;
  /** Show "View All" link when limited */
  showViewAll?: boolean;
  /** Title for the section */
  title?: string;
  /** Subtitle for the section */
  subtitle?: string;
  /** Enable featured highlighting for first N providers */
  featuredCount?: number;
  /** Optional className for container */
  className?: string;
}

/**
 * ProviderGallery
 * 
 * A responsive gallery container for displaying provider cards with:
 * - Responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
 * - Staggered entrance animations
 * - Empty state handling
 * - Optional limit with "View All" link for landing page preview
 */
export function ProviderGallery({
  providers,
  tenantSlug,
  isBookingEnabled = true,
  brandingColor,
  onProviderClick,
  onBookClick,
  limit,
  showViewAll = false,
  title,
  subtitle,
  featuredCount = 0,
  className = '',
}: ProviderGalleryProps) {
  // Apply limit if specified
  const displayProviders = limit ? providers.slice(0, limit) : providers;
  const hasMore = limit ? providers.length > limit : false;

  // Empty state
  if (providers.length === 0) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div 
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ backgroundColor: `${brandingColor || 'var(--zenthea-teal)'}15` }}
        >
          <Users 
            className="h-10 w-10" 
            style={{ color: brandingColor || 'var(--zenthea-teal)' }}
          />
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          No Providers Listed Yet
        </h3>
        <p className="text-text-secondary max-w-md mx-auto">
          Our team information will be available soon. Check back later to meet our dedicated healthcare professionals.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Optional Header */}
      {(title || subtitle) && (
        <div className="text-center mb-10">
          {title && (
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-3">
              {title}
            </h2>
          )}
          {subtitle && (
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: brandingColor || 'var(--zenthea-teal)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Provider Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {displayProviders.map((provider, index) => (
          <ProviderGalleryCard
            key={provider._id}
            provider={provider}
            onClick={() => onProviderClick(provider._id)}
            onBookClick={onBookClick ? () => onBookClick(provider._id) : undefined}
            isBookingEnabled={isBookingEnabled}
            brandingColor={brandingColor}
            animationDelay={index * 100} // 100ms stagger
            featured={index < featuredCount}
          />
        ))}
      </div>

      {/* View All Link */}
      {showViewAll && hasMore && (
        <div className="text-center mt-10">
          <Link href={`/clinic/${tenantSlug}/providers`}>
            <Button 
              variant="outline" 
              size="lg"
              className="group"
              style={{ 
                borderColor: brandingColor || 'var(--zenthea-teal)',
                color: brandingColor || 'var(--zenthea-teal)',
              }}
            >
              View All {providers.length} Providers
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default ProviderGallery;


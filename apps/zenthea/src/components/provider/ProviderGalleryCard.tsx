'use client';

import React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Calendar, CheckCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PublicProviderData {
  _id: string;
  displayName: string;
  title: string;
  bio: string;
  photo?: string;
  specialties: string[];
  languages?: string[];
  acceptingNewPatients: boolean;
  bookingEnabled?: boolean;
}

interface ProviderGalleryCardProps {
  provider: PublicProviderData;
  onClick: () => void;
  onBookClick?: () => void;
  isBookingEnabled?: boolean;
  brandingColor?: string;
  animationDelay?: number;
  featured?: boolean;
}

/**
 * ProviderGalleryCard
 * 
 * An elegant card component for displaying provider information in a gallery grid.
 * Features:
 * - Professional photo with fallback avatar
 * - Hover effects with subtle scale and shadow
 * - Accepting patients badge
 * - Quick book action
 * - Staggered entrance animation support
 */
export function ProviderGalleryCard({
  provider,
  onClick,
  onBookClick,
  isBookingEnabled = true,
  brandingColor,
  animationDelay = 0,
  featured = false,
}: ProviderGalleryCardProps) {
  const handleBookClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookClick?.();
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-white rounded-2xl overflow-hidden cursor-pointer',
        'border border-border-primary/50 shadow-sm',
        'transition-all duration-300 ease-out',
        'hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1',
        'animate-gallery-item',
        featured && 'ring-2 ring-interactive-primary/30'
      )}
      style={{
        animationDelay: `${animationDelay}ms`,
        '--brand-color': brandingColor || 'var(--zenthea-teal)',
      } as React.CSSProperties}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`View ${provider.displayName}'s profile`}
    >
      {/* Photo Container - 4:5 aspect ratio */}
      <div className="relative aspect-[4/5] bg-gradient-to-b from-background-secondary to-surface-elevated overflow-hidden">
        {provider.photo ? (
          <Image
            src={provider.photo}
            alt={`${provider.displayName} - ${provider.title}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="w-32 h-32 rounded-full flex items-center justify-center"
              style={{ backgroundColor: brandingColor || 'var(--zenthea-teal)' }}
            >
              <User className="w-16 h-16 text-white" />
            </div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Accepting Patients Badge */}
        {provider.acceptingNewPatients && (
          <div className="absolute top-4 right-4">
            <Badge 
              className="bg-status-success/95 text-white border-0 shadow-lg backdrop-blur-sm"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Accepting Patients
            </Badge>
          </div>
        )}

        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-4 left-4">
            <Badge 
              className="text-white border-0 shadow-lg backdrop-blur-sm"
              style={{ backgroundColor: brandingColor || 'var(--zenthea-teal)' }}
            >
              <Star className="w-3 h-3 mr-1 fill-current" />
              Featured
            </Badge>
          </div>
        )}

        {/* Hover Actions */}
        {isBookingEnabled && provider.bookingEnabled !== false && (
          <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <Button
              onClick={handleBookClick}
              className="w-full text-white shadow-lg backdrop-blur-sm"
              style={{ backgroundColor: brandingColor || 'var(--zenthea-teal)' }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-lg text-text-primary group-hover:text-interactive-primary transition-colors line-clamp-1">
          {provider.displayName}
        </h3>
        <p className="text-sm text-text-secondary mt-1 line-clamp-1">
          {provider.title}
        </p>
        
        {/* Specialties */}
        {provider.specialties && provider.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {provider.specialties.slice(0, 2).map((specialty, idx) => (
              <Badge 
                key={idx} 
                variant="outline" 
                className="text-xs bg-background-secondary border-border-primary/50"
              >
                {specialty}
              </Badge>
            ))}
            {provider.specialties.length > 2 && (
              <Badge 
                variant="outline" 
                className="text-xs bg-background-secondary border-border-primary/50"
              >
                +{provider.specialties.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Bio Preview */}
        <p className="text-sm text-text-tertiary mt-3 line-clamp-2">
          {provider.bio}
        </p>
      </div>
    </div>
  );
}

export default ProviderGalleryCard;


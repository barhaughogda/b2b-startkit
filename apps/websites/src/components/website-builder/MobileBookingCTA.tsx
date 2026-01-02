'use client';

/**
 * MobileBookingCTA
 * 
 * A sticky bottom bar that appears on mobile devices with a prominent
 * "Book Appointment" button for easy access while scrolling.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar, Phone, X } from 'lucide-react';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================

export interface MobileBookingCTAProps {
  /** URL for the booking page */
  bookUrl?: string;
  /** Text for the booking button */
  bookText?: string;
  /** Phone number for direct call */
  phoneNumber?: string;
  /** Primary color for theming */
  primaryColor?: string;
  /** Whether in preview/edit mode */
  isPreview?: boolean;
  /** Whether to show the phone option */
  showPhone?: boolean;
  /** Tenant name for accessibility */
  tenantName?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MobileBookingCTA({
  bookUrl = '/book',
  bookText = 'Book Appointment',
  phoneNumber,
  primaryColor,
  isPreview = false,
  showPhone = true,
  tenantName = 'Clinic',
}: MobileBookingCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show CTA after scrolling past the hero section (roughly 300px)
      const shouldShow = window.scrollY > 300;
      setIsVisible(shouldShow && !isDismissed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  // Don't render in preview mode or when dismissed
  if (isPreview || !isVisible) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    // Reset after 60 seconds so it can show again if user continues browsing
    setTimeout(() => setIsDismissed(false), 60000);
  };

  const handlePhoneClick = () => {
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
    }
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the sticky bar */}
      <div className="md:hidden h-20" aria-hidden="true" />
      
      {/* Sticky CTA Bar */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40 md:hidden',
          'bg-background-primary border-t border-border-primary shadow-lg',
          'transition-transform duration-300 ease-out',
          isVisible ? 'translate-y-0' : 'translate-y-full'
        )}
        role="region"
        aria-label={`Book appointment with ${tenantName}`}
      >
        <div 
          className="flex items-center justify-between gap-3 px-4 py-3 safe-area-inset-bottom bg-surface-elevated"
          style={{ backgroundColor: 'var(--color-surface-elevated)' }}
        >
          {/* Call Button (if phone is available) */}
          {showPhone && phoneNumber && (
            <Button
              variant="outline"
              size="lg"
              onClick={handlePhoneClick}
              className="flex-shrink-0"
              aria-label={`Call ${tenantName} at ${phoneNumber}`}
            >
              <Phone className="w-5 h-5" />
            </Button>
          )}

          {/* Book Button */}
          <Link href={bookUrl} className="flex-1">
            <Button
              size="lg"
              className="w-full text-white font-semibold"
              style={{ backgroundColor: primaryColor || 'var(--zenthea-teal)' }}
            >
              <Calendar className="w-5 h-5 mr-2" />
              {bookText}
            </Button>
          </Link>

          {/* Dismiss Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="flex-shrink-0 text-text-secondary hover:text-text-primary"
            aria-label="Dismiss booking bar"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </>
  );
}

export default MobileBookingCTA;


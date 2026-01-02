'use client';

/**
 * SkipLinks Component
 * 
 * Provides skip navigation links for keyboard users to quickly
 * jump to main content areas without tabbing through navigation.
 * 
 * @accessibility
 * - Links are visually hidden until focused
 * - Appear at top of viewport when focused
 * - High contrast colors for visibility
 */

import React from 'react';
import { SKIP_LINK_TARGETS } from '@/lib/website-builder/accessibility';

export interface SkipLinksProps {
  /** Whether to show the booking skip link */
  showBookingLink?: boolean;
  /** Custom labels for skip links */
  customLabels?: {
    mainContent?: string;
    navigation?: string;
    footer?: string;
    booking?: string;
  };
}

export function SkipLinks({
  showBookingLink = true,
  customLabels,
}: SkipLinksProps) {
  const labels = {
    mainContent: customLabels?.mainContent || 'Skip to main content',
    navigation: customLabels?.navigation || 'Skip to navigation',
    footer: customLabels?.footer || 'Skip to footer',
    booking: customLabels?.booking || 'Skip to booking',
  };

  // Ensure showBookingLink is always a boolean to prevent hydration mismatches
  const shouldShowBooking = Boolean(showBookingLink);

  return (
    <div className="skip-links">
      <a
        href={`#${SKIP_LINK_TARGETS.MAIN_CONTENT}`}
        className="skip-link"
      >
        {labels.mainContent}
      </a>
      <a
        href={`#${SKIP_LINK_TARGETS.NAVIGATION}`}
        className="skip-link"
      >
        {labels.navigation}
      </a>
      {shouldShowBooking && (
        <a
          href={`#${SKIP_LINK_TARGETS.BOOKING}`}
          className="skip-link"
        >
          {labels.booking}
        </a>
      )}
      <a
        href={`#${SKIP_LINK_TARGETS.FOOTER}`}
        className="skip-link"
      >
        {labels.footer}
      </a>

      <style jsx>{`
        .skip-links {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 9999;
        }

        .skip-link {
          position: absolute;
          left: -9999px;
          top: auto;
          width: 1px;
          height: 1px;
          overflow: hidden;
          padding: 1rem 1.5rem;
          background-color: var(--zenthea-teal, #5FBFAF);
          color: white;
          font-weight: 600;
          text-decoration: none;
          border-radius: 0 0 0.5rem 0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .skip-link:focus {
          position: fixed;
          top: 0;
          left: 0;
          width: auto;
          height: auto;
          outline: 3px solid var(--zenthea-purple, #5F284A);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

export default SkipLinks;


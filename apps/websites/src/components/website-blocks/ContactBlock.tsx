'use client';

/**
 * Contact Block
 * 
 * Displays contact information including phone, email, address, and hours.
 * Now fetches real opening hours from the opening hours system.
 */

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ContactBlockProps } from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection, useAppearanceStyles } from './BlockSection';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Phone, Mail, MapPin, Clock, ExternalLink } from 'lucide-react';
import { getPrimaryColor, getPrimaryTextColor, getSecondaryTextColor, getTertiaryTextColor } from '@/lib/website-builder/theme-utils';

export interface ContactBlockComponentProps extends BlockComponentProps<ContactBlockProps> {}

export default function ContactBlock({
  props,
  tenantId,
  isPreview,
  theme,
  appearance,
  blockId,
}: ContactBlockComponentProps) {
  const {
    title,
    subtitle,
    showPhone = true,
    showEmail = true,
    showAddress = true,
    showHours = true,
    showMap = false,
    layout = 'card-grid',
  } = props;

  // Fetch tenant contact info
  const tenantData = useQuery(
    api.tenantBranding.getTenantBranding,
    tenantId ? { tenantId } : 'skip'
  );

  // Fetch company opening hours summary
  const openingHoursSummary = useQuery(
    (api as any).openingHours.getOpeningHoursSummary,
    tenantId && !isPreview ? { tenantId } : 'skip'
  );

  const isLoading = tenantData === undefined;

  // Placeholder data for preview
  const placeholderContact = {
    phone: '(555) 123-4567',
    email: 'info@clinic.com',
    address: {
      street: '123 Healthcare Ave',
      city: 'Medical City',
      state: 'CA',
      zipCode: '90210',
      country: 'USA',
    },
  };

  const contactInfo = tenantData?.contactInfo || (isPreview ? placeholderContact : null);
  const clinicName = tenantData?.name || 'Our Clinic';

  // Default hours for preview, or use real hours from query
  const placeholderHours = [
    { day: 'Monday - Friday', hours: '8:00 AM - 6:00 PM' },
    { day: 'Saturday', hours: '9:00 AM - 2:00 PM' },
    { day: 'Sunday', hours: 'Closed' },
  ];

  // Transform opening hours summary lines into the expected format
  const hours = React.useMemo(() => {
    if (isPreview || !openingHoursSummary?.lines) {
      return placeholderHours;
    }
    
    // Parse lines like "Mon-Fri: 9:00 AM - 5:00 PM" into { day, hours } format
    return openingHoursSummary.lines.map((line: string) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        return { day: line, hours: '' };
      }
      return {
        day: line.substring(0, colonIndex).trim(),
        hours: line.substring(colonIndex + 1).trim(),
      };
    });
  }, [isPreview, openingHoursSummary]);

  const formatAddress = (address: { street: string; city: string; state: string; zipCode: string }) => {
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
  };

  const getMapUrl = (address: { street: string; city: string; state: string; zipCode: string }) => {
    const query = encodeURIComponent(formatAddress(address));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  /**
   * Generates a Google Maps embed URL (no API key required).
   * Uses the standard embed endpoint with output=embed parameter.
   * Returns empty string if address is incomplete to prevent broken iframe.
   */
  const getMapEmbedUrl = (address: { street: string; city: string; state: string; zipCode: string }) => {
    // Validate address fields exist
    if (!address.street || !address.city || !address.state || !address.zipCode) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Incomplete address provided for map embed:', address);
      }
      return ''; // Return empty string to prevent broken iframe
    }
    
    try {
      const query = encodeURIComponent(formatAddress(address));
      return `https://www.google.com/maps?q=${query}&output=embed`;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to encode address for map embed:', error);
      }
      return ''; // Fallback to prevent broken iframe
    }
  };

  const primaryColor = getPrimaryColor(theme);
  const primaryTextColor = getPrimaryTextColor(theme);
  const secondaryTextColor = getSecondaryTextColor(theme);
  const tertiaryTextColor = getTertiaryTextColor(theme);

  // Get appearance styles (appearance text color overrides theme)
  const { textColor: appearanceTextColor } = useAppearanceStyles(appearance, theme);

  // Use appearance text color if set, otherwise fall back to theme colors
  const titleColor = appearanceTextColor || primaryTextColor;
  const subtitleColor = appearanceTextColor || secondaryTextColor;

  // Compute map embed URL if needed (to avoid calling function multiple times)
  const mapEmbedUrl = showMap && contactInfo?.address 
    ? getMapEmbedUrl(contactInfo.address) 
    : null;

  const ContactCard = ({ 
    icon: Icon, 
    label, 
    value, 
    href,
    external 
  }: { 
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; 
    label: string; 
    value: React.ReactNode;
    href?: string;
    external?: boolean;
  }) => (
    <Card className="h-full">
      <CardContent className="p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
        <div 
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${primaryColor}1a` }}
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: primaryColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm mb-1" style={{ color: secondaryTextColor }}>{label}</p>
          {href && !isPreview ? (
            <a 
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className="font-medium transition-colors flex items-center gap-1 text-sm sm:text-base break-words"
              style={{ color: primaryTextColor }}
              onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
              onMouseLeave={(e) => (e.currentTarget.style.color = primaryTextColor)}
            >
              <span className="break-words">{value}</span>
              {external && <ExternalLink className="w-3 h-3 flex-shrink-0" />}
            </a>
          ) : (
            <p className="font-medium text-sm sm:text-base break-words" style={{ color: primaryTextColor }}>{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <BlockSection
      appearance={appearance}
      theme={theme}
      blockType="contact"
      as="section"
      id="contact"
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

        {/* Loading state */}
        {isLoading && !isPreview && (
          <div className={cn(
            layout === 'card-grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
              : layout === 'horizontal'
              ? 'flex flex-wrap justify-center gap-8'
              : 'space-y-4 max-w-xl mx-auto'
          )}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-surface-secondary rounded-lg mb-4" />
                  <div className="h-4 bg-surface-secondary rounded w-1/2 mb-2" />
                  <div className="h-5 bg-surface-secondary rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Contact Info */}
        {(!isLoading || isPreview) && contactInfo && (
          <div className={cn(
            layout === 'card-grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'
              : layout === 'horizontal'
              ? 'flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8'
              : 'space-y-3 sm:space-y-4 max-w-xl mx-auto'
          )}>
            {showPhone && contactInfo.phone && (
              <ContactCard
                icon={Phone}
                label="Phone"
                value={contactInfo.phone}
                href={`tel:${contactInfo.phone}`}
              />
            )}

            {showEmail && contactInfo.email && (
              <ContactCard
                icon={Mail}
                label="Email"
                value={contactInfo.email}
                href={`mailto:${contactInfo.email}`}
              />
            )}

            {showAddress && contactInfo.address && (
              <ContactCard
                icon={MapPin}
                label="Address"
                value={
                  <span>
                    {contactInfo.address.street}<br />
                    {contactInfo.address.city}, {contactInfo.address.state} {contactInfo.address.zipCode}
                  </span>
                }
                href={getMapUrl(contactInfo.address)}
                external
              />
            )}

            {showHours && (
              <Card className="h-full">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div 
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primaryColor}1a` }}
                    >
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: primaryColor }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm mb-1" style={{ color: secondaryTextColor }}>Hours</p>
                      <div className="space-y-1">
                        {hours.map((h: { day: string; hours: string }, i: number) => (
                          <div key={i} className="text-xs sm:text-sm">
                            <span className="font-medium" style={{ color: primaryTextColor }}>{h.day}:</span>{' '}
                            <span style={{ color: secondaryTextColor }}>{h.hours}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Map embed (optional) */}
        {showMap && contactInfo?.address && (
          <div className="mt-8">
            <Card>
              <CardContent className="p-0 overflow-hidden rounded-lg">
                <div className="aspect-video bg-surface-secondary">
                  {mapEmbedUrl ? (
                    <iframe
                      src={mapEmbedUrl}
                      title={`${clinicName} location map`}
                      className="w-full h-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <div className="text-center">
                        <p className="text-sm mb-2" style={{ color: secondaryTextColor }}>
                          Map unavailable
                        </p>
                        <a
                          href={getMapUrl(contactInfo.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline"
                          style={{ color: primaryColor }}
                        >
                          View on Google Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </BlockSection>
  );
}

'use client';

/**
 * Clinics Block
 * 
 * Displays clinic locations with address, hours, phone, and map links.
 * Now fetches real opening hours from the opening hours system.
 */

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ClinicsBlockProps } from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection, useAppearanceStyles } from './BlockSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MapPin, Phone, Clock, Navigation, Building2 } from 'lucide-react';
import { getPrimaryColor, getPrimaryTextColor, getSecondaryTextColor, getTertiaryTextColor, getButtonHoverBgColor, getButtonHoverTextColor } from '@/lib/website-builder/theme-utils';

export interface ClinicsBlockComponentProps extends BlockComponentProps<ClinicsBlockProps> {}

export default function ClinicsBlock({
  props,
  tenantId,
  isPreview,
  theme,
  appearance,
  blockId,
}: ClinicsBlockComponentProps) {
  const {
    title,
    subtitle,
    showMap = true,
    showHours = true,
    showPhone = true,
    layout = 'grid',
  } = props;

  // Fetch tenant data for contact info
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
  const placeholderLocations = [
    {
      id: '1',
      name: 'Main Clinic',
      address: {
        street: '123 Healthcare Ave',
        city: 'Medical City',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
      },
      phone: '(555) 123-4567',
      hours: 'Mon-Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 2:00 PM',
    },
    {
      id: '2',
      name: 'Downtown Office',
      address: {
        street: '456 Wellness Blvd',
        city: 'Medical City',
        state: 'CA',
        zipCode: '90211',
        country: 'USA',
      },
      phone: '(555) 987-6543',
      hours: 'Mon-Fri: 9:00 AM - 7:00 PM',
    },
  ];

  // Get the hours string - use real data if available, fallback to placeholder
  const getHoursDisplay = () => {
    if (openingHoursSummary?.summary) {
      return openingHoursSummary.summary;
    }
    return 'Contact us for hours';
  };

  // Create location from tenant contact info
  const locations = tenantData?.contactInfo
    ? [{
        id: tenantId,
        name: tenantData.name || 'Our Location',
        address: tenantData.contactInfo.address,
        phone: tenantData.contactInfo.phone,
        hours: getHoursDisplay(),
      }]
    : (isPreview ? placeholderLocations : []);

  const formatAddress = (address: { street: string; city: string; state: string; zipCode: string }) => {
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
  };

  const getMapUrl = (address: { street: string; city: string; state: string; zipCode: string }) => {
    const query = encodeURIComponent(formatAddress(address));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
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

  return (
    <BlockSection
      appearance={appearance}
      theme={theme}
      blockType="clinics"
      as="section"
      id="locations"
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
            layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'
          )}>
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-surface-secondary rounded w-1/2 mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-surface-secondary rounded w-3/4" />
                    <div className="h-4 bg-surface-secondary rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Locations */}
        {(!isLoading || isPreview) && (
          <div className={cn(
            layout === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
              : layout === 'list'
              ? 'space-y-4'
              : 'grid grid-cols-1 lg:grid-cols-3 gap-6'
          )}>
            {locations.map((location) => (
              <Card key={location.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" style={{ color: primaryColor }} />
                    {location.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: tertiaryTextColor }} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words" style={{ color: primaryTextColor }}>{location.address.street}</p>
                      <p className="break-words" style={{ color: secondaryTextColor }}>
                        {location.address.city}, {location.address.state} {location.address.zipCode}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  {showPhone && location.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 flex-shrink-0" style={{ color: tertiaryTextColor }} />
                      <a 
                        href={`tel:${location.phone}`}
                        className="hover:underline"
                        style={{ color: primaryColor }}
                      >
                        {location.phone}
                      </a>
                    </div>
                  )}

                  {/* Hours */}
                  {showHours && location.hours && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 flex-shrink-0" style={{ color: tertiaryTextColor }} />
                      <span style={{ color: secondaryTextColor }}>{location.hours}</span>
                    </div>
                  )}

                  {/* Map Link */}
                  {showMap && (
                    isPreview ? (
                      <Button
                        variant="outline"
                        className="w-full mt-4 min-h-[44px] bg-transparent"
                        style={{
                          borderColor: primaryColor,
                          color: primaryColor,
                          backgroundColor: 'transparent',
                          borderRadius: 'var(--theme-radius)',
                        }}
                        onMouseEnter={(e) => {
                          // Store original background if not already stored
                          if (!e.currentTarget.getAttribute('data-original-bg')) {
                            const computedBg = window.getComputedStyle(e.currentTarget).backgroundColor;
                            e.currentTarget.setAttribute('data-original-bg', computedBg);
                          }
                          // Always use darker hover color for visual feedback
                          e.currentTarget.style.backgroundColor = getButtonHoverBgColor(theme);
                          e.currentTarget.style.color = getButtonHoverTextColor(theme);
                        }}
                        onMouseLeave={(e) => {
                          // Restore original background
                          const originalBg = e.currentTarget.getAttribute('data-original-bg');
                          if (originalBg && originalBg !== 'rgba(0, 0, 0, 0)' && originalBg !== 'transparent') {
                            e.currentTarget.style.backgroundColor = originalBg;
                          } else {
                            e.currentTarget.style.backgroundColor = '';
                          }
                          e.currentTarget.style.color = primaryColor;
                        }}
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Get Directions
                      </Button>
                    ) : (
                      <a
                        href={getMapUrl(location.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          className="w-full mt-4 min-h-[44px]"
                          style={{
                            borderColor: primaryColor,
                            color: primaryColor,
                            borderRadius: 'var(--theme-radius)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = primaryColor;
                            e.currentTarget.style.color = getButtonHoverTextColor(theme);
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '';
                            e.currentTarget.style.color = primaryColor;
                          }}
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Get Directions
                        </Button>
                      </a>
                    )
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && locations.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: tertiaryTextColor }} />
            <p style={{ color: secondaryTextColor }}>
              Location information coming soon.
            </p>
          </div>
        )}
    </BlockSection>
  );
}

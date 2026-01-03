'use client';

/**
 * Care Team Block
 * 
 * Displays healthcare providers in a grid or carousel layout.
 * Integrates with existing provider data from Convex.
 */

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { CareTeamBlockProps } from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection, useAppearanceStyles } from './BlockSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { User, Award } from 'lucide-react';
import Link from 'next/link';
import { getPrimaryColor, getPrimaryTextColor, getSecondaryTextColor, getTertiaryTextColor, getButtonHoverBgColor, getButtonHoverTextColor } from '@/lib/website-builder/theme-utils';

export interface CareTeamBlockComponentProps extends BlockComponentProps<CareTeamBlockProps> {}

// Unified provider type for both real and placeholder data
interface DisplayProvider {
  id: string;
  displayName: string;
  title: string;
  specialties: string[];
  certifications?: string[];
  photo?: string | null;
}

export default function CareTeamBlock({
  props,
  tenantId,
  isPreview,
  theme,
  bookUrl,
  appearance,
  blockId,
}: CareTeamBlockComponentProps) {
  const {
    title,
    subtitle,
    maxProviders = 4,
    showSpecialties = true,
    showCredentials = true,
    showBookButton = true,
    layout = 'grid',
  } = props;

  // Fetch providers from Convex
  const rawProviders = useQuery(
    api.publicLanding.getPublicProviderProfiles,
    tenantId ? { tenantId, limit: maxProviders } : 'skip'
  );

  const isLoading = rawProviders === undefined;

  // Transform Convex data to unified display format
  const providers: DisplayProvider[] = rawProviders
    ? rawProviders.map((p) => ({
        id: p._id,
        displayName: p.displayName,
        title: p.title,
        specialties: p.specialties || [],
        certifications: p.certifications,
        photo: p.photo,
      }))
    : [];

  // Placeholder data for preview mode
  const placeholderProviders: DisplayProvider[] = [
    {
      id: '1',
      displayName: 'Dr. Sarah Johnson',
      title: 'Family Medicine',
      specialties: ['Primary Care', 'Pediatrics'],
      certifications: ['MD', 'FAAFP'],
      photo: null,
    },
    {
      id: '2',
      displayName: 'Dr. Michael Chen',
      title: 'Internal Medicine',
      specialties: ['Internal Medicine', 'Geriatrics'],
      certifications: ['MD', 'MBA'],
      photo: null,
    },
    {
      id: '3',
      displayName: 'Dr. Emily Rodriguez',
      title: 'Pediatrics',
      specialties: ['Pediatrics', 'Adolescent Medicine'],
      certifications: ['MD', 'FAAP'],
      photo: null,
    },
    {
      id: '4',
      displayName: 'Dr. James Williams',
      title: 'Urgent Care',
      specialties: ['Emergency Medicine', 'Urgent Care'],
      certifications: ['DO', 'FACEP'],
      photo: null,
    },
  ];

  const displayProviders = (isLoading && isPreview) 
    ? placeholderProviders.slice(0, maxProviders) 
    : (providers.length > 0 ? providers : []).slice(0, maxProviders);

  // Get initials from display name (e.g., "Dr. Sarah Johnson" -> "SJ")
  const getInitials = (displayName: string) => {
    const parts = displayName.replace(/^(Dr\.\s*|Mr\.\s*|Mrs\.\s*|Ms\.\s*)/i, '').trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
    }
    return parts[0] ? parts[0].charAt(0).toUpperCase() : '?';
  };

  // Get first name from display name for "Book with" button
  const getFirstName = (displayName: string) => {
    const name = displayName.replace(/^(Dr\.\s*)/i, '').trim();
    return name.split(' ')[0];
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
      blockType="care-team"
      as="section"
      blockId={blockId}
    >
      {/* Header */}
      <div className="text-center mb-12">
          <h2
            id="care-team-title"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(maxProviders)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 text-center">
                  <div className="w-24 h-24 rounded-full bg-surface-secondary mx-auto mb-4" />
                  <div className="h-6 bg-surface-secondary rounded w-3/4 mx-auto mb-2" />
                  <div className="h-4 bg-surface-secondary rounded w-1/2 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Providers Grid */}
        {(!isLoading || isPreview) && (
          <div className={cn(
            layout === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'
              : 'flex overflow-x-auto gap-4 sm:gap-6 pb-4 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0'
          )}>
            {displayProviders.map((provider) => (
              <Card 
                key={provider.id}
                className={cn(
                  'group hover:shadow-lg transition-all duration-300 min-w-0',
                  layout === 'carousel' && 'flex-shrink-0 w-[280px] sm:w-72 snap-center'
                )}
              >
                <CardContent className="p-6 text-center">
                  {/* Avatar */}
                  <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-background-primary">
                    {provider.photo ? (
                      <AvatarImage src={provider.photo} alt={provider.displayName} />
                    ) : (
                      <AvatarFallback 
                        className="text-xl font-medium"
                        style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}
                      >
                        {getInitials(provider.displayName)}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {/* Name */}
                  <h3 className="text-lg font-semibold mb-1" style={{ color: primaryTextColor }}>
                    {provider.displayName}
                  </h3>

                  {/* Title */}
                  <p className="mb-3" style={{ color: secondaryTextColor }}>
                    {provider.title}
                  </p>

                  {/* Certifications */}
                  {showCredentials && provider.certifications && provider.certifications.length > 0 && (
                    <div className="flex items-center justify-center gap-1 mb-3">
                      <Award className="w-4 h-4" style={{ color: primaryColor }} />
                      <span className="text-sm" style={{ color: secondaryTextColor }}>
                        {provider.certifications.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Specialties */}
                  {showSpecialties && provider.specialties && provider.specialties.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                      {provider.specialties.slice(0, 2).map((specialty, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 text-xs rounded-full"
                          style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Book Button */}
                  {showBookButton && (
                    isPreview ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 min-h-[44px] focus:ring-2 focus:ring-offset-2 focus:outline-none bg-transparent"
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
                        aria-label={`Book an appointment with ${provider.displayName}`}
                      >
                        Book with {getFirstName(provider.displayName)}
                      </Button>
                    ) : (
                      <Link href={`${bookUrl || '/book'}?provider=${provider.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2 min-h-[44px] focus:ring-2 focus:ring-offset-2 focus:outline-none"
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
                          aria-label={`Book an appointment with ${provider.displayName}`}
                        >
                          Book with {getFirstName(provider.displayName)}
                        </Button>
                      </Link>
                    )
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && displayProviders.length === 0 && (
          <div className="text-center py-12">
            <User className="w-16 h-16 mx-auto mb-4" style={{ color: tertiaryTextColor }} />
            <p style={{ color: secondaryTextColor }}>
              No providers available at this time.
            </p>
          </div>
        )}
    </BlockSection>
  );
}

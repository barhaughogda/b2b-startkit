'use client';

/**
 * Services Block
 * 
 * Displays available services/appointment types from booking settings.
 * Supports custom icons (Lucide or uploaded SVG) and flexible pricing display.
 */

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ServicesBlockProps } from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection, useAppearanceStyles } from './BlockSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Clock, Heart, Stethoscope, Activity, Baby, Brain, Pill, Eye, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { getPrimaryColor, getPrimaryTextColor, getSecondaryTextColor, getTertiaryTextColor, getButtonHoverBgColor } from '@/lib/website-builder/theme-utils';
import { getLucideIcon, type ServiceIcon } from '@/lib/services/icons';
import { formatServicePrice as formatPriceUtil, type ServicePricing } from '@/lib/services/pricing';

export interface ServicesBlockComponentProps extends BlockComponentProps<ServicesBlockProps> {}

// Extended service type including new icon and pricing fields
interface ServiceData {
  id: string;
  name: string;
  description?: string;
  duration: number;
  enabled: boolean;
  allowOnline?: boolean;
  icon?: ServiceIcon;
  pricing?: ServicePricing;
  price?: number; // Legacy price field for backward compatibility
}

// Default service icon mapping for auto-detection
const serviceIcons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'primary': Heart,
  'urgent': Activity,
  'pediatric': Baby,
  'mental': Brain,
  'pharmacy': Pill,
  'vision': Eye,
  'default': Stethoscope,
};

/**
 * Get the fallback icon based on service name when no custom icon is set
 */
const getFallbackIcon = (serviceName: string) => {
  const name = serviceName.toLowerCase();
  if (name.includes('primary') || name.includes('wellness')) return serviceIcons['primary'];
  if (name.includes('urgent') || name.includes('emergency')) return serviceIcons['urgent'];
  if (name.includes('pediatric') || name.includes('child')) return serviceIcons['pediatric'];
  if (name.includes('mental') || name.includes('therapy') || name.includes('counseling')) return serviceIcons['mental'];
  if (name.includes('pharmacy') || name.includes('medication')) return serviceIcons['pharmacy'];
  if (name.includes('vision') || name.includes('eye') || name.includes('optical')) return serviceIcons['vision'];
  return serviceIcons['default'];
};

/**
 * Render the service icon - supports Lucide icons, custom SVGs, or auto-detected icons
 */
function ServiceIconRenderer({ 
  service, 
  primaryColor, 
  className = "w-6 h-6" 
}: { 
  service: ServiceData; 
  primaryColor: string;
  className?: string;
}) {
  // Check for custom icon first
  if (service.icon) {
    if (service.icon.kind === 'lucide') {
      const IconComponent = getLucideIcon(service.icon.name);
      if (IconComponent) {
        return <IconComponent className={className} style={{ color: primaryColor }} />;
      }
    }
    
    if (service.icon.kind === 'customSvg') {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          src={service.icon.url} 
          alt="" 
          className={cn(className, "object-contain")}
          style={{ filter: `drop-shadow(0 0 0 ${primaryColor})` }}
        />
      );
    }
  }
  
  // Fallback to auto-detected icon
  const FallbackIcon = getFallbackIcon(service.name);
  if (!FallbackIcon) return null;
  return <FallbackIcon className={className} style={{ color: primaryColor }} />;
}

/**
 * Format price for display, handling the new pricing structure and legacy price field
 * Wraps the utility function to return null instead of empty string for hidden/no price
 */
function formatBlockPrice(
  pricing?: ServicePricing, 
  legacyPrice?: number, 
  currency: string = 'USD'
): string | null {
  const result = formatPriceUtil(pricing, legacyPrice, currency);
  return result || null;
}

export default function ServicesBlock({
  props,
  tenantId,
  isPreview,
  theme,
  bookUrl,
  appearance,
  blockId,
}: ServicesBlockComponentProps) {
  const {
    title,
    subtitle,
    showDuration = true,
    showDescription = true,
    showPrice = true,
    layout = 'grid',
    maxServices,
  } = props as ServicesBlockProps & { showPrice?: boolean };

  // Fetch booking settings for appointment types
  const tenantData = useQuery(
    api.tenantBranding.getTenantBranding,
    tenantId ? { tenantId } : 'skip'
  );

  const isLoading = tenantData === undefined;

  // Placeholder services for preview (with pricing examples)
  const placeholderServices: ServiceData[] = [
    {
      id: '1',
      name: 'Primary Care',
      description: 'Comprehensive care for your everyday health needs.',
      duration: 30,
      enabled: true,
      icon: { kind: 'lucide', name: 'Heart' },
      pricing: { mode: 'fixed', amountCents: 15000, currency: 'USD' },
    },
    {
      id: '2',
      name: 'Urgent Care',
      description: 'Quick treatment for minor illnesses and injuries.',
      duration: 20,
      enabled: true,
      icon: { kind: 'lucide', name: 'Activity' },
      pricing: { mode: 'from', amountCents: 10000, currency: 'USD' },
    },
    {
      id: '3',
      name: 'Preventive Wellness',
      description: 'Annual checkups and health screenings.',
      duration: 45,
      enabled: true,
      icon: { kind: 'lucide', name: 'Shield' },
      pricing: { mode: 'range', minCents: 20000, maxCents: 35000, currency: 'USD' },
    },
    {
      id: '4',
      name: 'Mental Health',
      description: 'Support for your mental and emotional wellbeing.',
      duration: 60,
      enabled: true,
      icon: { kind: 'lucide', name: 'Brain' },
      pricing: { mode: 'fixed', amountCents: 25000, currency: 'USD' },
    },
    {
      id: '5',
      name: 'Pediatric Care',
      description: 'Specialized care for children and adolescents.',
      duration: 30,
      enabled: true,
      icon: { kind: 'lucide', name: 'Baby' },
      pricing: { mode: 'hidden' },
    },
    {
      id: '6',
      name: 'Telehealth Visit',
      description: 'Virtual consultations from the comfort of home.',
      duration: 20,
      enabled: true,
      icon: { kind: 'lucide', name: 'Video' },
      pricing: { mode: 'free' },
    },
  ];

  // Get services from booking settings
  const appointmentTypes = (tenantData?.bookingSettings?.appointmentTypes || []) as ServiceData[];
  const enabledServices = appointmentTypes.filter((s) => s.enabled && s.allowOnline !== false);
  
  let services: ServiceData[] = enabledServices.length > 0 
    ? enabledServices 
    : (isPreview ? placeholderServices : []);

  if (maxServices && services.length > maxServices) {
    services = services.slice(0, maxServices);
  }

  // Get tenant currency for price formatting (default to USD if not available)
  // Note: Individual services can specify currency in their pricing object
  const tenantCurrency = 'USD';

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
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
      blockType="services"
      as="section"
      blockId={blockId}
    >
      {/* Header */}
      <div className="text-center mb-12">
          <h2
            id="services-title"
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
            layout === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          )}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-surface-secondary rounded-lg mb-4" />
                  <div className="h-6 bg-surface-secondary rounded w-1/2 mb-2" />
                  <div className="h-4 bg-surface-secondary rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Services */}
        {(!isLoading || isPreview) && (
          <div className={cn(
            layout === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          )}>
            {services.map((service) => {
              const priceDisplay = showPrice 
                ? formatBlockPrice(service.pricing, service.price, tenantCurrency)
                : null;
              
              return (
                <Card
                  key={service.id}
                  className="group hover:shadow-lg transition-all duration-300"
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${primaryColor}80`)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
                >
                  <CardHeader>
                    <div
                      className="w-12 h-12 flex items-center justify-center mb-2 transition-colors"
                      style={{
                        backgroundColor: `${primaryColor}1a`,
                        borderRadius: 'var(--theme-radius)',
                      }}
                    >
                      <ServiceIconRenderer 
                        service={service} 
                        primaryColor={primaryColor}
                        className="w-6 h-6"
                      />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      {priceDisplay && (
                        <span 
                          className="text-sm font-semibold whitespace-nowrap flex-shrink-0"
                          style={{ color: primaryColor }}
                        >
                          {priceDisplay}
                        </span>
                      )}
                    </div>
                    {showDescription && service.description && (
                      <CardDescription>{service.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      {showDuration && service.duration && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: secondaryTextColor }}>
                          <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                          <span aria-label={`Duration: ${formatDuration(service.duration)}`}>
                            {formatDuration(service.duration)}
                          </span>
                        </div>
                      )}
                      {isPreview ? (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="focus:ring-2 focus:ring-offset-2 focus:outline-none hover:bg-transparent whitespace-nowrap min-h-[40px]"
                          style={{ color: primaryColor }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = getPrimaryColor(theme, 0.1);
                            e.currentTarget.style.color = primaryColor;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '';
                            e.currentTarget.style.color = primaryColor;
                          }}
                          aria-label={`Book ${service.name} appointment`}
                        >
                          Book →
                        </Button>
                      ) : (
                        <Link href={`${bookUrl || '/book'}?service=${service.id}`}>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="focus:ring-2 focus:ring-offset-2 focus:outline-none hover:bg-transparent whitespace-nowrap min-h-[40px]"
                            style={{ color: primaryColor }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = getButtonHoverBgColor(theme) + '1a'; // 10% opacity
                              e.currentTarget.style.color = primaryColor;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '';
                              e.currentTarget.style.color = primaryColor;
                            }}
                            aria-label={`Book ${service.name} appointment`}
                          >
                            Book →
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && services.length === 0 && (
          <div className="text-center py-12">
            <Stethoscope className="w-16 h-16 mx-auto mb-4" style={{ color: tertiaryTextColor }} />
            <p style={{ color: secondaryTextColor }}>
              Services information coming soon.
            </p>
          </div>
        )}
    </BlockSection>
  );
}

'use client';

/**
 * ServiceSelector Component
 * 
 * A reusable component for selecting services/appointment types in booking flows.
 * Displays service icons, names, durations, and prices.
 * Supports both Lucide icons and custom uploaded SVG icons.
 */

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Clock, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { getLucideIcon, type ServiceIcon } from '@/lib/services/icons';
import { formatServicePrice, type ServicePricing } from '@/lib/services/pricing';

// Service data structure (matching the schema)
export interface ServiceData {
  id: string;
  name: string;
  description?: string;
  duration: number;
  enabled: boolean;
  allowOnline?: boolean;
  icon?: ServiceIcon;
  pricing?: ServicePricing;
  price?: number; // Legacy price field
}

interface ServiceSelectorProps {
  /** Tenant ID to fetch services from */
  tenantId: string;
  /** Currently selected service ID */
  value?: string;
  /** Callback when a service is selected */
  onSelect: (service: ServiceData) => void;
  /** Layout style */
  layout?: 'grid' | 'list';
  /** Show prices */
  showPrice?: boolean;
  /** Show duration */
  showDuration?: boolean;
  /** Show description */
  showDescription?: boolean;
  /** Primary color for styling */
  primaryColor?: string;
  /** Filter to only show online-bookable services */
  onlineOnly?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Render a service icon (Lucide or custom SVG)
 */
function ServiceIconDisplay({ 
  icon, 
  serviceName,
  primaryColor,
  className = "w-6 h-6"
}: { 
  icon?: ServiceIcon; 
  serviceName: string;
  primaryColor: string;
  className?: string;
}) {
  // Check for custom icon
  if (icon) {
    if (icon.kind === 'lucide') {
      const IconComponent = getLucideIcon(icon.name);
      if (IconComponent) {
        return <IconComponent className={className} style={{ color: primaryColor }} />;
      }
    }
    
    if (icon.kind === 'customSvg') {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          src={icon.url} 
          alt="" 
          className={cn(className, "object-contain")}
        />
      );
    }
  }
  
  // Default icon
  return <Calendar className={className} style={{ color: primaryColor }} />;
}

/**
 * Format service price for display
 * Uses the centralized pricing utility from @/lib/services/pricing
 */
function getPriceDisplay(
  pricing?: ServicePricing, 
  legacyPrice?: number, 
  currency: string = 'USD'
): string | null {
  const formatted = formatServicePrice(pricing, legacyPrice, currency);
  return formatted || null;
}

/**
 * Format duration for display
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function ServiceSelector({
  tenantId,
  value,
  onSelect,
  layout = 'grid',
  showPrice = true,
  showDuration = true,
  showDescription = false,
  primaryColor = 'var(--tenant-primary, var(--zenthea-teal))',
  onlineOnly = true,
  className,
}: ServiceSelectorProps) {
  // Fetch booking settings
  const tenantData = useQuery(
    api.tenantBranding.getTenantBranding,
    tenantId ? { tenantId } : 'skip'
  );

  const isLoading = tenantData === undefined;

  // Get services from booking settings
  const appointmentTypes = (tenantData?.bookingSettings?.appointmentTypes || []) as ServiceData[];
  const services = onlineOnly
    ? appointmentTypes.filter((s) => s.enabled && s.allowOnline !== false)
    : appointmentTypes.filter((s) => s.enabled);

  // Get tenant currency (default to USD if not available)
  // Note: Individual services can specify currency in their pricing object
  const tenantCurrency = 'USD';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
        <span className="ml-2 text-sm text-text-secondary">Loading services...</span>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 mx-auto mb-3 text-text-tertiary" />
        <p className="text-sm text-text-secondary">
          No services available for online booking.
        </p>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'w-full',
        layout === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' 
          : 'space-y-2',
        className
      )}
    >
      {services.map((service) => {
        const isSelected = value === service.id;
        const priceDisplay = showPrice 
          ? getPriceDisplay(service.pricing, service.price, tenantCurrency)
          : null;

        return (
          <Button
            key={service.id}
            type="button"
            variant="outline"
            className={cn(
              'w-full p-4 justify-start text-left transition-all',
              'hover:shadow-md flex items-start',
              showDescription ? 'h-[140px]' : 'h-[100px]',
              isSelected && 'ring-2 ring-offset-2'
            )}
            style={{
              borderColor: isSelected ? primaryColor : undefined,
              backgroundColor: isSelected ? `${primaryColor}10` : undefined,
              ...(isSelected && { '--tw-ring-color': primaryColor } as React.CSSProperties),
            }}
            onClick={() => onSelect(service)}
          >
            <div className="flex items-start gap-3 w-full h-full">
              {/* Icon */}
              <div 
                className="flex-shrink-0 p-2 rounded-lg"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <ServiceIconDisplay 
                  icon={service.icon}
                  serviceName={service.name}
                  primaryColor={primaryColor}
                  className="w-5 h-5"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col h-full justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-text-primary truncate">
                      {service.name}
                    </p>
                    {priceDisplay && (
                      <span 
                        className="text-sm font-semibold whitespace-nowrap"
                        style={{ color: primaryColor }}
                      >
                        {priceDisplay}
                      </span>
                    )}
                  </div>

                  {showDescription && (
                    <p className={cn(
                      "text-xs text-text-secondary mt-1 line-clamp-2",
                      !service.description && "invisible"
                    )}>
                      {service.description || 'Placeholder text to maintain height'}
                    </p>
                  )}
                </div>

                {showDuration && (
                  <div className="flex items-center gap-1 mt-auto">
                    <Clock className="h-3 w-3 text-text-tertiary" />
                    <span className="text-xs text-text-tertiary">
                      {formatDuration(service.duration)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}

export default ServiceSelector;


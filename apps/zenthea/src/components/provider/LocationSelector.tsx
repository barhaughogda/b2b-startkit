'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { canUseConvexQuery } from '@/lib/convexIdValidation';

interface LocationSelectorProps {
  value?: string; // locationId as string
  onValueChange: (locationId: string) => void;
  providerId?: Id<'providers'>; // Optional: filter by provider's locations
  tenantId?: string; // Optional: override tenant ID
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showTelehealth?: boolean; // Include telehealth locations
  className?: string;
}

/**
 * LocationSelector Component
 * 
 * A reusable component for selecting locations from the Convex database.
 * Can filter by provider's assigned locations or show all tenant locations.
 * 
 * @example
 * ```tsx
 * <LocationSelector
 *   value={selectedLocationId}
 *   onValueChange={setSelectedLocationId}
 *   providerId={providerId}
 *   label="Appointment Location"
 * />
 * ```
 */
export function LocationSelector({
  value,
  onValueChange,
  providerId,
  tenantId: overrideTenantId,
  label = 'Location',
  placeholder = 'Select a location',
  required = false,
  disabled = false,
  showTelehealth = true,
  className,
}: LocationSelectorProps) {
  const { data: session } = useZentheaSession();
  const tenantId = overrideTenantId || session?.user?.tenantId || 'demo-tenant';

  // Check if we can use Convex queries
  const canQuery = canUseConvexQuery(session?.user?.id, tenantId);

  // Fetch locations based on whether we're filtering by provider
  const providerLocations = useQuery(
    (api as any).locations?.getProviderLocations,
    canQuery && providerId && tenantId
      ? {
          providerId,
          tenantId,
        }
      : 'skip'
  );

  const allLocations = useQuery(
    (api as any).locations?.getLocationsByTenant,
    canQuery && !providerId && tenantId
      ? {
          tenantId,
          limit: 100,
        }
      : 'skip'
  );

  // Determine which locations to use
  const locations = providerId ? providerLocations : allLocations;

  // Filter out telehealth if not wanted
  const filteredLocations = React.useMemo(() => {
    if (!locations) return [];
    
    const filtered = showTelehealth 
      ? locations 
      : locations.filter((loc: any) => loc?.type !== 'telehealth');
    
    // Sort by name
    return filtered.sort((a: any, b: any) => {
      if (!a || !b) return 0;
      if (!a.name || !b.name) return 0;
      return a.name.localeCompare(b.name);
    });
  }, [locations, showTelehealth]);

  // Loading state
  const isLoading = canQuery && locations === undefined;

  // Handle value change - convert to string if needed
  const handleValueChange = (newValue: string) => {
    if (newValue === 'none') {
      onValueChange('');
    } else {
      onValueChange(newValue);
    }
  };

  // Find the selected location to display clean value
  const selectedLocation = React.useMemo(() => {
    if (!value || value === 'none' || !filteredLocations) return null;
    return filteredLocations.find((loc: any) => loc?._id === value);
  }, [value, filteredLocations]);

  // Format display value for the trigger (name + type only)
  const displayValue = React.useMemo(() => {
    if (!selectedLocation) return undefined;
    const locationType = selectedLocation.type;
    const typeLabel = 
      locationType === 'telehealth' ? ' (Telehealth)' :
      locationType === 'hospital' ? ' (Hospital)' :
      ' (Office)';
    return `${selectedLocation.name}${typeLabel}`;
  }, [selectedLocation]);

  return (
    <div className={className}>
      {label && (
        <Label htmlFor="location-select" className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {label}
          {required && <span className="text-status-error">*</span>}
        </Label>
      )}
      <Select
        value={value || 'none'}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
        required={required}
      >
        <SelectTrigger
          id="location-select"
          aria-label={label || 'Select location'}
          className="w-full"
        >
          {displayValue ? (
            <span className="truncate">{displayValue}</span>
          ) : (
            <SelectValue placeholder={isLoading ? 'Loading locations...' : placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {!required && (
            <SelectItem value="none" textValue="No location">
              <span className="text-text-tertiary">No location</span>
            </SelectItem>
          )}
          {filteredLocations.length === 0 && !isLoading && (
            <SelectItem value="no-locations" disabled textValue="No locations available">
              No locations available
            </SelectItem>
          )}
          {filteredLocations.map((location: any) => {
            if (!location) return null;
            
            const locationId = location._id as string;
            const locationType = location.type;
            const typeLabel = 
              locationType === 'telehealth' ? ' (Telehealth)' :
              locationType === 'hospital' ? ' (Hospital)' :
              ' (Office)';
            
            // Format a clean text value for the trigger display (name + type only)
            const textValue = `${location.name}${typeLabel}`;
            
            // Format address for display in dropdown
            const addressText = location.address
              ? [
                  location.address.street,
                  location.address.city,
                  location.address.state,
                  location.address.zipCode,
                ]
                  .filter(Boolean)
                  .join(', ')
              : '';
            
            return (
              <SelectItem key={locationId} value={locationId} textValue={textValue}>
                <div className="flex flex-col w-full">
                  <span className="font-medium">{location.name}</span>
                  {addressText && (
                    <span className="text-xs text-text-tertiary mt-0.5">
                      {addressText}
                    </span>
                  )}
                  <span className="text-xs text-text-tertiary">{typeLabel}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {isLoading && (
        <p className="text-xs text-text-tertiary mt-1">Loading locations...</p>
      )}
    </div>
  );
}


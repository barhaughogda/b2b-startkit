'use client';

import React, { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { useSession } from 'next-auth/react';
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
import { Building2, Loader2, Globe } from 'lucide-react';
import { canUseConvexQuery } from '@/lib/convexIdValidation';
import { cn } from '@/lib/utils';

interface Clinic {
  _id: Id<'clinics'>;
  name: string;
  address?: string;
  timezone?: string;
  isActive?: boolean;
  tenantId: string;
}

export interface ClinicSelectorProps {
  value?: string; // clinicId as string
  onValueChange: (clinicId: string, clinic?: Clinic) => void;
  /** User ID to filter by - shows only clinics this user is assigned to */
  userId?: Id<'users'>;
  tenantId?: string; // Optional: override tenant ID
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showTimezone?: boolean; // Show timezone info
  className?: string;
}

/**
 * ClinicSelector Component
 * 
 * A reusable component for selecting clinics from the Convex database.
 * Shows clinics that a user/provider is assigned to for scheduling.
 * 
 * @example
 * ```tsx
 * <ClinicSelector
 *   value={selectedClinicId}
 *   onValueChange={(id, clinic) => {
 *     setSelectedClinicId(id);
 *     setSelectedClinicTimezone(clinic?.timezone);
 *   }}
 *   userId={selectedUserId}
 *   label="Appointment Location"
 * />
 * ```
 */
export function ClinicSelector({
  value,
  onValueChange,
  userId,
  tenantId: overrideTenantId,
  label = 'Clinic',
  placeholder = 'Select a clinic',
  required = false,
  disabled = false,
  showTimezone = true,
  className,
}: ClinicSelectorProps) {
  const { data: session } = useSession();
  const tenantId = overrideTenantId || session?.user?.tenantId || 'demo-tenant';

  // Check if we can use Convex queries
  const canQuery = canUseConvexQuery(session?.user?.id, tenantId);

  // Fetch clinics based on whether we're filtering by user
  const userClinics = useQuery(
    api.clinics.getUserClinics,
    canQuery && userId && tenantId
      ? {
          userId,
          tenantId,
        }
      : 'skip'
  ) as Clinic[] | undefined;

  // Fallback: Get all active clinics for the tenant if no userId provided
  const allClinics = useQuery(
    api.clinics.getClinicsByTenant,
    canQuery && !userId && tenantId
      ? {
          tenantId,
        }
      : 'skip'
  ) as Clinic[] | undefined;

  // Determine which clinics to use
  const clinics = userId ? userClinics : allClinics;

  // Filter and sort clinics
  const filteredClinics = useMemo(() => {
    if (!clinics) return [];
    
    // Only show active clinics
    const active = clinics.filter((clinic: Clinic) => clinic?.isActive !== false);
    
    // Sort by name
    return active.sort((a: Clinic, b: Clinic) => {
      if (!a?.name || !b?.name) return 0;
      return a.name.localeCompare(b.name);
    });
  }, [clinics]);

  // Loading state
  const isLoading = canQuery && clinics === undefined;

  // Handle value change - pass the full clinic data
  const handleValueChange = (newValue: string) => {
    if (newValue === 'none') {
      onValueChange('', undefined);
    } else {
      const clinic = filteredClinics.find((c: Clinic) => c?._id === newValue);
      onValueChange(newValue, clinic);
    }
  };

  // Find the selected clinic
  const selectedClinic = useMemo(() => {
    if (!value || value === 'none' || !filteredClinics) return null;
    return filteredClinics.find((clinic: Clinic) => clinic?._id === value);
  }, [value, filteredClinics]);

  // Format display value for the trigger
  const displayValue = useMemo(() => {
    if (!selectedClinic) return undefined;
    return selectedClinic.name;
  }, [selectedClinic]);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor="clinic-select" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" aria-hidden="true" />
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
          id="clinic-select"
          aria-label={label || 'Select clinic'}
          className="w-full"
        >
          {displayValue ? (
            <span className="truncate flex items-center gap-2">
              <Building2 className="h-4 w-4 text-zenthea-teal" />
              {displayValue}
            </span>
          ) : (
            <SelectValue placeholder={isLoading ? 'Loading clinics...' : placeholder} />
          )}
        </SelectTrigger>
        
        <SelectContent>
          {!required && (
            <SelectItem value="none" textValue="No clinic selected">
              <span className="text-text-tertiary">No clinic selected</span>
            </SelectItem>
          )}
          
          {filteredClinics.length === 0 && !isLoading && (
            <SelectItem value="no-clinics" disabled textValue="No clinics available">
              <div className="text-center py-2">
                <p className="text-text-secondary">No clinics available</p>
                <p className="text-xs text-text-tertiary">
                  {userId ? 'This provider has no assigned clinics' : 'No clinics found'}
                </p>
              </div>
            </SelectItem>
          )}
          
          {filteredClinics.map((clinic: Clinic) => {
            if (!clinic) return null;
            
            const clinicId = clinic._id as string;
            
            return (
              <SelectItem key={clinicId} value={clinicId} textValue={clinic.name}>
                <div className="flex flex-col w-full">
                  <span className="font-medium">{clinic.name}</span>
                  {clinic.address && (
                    <span className="text-xs text-text-tertiary mt-0.5 truncate max-w-[200px]">
                      {clinic.address}
                    </span>
                  )}
                  {showTimezone && clinic.timezone && (
                    <span className="text-xs text-text-tertiary flex items-center gap-1 mt-0.5">
                      <Globe className="h-3 w-3" />
                      {clinic.timezone}
                    </span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      
      {isLoading && (
        <div className="flex items-center gap-2 text-text-tertiary">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Loading clinics...</span>
        </div>
      )}
      
      {/* Show selected clinic timezone */}
      {selectedClinic?.timezone && showTimezone && (
        <p className="text-xs text-text-tertiary flex items-center gap-1">
          <Globe className="h-3 w-3" />
          Times shown in {selectedClinic.timezone}
        </p>
      )}
    </div>
  );
}

export default ClinicSelector;


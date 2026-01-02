'use client';

import React, { useMemo } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useClinics } from '@/hooks/useClinicProfile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Clinic {
  id: string;
  name: string;
  address?: any;
  timezone?: string;
  isActive?: boolean;
}

export interface ClinicSelectorProps {
  value?: string;
  onValueChange: (clinicId: string, clinic?: Clinic) => void;
  userId?: string;
  tenantId?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showTimezone?: boolean;
  className?: string;
}

export function ClinicSelector({
  value,
  onValueChange,
  userId,
  label = 'Clinic',
  placeholder = 'Select a clinic',
  required = false,
  disabled = false,
  showTimezone = true,
  className,
}: ClinicSelectorProps) {
  const { data: session } = useZentheaSession();
  const { clinics, isLoading } = useClinics();

  const filteredClinics = useMemo(() => {
    if (!clinics) return [];
    return clinics
      .filter((c: any) => c.isActive !== false)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [clinics]);

  const handleValueChange = (newValue: string) => {
    if (newValue === 'none') {
      onValueChange('', undefined);
    } else {
      const clinic = filteredClinics.find((c: any) => c.id === newValue);
      onValueChange(newValue, clinic);
    }
  };

  const selectedClinic = useMemo(() => {
    if (!value || value === 'none') return null;
    return filteredClinics.find((c: any) => c.id === value);
  }, [value, filteredClinics]);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor="clinic-select" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
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
        <SelectTrigger id="clinic-select" className="w-full">
          {selectedClinic ? (
            <span className="truncate flex items-center gap-2">
              <Building2 className="h-4 w-4 text-zenthea-teal" />
              {selectedClinic.name}
            </span>
          ) : (
            <SelectValue placeholder={isLoading ? 'Loading clinics...' : placeholder} />
          )}
        </SelectTrigger>
        
        <SelectContent>
          {!required && (
            <SelectItem value="none"><span className="text-text-tertiary">No clinic selected</span></SelectItem>
          )}
          
          {filteredClinics.length === 0 && !isLoading && (
            <SelectItem value="no-clinics" disabled>No clinics available</SelectItem>
          )}
          
          {filteredClinics.map((clinic: any) => (
            <SelectItem key={clinic.id} value={clinic.id}>
              <div className="flex flex-col w-full">
                <span className="font-medium">{clinic.name}</span>
                {showTimezone && clinic.timezone && (
                  <span className="text-xs text-text-tertiary flex items-center gap-1"><Globe className="h-3 w-3" />{clinic.timezone}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {isLoading && (
        <div className="flex items-center gap-2 text-text-tertiary">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Loading clinics...</span>
        </div>
      )}
    </div>
  );
}

export default ClinicSelector;

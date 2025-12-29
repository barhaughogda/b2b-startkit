'use client';

import React, { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, User, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCareTeam, CareTeamMember } from '@/hooks/useCareTeam';
import { Id } from '@/convex/_generated/dataModel';

export interface CareTeamProviderSelectorProps {
  value?: string; // providerId as string
  onValueChange: (providerId: string, member?: CareTeamMember) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showPrimaryBadge?: boolean;
  showSpecialty?: boolean;
  className?: string;
  /** Filter to only show providers available at a specific location */
  locationId?: Id<'locations'>;
}

/**
 * CareTeamProviderSelector Component
 * 
 * A specialized provider selector that only shows providers from the patient's
 * assigned care team. Prominently displays the primary provider.
 * 
 * @example
 * ```tsx
 * <CareTeamProviderSelector
 *   value={selectedProviderId}
 *   onValueChange={(id, member) => {
 *     setSelectedProviderId(id);
 *     setSelectedProviderName(member?.name);
 *   }}
 *   label="Select Provider"
 *   showPrimaryBadge
 * />
 * ```
 */
export function CareTeamProviderSelector({
  value,
  onValueChange,
  label = 'Healthcare Provider',
  placeholder = 'Select a provider from your care team',
  required = false,
  disabled = false,
  showPrimaryBadge = true,
  showSpecialty = true,
  className,
  locationId,
}: CareTeamProviderSelectorProps) {
  const { careTeam, primaryProvider, isLoading } = useCareTeam();
  // Sort care team: primary provider first
  const sortedCareTeam = useMemo(() => {
    if (!careTeam) return [];
    
    return [...careTeam].sort((a, b) => {
      // Primary provider always first
      if (a.isPrimaryProvider && !b.isPrimaryProvider) return -1;
      if (!a.isPrimaryProvider && b.isPrimaryProvider) return 1;
      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [careTeam]);

  // Normalize ID for consistent comparison (handles both Id<> types and strings)
  const normalizeId = (id: string | undefined | null): string => {
    if (!id) return '';
    return String(id).trim();
  };
  
  // Get selected member for callback - use normalized comparison
  const selectedMember = useMemo(() => {
    const normalizedValue = normalizeId(value);
    if (!normalizedValue) return undefined;
    return careTeam?.find((m) => normalizeId(m.providerId) === normalizedValue);
  }, [careTeam, value]);

  // Handle value change - pass the full member data
  const handleValueChange = (newValue: string) => {
    if (newValue === 'none') {
      onValueChange('', undefined);
    } else {
      const member = careTeam?.find((m) => normalizeId(m.providerId) === normalizeId(newValue));
      onValueChange(newValue, member);
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" aria-hidden="true" />
            {label}
            {required && <span className="text-status-error">*</span>}
          </Label>
        )}
        <div className="flex items-center gap-2 p-3 border border-border-primary rounded-md bg-surface-elevated">
          <Loader2
            className="h-4 w-4 animate-spin"
            style={{ color: 'var(--tenant-primary, var(--zenthea-teal))' }}
          />
          <span className="text-sm text-text-secondary">Loading your care team...</span>
        </div>
      </div>
    );
  }

  if (!careTeam || careTeam.length === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" aria-hidden="true" />
            {label}
            {required && <span className="text-status-error">*</span>}
          </Label>
        )}
        <div className="p-3 border border-border-primary rounded-md bg-surface-elevated text-center">
          <p className="text-sm text-text-secondary">
            No care team members found.
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            Please contact your clinic to be assigned to a care team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor="care-team-provider-select" className="flex items-center gap-2">
          <User className="h-4 w-4" aria-hidden="true" />
          {label}
          {required && <span className="text-status-error">*</span>}
        </Label>
      )}

      <Select
        value={value ? String(value) : 'none'}
        onValueChange={handleValueChange}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger
          id="care-team-provider-select"
          aria-label={label || 'Select provider'}
          className="w-full"
        >
          <SelectValue placeholder={placeholder}>
            {selectedMember && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedMember.professionalPhotoUrl} />
                  <AvatarFallback
                    className="text-xs text-white"
                    style={{ backgroundColor: 'var(--tenant-primary, var(--zenthea-teal))' }}
                  >
                    {getInitials(selectedMember.name)}
                  </AvatarFallback>
                </Avatar>
                <span>{selectedMember.name}</span>
                {selectedMember.isPrimaryProvider && showPrimaryBadge && (
                  <Star className="h-3 w-3 text-status-warning fill-status-warning" />
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {!required && (
            <SelectItem value="none">
              <span className="text-text-tertiary">No provider selected</span>
            </SelectItem>
          )}

          {/* Primary Provider Section */}
          {primaryProvider && sortedCareTeam.some((m) => m.isPrimaryProvider) && (
            <div className="px-2 py-1 text-xs font-medium text-text-secondary border-b border-border-primary mb-1">
              Primary Provider
            </div>
          )}

          {sortedCareTeam.map((member, index) => {
            // Add divider before non-primary providers
            const showOtherProvidersHeader =
              index > 0 &&
              sortedCareTeam[index - 1]?.isPrimaryProvider &&
              !member.isPrimaryProvider;

            return (
              <React.Fragment key={member.providerId}>
                {showOtherProvidersHeader && (
                  <div className="px-2 py-1 text-xs font-medium text-text-secondary border-t border-border-primary mt-1 pt-2">
                    Care Team
                  </div>
                )}
                <SelectItem value={String(member.providerId)}>
                  <div className="flex items-center gap-3 py-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.professionalPhotoUrl} />
                      <AvatarFallback
                        className="text-xs text-white"
                        style={{ backgroundColor: 'var(--tenant-primary, var(--zenthea-teal))' }}
                      >
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        {member.isPrimaryProvider && showPrimaryBadge && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1 py-0 h-4 bg-status-warning/10 text-status-warning border-status-warning/30"
                          >
                            <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      {showSpecialty && (
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" />
                          {member.specialty || member.role}
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              </React.Fragment>
            );
          })}
        </SelectContent>
      </Select>

      {/* Helper text showing number of care team members */}
      <p className="text-xs text-text-tertiary">
        {careTeam.length} provider{careTeam.length !== 1 ? 's' : ''} in your care team
      </p>
    </div>
  );
}

/**
 * Compact version for inline use in cards or modals
 */
export function CompactCareTeamSelector({
  value,
  onValueChange,
  disabled = false,
  className,
}: Pick<CareTeamProviderSelectorProps, 'value' | 'onValueChange' | 'disabled' | 'className'>) {
  const { careTeam, isLoading } = useCareTeam();

  // Normalize ID for consistent comparison
  const normalizeId = (id: string | undefined | null): string => {
    if (!id) return '';
    return String(id).trim();
  };

  const handleValueChange = (newValue: string) => {
    const member = careTeam?.find((m) => normalizeId(m.providerId) === normalizeId(newValue));
    onValueChange(newValue, member);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!careTeam || careTeam.length === 0) {
    return (
      <span className="text-sm text-text-secondary">No care team available</span>
    );
  }

  // Normalize value for Select component
  const normalizedValue = normalizeId(value);

  return (
    <Select value={normalizedValue || ''} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className={cn('h-8 text-sm', className)}>
        <SelectValue placeholder="Select provider" />
      </SelectTrigger>
      <SelectContent>
        {careTeam.map((member) => (
          <SelectItem key={member.providerId} value={String(member.providerId)}>
            <div className="flex items-center gap-2">
              <span>{member.name}</span>
              {member.isPrimaryProvider && (
                <Star className="h-3 w-3 text-status-warning fill-status-warning" />
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default CareTeamProviderSelector;


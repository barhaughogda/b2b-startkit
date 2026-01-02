'use client';

import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

/**
 * Common timezones organized by region
 * Using IANA timezone identifiers
 */
const TIMEZONE_REGIONS: Record<string, { value: string; label: string; offset: string }[]> = {
  'North America': [
    { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5' },
    { value: 'America/Chicago', label: 'Central Time (CT)', offset: 'UTC-6' },
    { value: 'America/Denver', label: 'Mountain Time (MT)', offset: 'UTC-7' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8' },
    { value: 'America/Anchorage', label: 'Alaska Time', offset: 'UTC-9' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time', offset: 'UTC-10' },
    { value: 'America/Toronto', label: 'Toronto', offset: 'UTC-5' },
    { value: 'America/Vancouver', label: 'Vancouver', offset: 'UTC-8' },
    { value: 'America/Mexico_City', label: 'Mexico City', offset: 'UTC-6' },
  ],
  'Europe': [
    { value: 'Europe/London', label: 'London (GMT/BST)', offset: 'UTC+0' },
    { value: 'Europe/Paris', label: 'Paris (CET)', offset: 'UTC+1' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)', offset: 'UTC+1' },
    { value: 'Europe/Rome', label: 'Rome (CET)', offset: 'UTC+1' },
    { value: 'Europe/Madrid', label: 'Madrid (CET)', offset: 'UTC+1' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)', offset: 'UTC+1' },
    { value: 'Europe/Brussels', label: 'Brussels (CET)', offset: 'UTC+1' },
    { value: 'Europe/Zurich', label: 'Zurich (CET)', offset: 'UTC+1' },
    { value: 'Europe/Vienna', label: 'Vienna (CET)', offset: 'UTC+1' },
    { value: 'Europe/Stockholm', label: 'Stockholm (CET)', offset: 'UTC+1' },
    { value: 'Europe/Oslo', label: 'Oslo (CET)', offset: 'UTC+1' },
    { value: 'Europe/Copenhagen', label: 'Copenhagen (CET)', offset: 'UTC+1' },
    { value: 'Europe/Helsinki', label: 'Helsinki (EET)', offset: 'UTC+2' },
    { value: 'Europe/Athens', label: 'Athens (EET)', offset: 'UTC+2' },
    { value: 'Europe/Istanbul', label: 'Istanbul', offset: 'UTC+3' },
    { value: 'Europe/Moscow', label: 'Moscow', offset: 'UTC+3' },
  ],
  'Asia Pacific': [
    { value: 'Asia/Dubai', label: 'Dubai', offset: 'UTC+4' },
    { value: 'Asia/Kolkata', label: 'India (IST)', offset: 'UTC+5:30' },
    { value: 'Asia/Singapore', label: 'Singapore', offset: 'UTC+8' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong', offset: 'UTC+8' },
    { value: 'Asia/Shanghai', label: 'Shanghai', offset: 'UTC+8' },
    { value: 'Asia/Tokyo', label: 'Tokyo', offset: 'UTC+9' },
    { value: 'Asia/Seoul', label: 'Seoul', offset: 'UTC+9' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)', offset: 'UTC+10' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST)', offset: 'UTC+10' },
    { value: 'Australia/Perth', label: 'Perth (AWST)', offset: 'UTC+8' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST)', offset: 'UTC+12' },
  ],
  'South America': [
    { value: 'America/Sao_Paulo', label: 'São Paulo', offset: 'UTC-3' },
    { value: 'America/Buenos_Aires', label: 'Buenos Aires', offset: 'UTC-3' },
    { value: 'America/Lima', label: 'Lima', offset: 'UTC-5' },
    { value: 'America/Bogota', label: 'Bogotá', offset: 'UTC-5' },
    { value: 'America/Santiago', label: 'Santiago', offset: 'UTC-4' },
  ],
  'Africa & Middle East': [
    { value: 'Africa/Cairo', label: 'Cairo', offset: 'UTC+2' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg', offset: 'UTC+2' },
    { value: 'Africa/Lagos', label: 'Lagos', offset: 'UTC+1' },
    { value: 'Africa/Nairobi', label: 'Nairobi', offset: 'UTC+3' },
    { value: 'Asia/Jerusalem', label: 'Jerusalem', offset: 'UTC+2' },
    { value: 'Asia/Riyadh', label: 'Riyadh', offset: 'UTC+3' },
  ],
};

// Flatten for searching
const ALL_TIMEZONES = Object.entries(TIMEZONE_REGIONS).flatMap(([region, zones]) =>
  zones.map(zone => ({ ...zone, region }))
);

interface TimezoneSelectorProps {
  value?: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  showLabel?: boolean;
  className?: string;
}

/**
 * Timezone selector with searchable dropdown
 * 
 * Allows users to select a timezone from a categorized list of common timezones.
 * Uses IANA timezone identifiers (e.g., "America/New_York").
 */
export function TimezoneSelector({
  value,
  onChange,
  disabled = false,
  label = 'Timezone',
  placeholder = 'Select timezone...',
  showLabel = true,
  className,
}: TimezoneSelectorProps) {
  const [open, setOpen] = useState(false);

  // Find the current timezone details
  const currentTimezone = useMemo(() => {
    if (!value) return null;
    return ALL_TIMEZONES.find(tz => tz.value === value);
  }, [value]);

  // Format the display value
  const displayValue = useMemo(() => {
    if (!currentTimezone) return placeholder;
    return `${currentTimezone.label} (${currentTimezone.offset})`;
  }, [currentTimezone, placeholder]);

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <Label htmlFor="timezone-selector">{label}</Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="timezone-selector"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <div className="flex items-center gap-2 truncate">
              <Globe className="h-4 w-4 text-text-secondary flex-shrink-0" />
              <span className="truncate">{displayValue}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search timezones..." />
            <CommandList>
              <CommandEmpty>No timezone found.</CommandEmpty>
              {Object.entries(TIMEZONE_REGIONS).map(([region, zones]) => (
                <CommandGroup key={region} heading={region}>
                  {zones.map((zone) => (
                    <CommandItem
                      key={zone.value}
                      value={`${zone.label} ${zone.value} ${zone.offset}`}
                      onSelect={() => {
                        onChange(zone.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === zone.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex-1 truncate">
                        <span>{zone.label}</span>
                      </div>
                      <span className="ml-2 text-xs text-text-tertiary">
                        {zone.offset}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Get timezone display name for a timezone value
 */
export function getTimezoneDisplayName(timezoneValue: string): string {
  const timezone = ALL_TIMEZONES.find(tz => tz.value === timezoneValue);
  if (timezone) {
    return `${timezone.label} (${timezone.offset})`;
  }
  return timezoneValue;
}


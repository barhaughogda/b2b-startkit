'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Clock, CheckCircle, Globe } from 'lucide-react';
import { TimezoneSelector, getTimezoneDisplayName } from '@/components/ui/timezone-selector';
import { cn } from '@/lib/utils';
import {
  TimeSlot,
} from '@/hooks/useProviderAvailability';
import { addDays, format, startOfDay, startOfMonth, isAfter, isBefore } from 'date-fns';

export interface AvailabilitySlotPickerProps {
  providerId?: string;
  userId?: string;
  locationId?: string;
  clinicId?: string;
  tenantId?: string;
  slotDuration?: number;
  selectedDateTime?: number;
  onSlotSelect: (slot: TimeSlot) => void;
  onTimezoneLoad?: (timezone: string) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  showCalendar?: boolean;
  daysToShow?: number;
  displayTimezone?: string;
  timeFormat?: '12h' | '24h';
  showTimezoneDisplay?: boolean;
  allowTimezoneOverride?: boolean;
  onTimezoneOverride?: (timezone: string) => void;
  sessionId?: string;
}

export function AvailabilitySlotPicker({
  providerId,
  userId,
  clinicId,
  selectedDateTime,
  onSlotSelect,
  minDate = new Date(),
  maxDate = addDays(new Date(), 30),
  className,
  showCalendar = true,
  displayTimezone = 'UTC',
  timeFormat = '12h',
}: AvailabilitySlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(minDate));

  // Mock slots for now until availability service is migrated
  const availableSlotsForDate: TimeSlot[] = useMemo(() => {
    const slots: TimeSlot[] = [];
    const base = startOfDay(selectedDate).getTime();
    for (let h = 9; h < 17; h++) {
      for (let m = 0; m < 60; m += 30) {
        const dt = base + (h * 3600 + m * 60) * 1000;
        const date = new Date(dt);
        slots.push({
          dateTime: dt,
          available: true,
          date,
          timeString: format(date, timeFormat === '12h' ? 'h:mm a' : 'HH:mm'),
          dateString: format(date, 'MMM d'),
          fullDateString: format(date, 'EEEE, MMMM d, yyyy'),
        });
      }
    }
    return slots;
  }, [selectedDate, timeFormat]);

  const handleCalendarSelect = useCallback((date: Date | undefined) => {
    if (date) setSelectedDate(startOfDay(date));
  }, []);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-col lg:flex-row gap-4">
        {showCalendar && (
          <div className="flex-shrink-0 lg:w-[280px] w-full">
            <div className="border border-border-primary rounded-lg p-3 bg-surface-elevated">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleCalendarSelect}
                disabled={(date) => isBefore(date, startOfDay(minDate)) || isAfter(date, maxDate)}
                className="rounded-md"
              />
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-1">{format(selectedDate, 'EEEE, MMMM d')}</h3>
              <p className="text-sm text-text-secondary">Select a time slot</p>
            </div>

            <div className="space-y-3">
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                {availableSlotsForDate.map((slot) => {
                  const isSelected = selectedDateTime === slot.dateTime;
                  return (
                    <button
                      key={slot.dateTime}
                      onClick={() => onSlotSelect(slot)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all border',
                        isSelected ? 'bg-zenthea-teal text-white border-zenthea-teal' : 'bg-surface-elevated hover:bg-zenthea-teal hover:text-white border-border-primary'
                      )}
                    >
                      <span>{slot.timeString}</span>
                      {isSelected && <CheckCircle className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AvailabilitySlotPicker;

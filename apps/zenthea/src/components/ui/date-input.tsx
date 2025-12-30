'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useOptionalProviderPreferences } from '@/lib/datetime/provider-preferences-context';
import { DEFAULT_DATETIME_PREFERENCES, type DateFormat } from '@/lib/datetime/formatting';
import { parseDateFromFormat, formatDateToFormat } from '@/lib/datetime/dateParsing';

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  /**
   * ISO format date string (YYYY-MM-DD) - the actual value stored
   */
  value?: string;
  /**
   * Callback when date changes - receives ISO format date string (YYYY-MM-DD)
   */
  onChange?: (value: string) => void;
  /**
   * Optional placeholder text
   */
  placeholder?: string;
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  /**
   * Minimum date (ISO format YYYY-MM-DD)
   */
  min?: string;
  /**
   * Maximum date (ISO format YYYY-MM-DD)
   */
  max?: string;
  /**
   * Optional custom date format override (uses user preference by default)
   */
  dateFormat?: DateFormat;
}

/**
 * DateInput Component
 * 
 * A custom date input that respects user's date format preferences.
 * Displays dates in the user's preferred format while storing values in ISO format (YYYY-MM-DD).
 * 
 * @example
 * ```tsx
 * <DateInput
 *   value={dateOfBirth}
 *   onChange={(isoDate) => setDateOfBirth(isoDate)}
 *   max={new Date().toISOString().split('T')[0]!}
 * />
 * ```
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      value,
      onChange,
      placeholder,
      disabled,
      min,
      max,
      dateFormat: dateFormatOverride,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const preferences = useOptionalProviderPreferences();
    const dateFormat = dateFormatOverride || preferences?.preferences.dateFormat || DEFAULT_DATETIME_PREFERENCES.dateFormat;
    
    const [isOpen, setIsOpen] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState('');
    const [inputValue, setInputValue] = React.useState('');

    // Convert ISO value to display format
    React.useEffect(() => {
      if (value) {
        const formatted = formatDateToFormat(value, dateFormat);
        setDisplayValue(formatted);
        setInputValue(formatted);
      } else {
        setDisplayValue('');
        setInputValue('');
      }
    }, [value, dateFormat]);

    // Parse date from calendar selection
    const handleCalendarSelect = (date: Date | undefined) => {
      if (date) {
        const isoDate = format(date, 'yyyy-MM-dd');
        onChange?.(isoDate);
        setIsOpen(false);
      }
    };

    // Parse date from text input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Try to parse the date
      if (newValue.trim()) {
        const parsed = parseDateFromFormat(newValue, dateFormat);
        if (parsed) {
          // Valid date - update the value
          onChange?.(parsed);
          setDisplayValue(newValue);
        } else {
          // Invalid date - keep the input value but don't update the actual value
          setDisplayValue(newValue);
        }
      } else {
        // Empty - clear the value
        onChange?.('');
        setDisplayValue('');
      }
    };

    // Handle input blur - validate and format
    const handleInputBlur = () => {
      if (inputValue.trim()) {
        const parsed = parseDateFromFormat(inputValue, dateFormat);
        if (parsed) {
          // Valid date - format it properly
          const formatted = formatDateToFormat(parsed, dateFormat);
          setDisplayValue(formatted);
          setInputValue(formatted);
        } else {
          // Invalid date - revert to last valid value
          if (value) {
            const formatted = formatDateToFormat(value, dateFormat);
            setDisplayValue(formatted);
            setInputValue(formatted);
          } else {
            setDisplayValue('');
            setInputValue('');
          }
        }
      }
    };

    // Convert ISO dates to Date objects for calendar
    const selectedDate = value ? (() => {
      try {
        const date = new Date(value + 'T00:00:00');
        return isNaN(date.getTime()) ? undefined : date;
      } catch {
        return undefined;
      }
    })() : undefined;

    const minDate = min ? (() => {
      try {
        const date = new Date(min + 'T00:00:00');
        return isNaN(date.getTime()) ? undefined : date;
      } catch {
        return undefined;
      }
    })() : undefined;

    const maxDate = max ? (() => {
      try {
        const date = new Date(max + 'T00:00:00');
        return isNaN(date.getTime()) ? undefined : date;
      } catch {
        return undefined;
      }
    })() : undefined;

    // Get placeholder based on format
    const getPlaceholder = () => {
      if (placeholder) return placeholder;
      switch (dateFormat) {
        case 'MM/DD/YYYY':
          return 'MM/DD/YYYY';
        case 'DD/MM/YYYY':
          return 'DD/MM/YYYY';
        case 'YYYY-MM-DD':
          return 'YYYY-MM-DD';
        case 'DD.MM.YYYY':
          return 'DD.MM.YYYY';
        case 'DD MMM YYYY':
          return 'DD MMM YYYY';
        default:
          return 'Select date';
      }
    };

    return (
      <div className="relative">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary hover:text-text-primary cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Open date picker"
              disabled={disabled}
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Input
          ref={ref}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={getPlaceholder()}
          disabled={disabled}
          className={cn("pl-10", className)}
          {...props}
        />
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';


/**
 * Provider DateTime Formatting Utilities
 * 
 * Centralized date/time formatting functions that respect provider preferences
 * for time format (12h/24h), date format, and locale/language settings.
 * 
 * These utilities apply ONLY to the provider/company UI. Patient UI uses
 * patient defaults or browser locale.
 */

/**
 * Supported time formats
 */
export type TimeFormat = '12h' | '24h';

/**
 * Supported date formats
 * 
 * - 'MM/DD/YYYY': US format (e.g., 12/31/2024)
 * - 'DD/MM/YYYY': European format (e.g., 31/12/2024)
 * - 'YYYY-MM-DD': ISO format (e.g., 2024-12-31)
 * - 'DD.MM.YYYY': German/European format (e.g., 31.12.2024)
 * - 'DD MMM YYYY': Short month format (e.g., 31 Dec 2024)
 */
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD.MM.YYYY' | 'DD MMM YYYY';

/**
 * Provider preferences for datetime formatting
 */
export interface DateTimePreferences {
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  language: string; // ISO language code (e.g., 'en', 'es', 'de')
}

/**
 * Default preferences (US/English defaults)
 */
export const DEFAULT_DATETIME_PREFERENCES: DateTimePreferences = {
  timeFormat: '12h',
  dateFormat: 'MM/DD/YYYY',
  language: 'en',
};

/**
 * LocalStorage keys for preferences
 */
export const DATETIME_PREFERENCES_KEYS = {
  TIME_FORMAT: 'zenthea-time-format',
  DATE_FORMAT: 'zenthea-date-format',
  LANGUAGE: 'zenthea-language',
} as const;

/**
 * Available date format options for UI display
 */
export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string; example: string }[] = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY', example: '31.12.2024' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY', example: '31 Dec 2024' },
];

/**
 * Available time format options for UI display
 */
export const TIME_FORMAT_OPTIONS: { value: TimeFormat; label: string; example: string }[] = [
  { value: '12h', label: '12-hour', example: '2:30 PM' },
  { value: '24h', label: '24-hour', example: '14:30' },
];

/**
 * Map language codes to locale strings for Intl
 */
const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ar: 'ar-SA',
  no: 'nb-NO',
};

/**
 * Get locale string from language code
 */
function getLocale(language: string): string {
  return LANGUAGE_TO_LOCALE[language] || 'en-US';
}

/**
 * Format a date according to provider preferences
 * 
 * @param date - Date to format (Date object, timestamp, or ISO string)
 * @param prefs - Provider datetime preferences
 * @param includeWeekday - Whether to include the weekday name
 * @returns Formatted date string
 */
export function formatDateWithPrefs(
  date: Date | number | string,
  prefs: DateTimePreferences,
  includeWeekday: boolean = false
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return String(date);
  }

  const locale = getLocale(prefs.language);
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();
  
  // Get weekday if needed
  let weekday = '';
  if (includeWeekday) {
    weekday = d.toLocaleDateString(locale, { weekday: 'long' }) + ', ';
  }

  // Get short month name for 'DD MMM YYYY' format
  const shortMonth = d.toLocaleDateString(locale, { month: 'short' });
  
  // Pad numbers
  const dd = String(day).padStart(2, '0');
  const mm = String(month + 1).padStart(2, '0');
  const yyyy = String(year);

  switch (prefs.dateFormat) {
    case 'MM/DD/YYYY':
      return `${weekday}${mm}/${dd}/${yyyy}`;
    case 'DD/MM/YYYY':
      return `${weekday}${dd}/${mm}/${yyyy}`;
    case 'YYYY-MM-DD':
      return `${weekday}${yyyy}-${mm}-${dd}`;
    case 'DD.MM.YYYY':
      return `${weekday}${dd}.${mm}.${yyyy}`;
    case 'DD MMM YYYY':
      return `${weekday}${day} ${shortMonth} ${yyyy}`;
    default:
      return d.toLocaleDateString(locale);
  }
}

/**
 * Format a time according to provider preferences
 * 
 * @param date - Date/time to format (Date object, timestamp, or ISO string)
 * @param prefs - Provider datetime preferences
 * @param includeSeconds - Whether to include seconds
 * @returns Formatted time string
 */
export function formatTimeWithPrefs(
  date: Date | number | string,
  prefs: DateTimePreferences,
  includeSeconds: boolean = false
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return String(date);
  }

  const locale = getLocale(prefs.language);
  
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: prefs.timeFormat === '12h',
  };
  
  if (includeSeconds) {
    options.second = '2-digit';
  }

  return d.toLocaleTimeString(locale, options);
}

/**
 * Format a date and time according to provider preferences
 * 
 * @param date - Date/time to format (Date object, timestamp, or ISO string)
 * @param prefs - Provider datetime preferences
 * @param options - Additional options
 * @returns Formatted date and time string
 */
export function formatDateTimeWithPrefs(
  date: Date | number | string,
  prefs: DateTimePreferences,
  options: {
    includeWeekday?: boolean;
    includeSeconds?: boolean;
    separator?: string;
  } = {}
): string {
  const { includeWeekday = false, includeSeconds = false, separator = ' at ' } = options;
  
  const dateStr = formatDateWithPrefs(date, prefs, includeWeekday);
  const timeStr = formatTimeWithPrefs(date, prefs, includeSeconds);
  
  return `${dateStr}${separator}${timeStr}`;
}

/**
 * Format a time range (e.g., "9:00 AM - 5:00 PM" or "09:00 - 17:00")
 * 
 * @param startTime - Start time string (HH:mm format)
 * @param endTime - End time string (HH:mm format)
 * @param prefs - Provider datetime preferences
 * @returns Formatted time range string
 */
export function formatTimeRangeWithPrefs(
  startTime: string,
  endTime: string,
  prefs: DateTimePreferences
): string {
  // Parse HH:mm format
  const parseTime = (time: string): Date => {
    const parts = time.split(':').map(Number);
    const hours = parts[0] ?? 0;
    const minutes = parts[1] ?? 0;
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const startDate = parseTime(startTime);
  const endDate = parseTime(endTime);

  const startFormatted = formatTimeWithPrefs(startDate, prefs);
  const endFormatted = formatTimeWithPrefs(endDate, prefs);

  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Get a formatted day of week name
 * 
 * @param dayIndex - Day of week (0 = Sunday, 6 = Saturday)
 * @param prefs - Provider datetime preferences
 * @param format - 'long' | 'short' | 'narrow'
 * @returns Localized day name
 */
export function getDayNameWithPrefs(
  dayIndex: number,
  prefs: DateTimePreferences,
  format: 'long' | 'short' | 'narrow' = 'long'
): string {
  const locale = getLocale(prefs.language);
  // Create a date for the given day of week (using a known Sunday as base)
  const baseDate = new Date(2024, 0, 7); // Jan 7, 2024 is Sunday
  baseDate.setDate(baseDate.getDate() + dayIndex);
  return baseDate.toLocaleDateString(locale, { weekday: format });
}

/**
 * Get a formatted month name
 * 
 * @param monthIndex - Month (0 = January, 11 = December)
 * @param prefs - Provider datetime preferences
 * @param format - 'long' | 'short' | 'narrow'
 * @returns Localized month name
 */
export function getMonthNameWithPrefs(
  monthIndex: number,
  prefs: DateTimePreferences,
  format: 'long' | 'short' | 'narrow' = 'long'
): string {
  const locale = getLocale(prefs.language);
  const date = new Date(2024, monthIndex, 1);
  return date.toLocaleDateString(locale, { month: format });
}

/**
 * Load datetime preferences from localStorage
 * 
 * @returns DateTimePreferences from localStorage or defaults
 */
export function loadDateTimePreferences(): DateTimePreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_DATETIME_PREFERENCES;
  }

  const timeFormat = localStorage.getItem(DATETIME_PREFERENCES_KEYS.TIME_FORMAT) as TimeFormat | null;
  const dateFormat = localStorage.getItem(DATETIME_PREFERENCES_KEYS.DATE_FORMAT) as DateFormat | null;
  const language = localStorage.getItem(DATETIME_PREFERENCES_KEYS.LANGUAGE);

  return {
    timeFormat: timeFormat || DEFAULT_DATETIME_PREFERENCES.timeFormat,
    dateFormat: dateFormat || DEFAULT_DATETIME_PREFERENCES.dateFormat,
    language: language || DEFAULT_DATETIME_PREFERENCES.language,
  };
}

/**
 * Save datetime preferences to localStorage
 * 
 * @param prefs - Preferences to save
 */
export function saveDateTimePreferences(prefs: Partial<DateTimePreferences>): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (prefs.timeFormat) {
    localStorage.setItem(DATETIME_PREFERENCES_KEYS.TIME_FORMAT, prefs.timeFormat);
  }
  if (prefs.dateFormat) {
    localStorage.setItem(DATETIME_PREFERENCES_KEYS.DATE_FORMAT, prefs.dateFormat);
  }
  if (prefs.language) {
    localStorage.setItem(DATETIME_PREFERENCES_KEYS.LANGUAGE, prefs.language);
  }
}


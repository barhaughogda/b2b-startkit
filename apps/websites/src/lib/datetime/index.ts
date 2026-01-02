/**
 * DateTime Formatting Module
 * 
 * Exports utilities for preference-aware date/time formatting
 * and the provider preferences context.
 */

export {
  // Types
  type TimeFormat,
  type DateFormat,
  type DateTimePreferences,
  // Constants
  DEFAULT_DATETIME_PREFERENCES,
  DATETIME_PREFERENCES_KEYS,
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  // Functions
  formatDateWithPrefs,
  formatTimeWithPrefs,
  formatDateTimeWithPrefs,
  formatTimeRangeWithPrefs,
  getDayNameWithPrefs,
  getMonthNameWithPrefs,
  loadDateTimePreferences,
  saveDateTimePreferences,
} from './formatting';

export {
  ProviderPreferencesProvider,
  useProviderPreferences,
  useOptionalProviderPreferences,
} from './provider-preferences-context';


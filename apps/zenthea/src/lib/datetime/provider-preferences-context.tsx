'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type DateTimePreferences,
  type TimeFormat,
  type DateFormat,
  DEFAULT_DATETIME_PREFERENCES,
  loadDateTimePreferences,
  saveDateTimePreferences,
} from './formatting';

/**
 * Provider Preferences Context
 * 
 * Manages provider-specific UI preferences including:
 * - Time format (12h/24h)
 * - Date format (various locale formats)
 * - Language/locale
 * 
 * These preferences apply ONLY to the provider/company UI.
 */

interface ProviderPreferencesContextValue {
  preferences: DateTimePreferences;
  setTimeFormat: (format: TimeFormat) => void;
  setDateFormat: (format: DateFormat) => void;
  setLanguage: (language: string) => void;
  isLoaded: boolean;
}

const ProviderPreferencesContext = createContext<ProviderPreferencesContextValue | undefined>(undefined);

interface ProviderPreferencesProviderProps {
  children: ReactNode;
}

/**
 * Provider that manages provider preferences state
 * 
 * Wraps the company/provider UI to provide access to formatting preferences.
 * Loads from localStorage on mount and persists changes.
 */
export function ProviderPreferencesProvider({ children }: ProviderPreferencesProviderProps) {
  const [preferences, setPreferences] = useState<DateTimePreferences>(DEFAULT_DATETIME_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const loaded = loadDateTimePreferences();
    setPreferences(loaded);
    setIsLoaded(true);
  }, []);

  const setTimeFormat = useCallback((timeFormat: TimeFormat) => {
    setPreferences((prev) => {
      const updated = { ...prev, timeFormat };
      saveDateTimePreferences({ timeFormat });
      return updated;
    });
  }, []);

  const setDateFormat = useCallback((dateFormat: DateFormat) => {
    setPreferences((prev) => {
      const updated = { ...prev, dateFormat };
      saveDateTimePreferences({ dateFormat });
      return updated;
    });
  }, []);

  const setLanguage = useCallback((language: string) => {
    setPreferences((prev) => {
      const updated = { ...prev, language };
      saveDateTimePreferences({ language });
      return updated;
    });
  }, []);

  const value: ProviderPreferencesContextValue = {
    preferences,
    setTimeFormat,
    setDateFormat,
    setLanguage,
    isLoaded,
  };

  return (
    <ProviderPreferencesContext.Provider value={value}>
      {children}
    </ProviderPreferencesContext.Provider>
  );
}

/**
 * Hook to access provider preferences
 * 
 * @returns Provider preferences context value
 * @throws Error if used outside of ProviderPreferencesProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { preferences, setTimeFormat } = useProviderPreferences();
 *   
 *   return (
 *     <div>
 *       <span>{formatTimeWithPrefs(new Date(), preferences)}</span>
 *       <button onClick={() => setTimeFormat('24h')}>Use 24h</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useProviderPreferences(): ProviderPreferencesContextValue {
  const context = useContext(ProviderPreferencesContext);
  
  if (context === undefined) {
    throw new Error('useProviderPreferences must be used within a ProviderPreferencesProvider');
  }
  
  return context;
}

/**
 * Optional hook that returns undefined if used outside provider
 * 
 * Use this in shared components that may render in both provider and patient contexts.
 * Falls back to default preferences when context is not available.
 * 
 * @returns Provider preferences context value or undefined
 */
export function useOptionalProviderPreferences(): ProviderPreferencesContextValue | undefined {
  return useContext(ProviderPreferencesContext);
}


/**
 * React Hook for Session Timeout Management
 * 
 * This hook manages automatic logout after inactivity by:
 * - Tracking user activity
 * - Monitoring time until logout
 * - Showing warning before logout
 * - Handling clean session termination
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useZentheaSession } from './useZentheaSession';
import {
  initializeSession,
  clearSession,
  updateLastActivity,
  setupActivityTracking,
  getTimeUntilLogout,
  shouldShowWarning,
  isSessionExpired,
  markWarningShown,
  logoutUser,
  getSessionTimeoutConfig,
  formatTimeRemaining,
  DEFAULT_SESSION_TIMEOUT_CONFIG,
  type SessionTimeoutConfig,
} from '@/lib/session';

export interface UseSessionTimeoutOptions {
  /** Custom timeout configuration (overrides tenant settings) */
  config?: Partial<SessionTimeoutConfig>;
  /** Callback when warning should be shown */
  onWarning?: (timeRemaining: number) => void;
  /** Callback when session expires */
  onExpired?: () => void;
  /** Whether to enable tracking (default: true) */
  enabled?: boolean;
}

export interface UseSessionTimeoutReturn {
  /** Time remaining until logout in milliseconds */
  timeRemaining: number;
  /** Formatted time remaining (MM:SS) */
  timeRemainingFormatted: string;
  /** Whether warning should be shown */
  shouldShowWarning: boolean;
  /** Whether session has expired */
  isExpired: boolean;
  /** Manually extend session (resets activity timer) */
  extendSession: () => void;
  /** Manually logout */
  logout: () => Promise<void>;
}

/**
 * Hook to manage session timeout and inactivity tracking
 */
export function useSessionTimeout(
  options: UseSessionTimeoutOptions = {}
): UseSessionTimeoutReturn {
  const { data: session } = useZentheaSession();
  const [config, setConfig] = useState<SessionTimeoutConfig>(
    options.config
      ? { ...DEFAULT_SESSION_TIMEOUT_CONFIG, ...options.config }
      : DEFAULT_SESSION_TIMEOUT_CONFIG
  );
  const [timeRemaining, setTimeRemaining] = useState<number>(config.timeout);
  const [shouldShowWarningState, setShouldShowWarningState] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const configLoadedRef = useRef(false);
  
  // Load configuration from tenant settings
  useEffect(() => {
    if (configLoadedRef.current || options.config) return;
    
    const loadConfig = async () => {
      if (session?.user?.tenantId) {
        try {
          const tenantConfig = await getSessionTimeoutConfig(session.user.tenantId);
          setConfig(tenantConfig);
          setTimeRemaining(tenantConfig.timeout);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to load session timeout config:', error);
          }
        }
      }
      configLoadedRef.current = true;
    };
    
    loadConfig();
  }, [session?.user?.tenantId, options.config]);
  
  // Initialize session tracking when user is authenticated
  useEffect(() => {
    if (!session || !config.enabled || (options.enabled === false)) {
      return;
    }
    
    // Initialize session on mount
    initializeSession();
    
    // Setup activity tracking
    cleanupRef.current = setupActivityTracking(() => {
      // Activity detected - update time remaining
      const remaining = getTimeUntilLogout(config);
      setTimeRemaining(remaining);
      setIsExpired(false);
      setShouldShowWarningState(false);
    });
    
    // Setup interval to check timeout
    intervalRef.current = setInterval(() => {
      const remaining = getTimeUntilLogout(config);
      const expired = isSessionExpired(config);
      const showWarning = shouldShowWarning(config);
      
      setTimeRemaining(remaining);
      setIsExpired(expired);
      setShouldShowWarningState(showWarning);
      
      // Show warning callback
      if (showWarning && options.onWarning) {
        markWarningShown();
        options.onWarning(remaining);
      }
      
      // Handle expiration
      if (expired && !isExpired) {
        setIsExpired(true);
        if (options.onExpired) {
          options.onExpired();
        } else {
          // Default: logout user
          logoutUser().catch((error) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('Failed to logout on session expiration:', error);
            }
          });
        }
      }
    }, 1000); // Check every second
    
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [session, config, options.enabled, options.onWarning, options.onExpired, isExpired]);
  
  // Clear session when user logs out
  useEffect(() => {
    if (!session) {
      clearSession();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    }
  }, [session]);
  
  // Extend session manually
  const extendSession = useCallback(() => {
    updateLastActivity();
    setTimeRemaining(config.timeout);
    setIsExpired(false);
    setShouldShowWarningState(false);
  }, [config.timeout]);
  
  // Manual logout
  const logout = useCallback(async () => {
    clearSession();
    await logoutUser();
  }, []);
  
  return {
    timeRemaining,
    timeRemainingFormatted: formatTimeRemaining(timeRemaining),
    shouldShowWarning: shouldShowWarningState,
    isExpired,
    extendSession,
    logout,
  };
}


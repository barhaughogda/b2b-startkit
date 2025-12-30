/**
 * Session Management - Automatic Logout After Inactivity
 * 
 * This module provides automatic session termination after a period of inactivity
 * for HIPAA compliance and security. It tracks user activity and logs out users
 * after the configured timeout period.
 * 
 * Features:
 * - Tracks last activity timestamp
 * - Configurable timeout (per tenant, defaults to 30 minutes)
 * - Warning before logout (default 2 minutes before)
 * - Clean session termination
 */

import { signOut } from '@/hooks/useZentheaSession';

/**
 * Configuration for session timeout
 */
export interface SessionTimeoutConfig {
  /** Timeout in milliseconds (default: 30 minutes) */
  timeout: number;
  /** Warning time in milliseconds before logout (default: 2 minutes) */
  warningTime: number;
  /** Whether to enable inactivity tracking (default: true) */
  enabled: boolean;
}

/**
 * Default session timeout configuration
 */
export const DEFAULT_SESSION_TIMEOUT_CONFIG: SessionTimeoutConfig = {
  timeout: 30 * 60 * 1000, // 30 minutes
  warningTime: 2 * 60 * 1000, // 2 minutes before logout
  enabled: true,
};

/**
 * Storage keys for session tracking
 */
const STORAGE_KEYS = {
  LAST_ACTIVITY: 'session_last_activity',
  SESSION_START: 'session_start_time',
  WARNING_SHOWN: 'session_warning_shown',
} as const;

/**
 * Activity events that reset the inactivity timer
 */
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
  'keydown',
] as const;

/**
 * Get the current last activity timestamp
 */
export function getLastActivity(): number | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
  return stored ? parseInt(stored, 10) : null;
}

/**
 * Update the last activity timestamp to now
 */
export function updateLastActivity(): void {
  if (typeof window === 'undefined') return;
  
  const now = Date.now();
  localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now.toString());
  localStorage.removeItem(STORAGE_KEYS.WARNING_SHOWN); // Reset warning flag
}

/**
 * Get the session start time
 */
export function getSessionStartTime(): number | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(STORAGE_KEYS.SESSION_START);
  return stored ? parseInt(stored, 10) : null;
}

/**
 * Initialize session tracking (call on login)
 */
export function initializeSession(): void {
  if (typeof window === 'undefined') return;
  
  const now = Date.now();
  localStorage.setItem(STORAGE_KEYS.SESSION_START, now.toString());
  updateLastActivity();
}

/**
 * Clear session tracking data (call on logout)
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
  localStorage.removeItem(STORAGE_KEYS.SESSION_START);
  localStorage.removeItem(STORAGE_KEYS.WARNING_SHOWN);
}

/**
 * Check if warning has been shown
 */
export function hasWarningBeenShown(): boolean {
  if (typeof window === 'undefined') return false;
  
  return localStorage.getItem(STORAGE_KEYS.WARNING_SHOWN) === 'true';
}

/**
 * Mark warning as shown
 */
export function markWarningShown(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(STORAGE_KEYS.WARNING_SHOWN, 'true');
}

/**
 * Calculate time until logout
 */
export function getTimeUntilLogout(config: SessionTimeoutConfig): number {
  const lastActivity = getLastActivity();
  if (!lastActivity) return config.timeout;
  
  const elapsed = Date.now() - lastActivity;
  return Math.max(0, config.timeout - elapsed);
}

/**
 * Calculate time until warning should be shown
 */
export function getTimeUntilWarning(config: SessionTimeoutConfig): number {
  const timeUntilLogout = getTimeUntilLogout(config);
  return Math.max(0, timeUntilLogout - config.warningTime);
}

/**
 * Check if session has expired
 */
export function isSessionExpired(config: SessionTimeoutConfig): boolean {
  return getTimeUntilLogout(config) <= 0;
}

/**
 * Check if warning should be shown
 */
export function shouldShowWarning(config: SessionTimeoutConfig): boolean {
  const timeUntilLogout = getTimeUntilLogout(config);
  const shouldShow = timeUntilLogout > 0 && timeUntilLogout <= config.warningTime;
  const alreadyShown = hasWarningBeenShown();
  
  return shouldShow && !alreadyShown;
}

/**
 * Logout user and clear session
 */
export async function logoutUser(callbackUrl: string = '/'): Promise<void> {
  // Call logout API to delete session record
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    // If logout API call fails, log but don't block logout
    // This allows logout to proceed even if session cleanup has issues
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to call logout API:', error);
    }
  }
  
  clearSession();
  await signOut({ callbackUrl });
}

/**
 * Setup activity event listeners
 */
export function setupActivityTracking(
  onActivity?: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // Return no-op cleanup function
  }
  
  const handleActivity = () => {
    updateLastActivity();
    onActivity?.();
  };
  
  // Add event listeners for all activity events
  ACTIVITY_EVENTS.forEach((event) => {
    window.addEventListener(event, handleActivity, { passive: true });
  });
  
  // Return cleanup function
  return () => {
    ACTIVITY_EVENTS.forEach((event) => {
      window.removeEventListener(event, handleActivity);
    });
  };
}

/**
 * Format time remaining as MM:SS
 */
export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get session timeout configuration from tenant settings
 * Falls back to defaults if not available
 */
export async function getSessionTimeoutConfig(
  tenantId?: string
): Promise<SessionTimeoutConfig> {
  // Default configuration
  const defaultConfig: SessionTimeoutConfig = {
    ...DEFAULT_SESSION_TIMEOUT_CONFIG,
  };
  
  // If no tenant ID, return defaults
  if (!tenantId) {
    return defaultConfig;
  }
  
  try {
    // Try to fetch tenant settings from API
    const response = await fetch(`/api/company/settings/session-timeout?tenantId=${tenantId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.config) {
        return {
          timeout: (data.config.timeout || 30) * 60 * 1000, // Convert minutes to ms
          warningTime: (data.config.warningTime || 2) * 60 * 1000, // Convert minutes to ms
          enabled: data.config.enabled !== false,
        };
      }
    }
  } catch (error) {
    // Silently fall back to defaults if API call fails
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to fetch session timeout config, using defaults:', error);
    }
  }
  
  return defaultConfig;
}

/**
 * Validate session timeout server-side
 * This function can be used in API routes to validate that a session hasn't expired
 * based on the last activity timestamp stored in the session record.
 * 
 * Note: This requires the sessionId to be available in the JWT token or session.
 * The actual session activity is tracked in Convex sessions table.
 * 
 * @param lastActivity - Last activity timestamp from session (in milliseconds)
 * @param timeout - Session timeout in milliseconds (default: 30 minutes)
 * @returns Validation result with remaining time
 */
export function validateSessionTimeoutServer(
  lastActivity: number | null | undefined,
  timeout: number = 30 * 60 * 1000 // Default: 30 minutes
): {
  valid: boolean;
  expired: boolean;
  remaining?: number;
  reason?: string;
} {
  if (!lastActivity) {
    return {
      valid: false,
      expired: true,
      reason: 'Session activity not tracked',
    };
  }

  const now = Date.now();
  const timeSinceLastActivity = now - lastActivity;
  const remaining = timeout - timeSinceLastActivity;

  if (timeSinceLastActivity > timeout) {
    return {
      valid: false,
      expired: true,
      remaining: 0,
      reason: 'Session has expired due to inactivity',
    };
  }

  return {
    valid: true,
    expired: false,
    remaining: Math.max(0, remaining),
  };
}


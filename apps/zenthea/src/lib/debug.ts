/**
 * Shared debug logging utilities
 * Provides consistent development-only logging across the application
 */

/**
 * Whether we're in development mode
 */
export const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Log debug message (only in development)
 */
export function logDebug(...args: any[]): void {
  if (DEBUG) {
    console.log(...args);
  }
}

/**
 * Log debug warning (only in development)
 */
export function logDebugWarn(...args: any[]): void {
  if (DEBUG) {
    console.warn(...args);
  }
}

/**
 * Log debug error (only in development)
 */
export function logDebugError(...args: any[]): void {
  if (DEBUG) {
    console.error(...args);
  }
}



/**
 * Centralized logging utility
 * Provides consistent logging behavior across the application
 * - Development: All logs enabled
 * - Production: Only errors logged by default
 * - Debug mode: Enable via ENABLE_DEBUG_LOGGING=true for troubleshooting
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const enableDebugLogging = isDevelopment || process.env.ENABLE_DEBUG_LOGGING === 'true';

export const logger = {
  /**
   * Log informational messages
   * Only logs in development or when ENABLE_DEBUG_LOGGING=true
   */
  log: (...args: unknown[]) => {
    if (enableDebugLogging) {
      console.log(...args);
    }
  },

  /**
   * Log informational messages (alias for log)
   * Only logs in development or when ENABLE_DEBUG_LOGGING=true
   */
  info: (...args: unknown[]) => {
    if (enableDebugLogging) {
      console.info(...args);
    }
  },

  /**
   * Log error messages
   * Always logs errors regardless of environment
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Log warning messages
   * Only logs in development or when ENABLE_DEBUG_LOGGING=true
   */
  warn: (...args: unknown[]) => {
    if (enableDebugLogging) {
      console.warn(...args);
    }
  },

  /**
   * Log debug messages (most verbose)
   * Only logs in development or when ENABLE_DEBUG_LOGGING=true
   */
  debug: (...args: unknown[]) => {
    if (enableDebugLogging) {
      console.debug(...args);
    }
  },
};

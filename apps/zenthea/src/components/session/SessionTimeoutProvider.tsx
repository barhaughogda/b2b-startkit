/**
 * Session Timeout Provider
 * 
 * Provides session timeout functionality to the entire application.
 * Automatically tracks inactivity and shows warning before logout.
 */

'use client';

import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { SessionTimeoutWarning } from './SessionTimeoutWarning';
import { useState, useEffect } from 'react';

export interface SessionTimeoutProviderProps {
  children: React.ReactNode;
  /** Custom timeout configuration */
  config?: {
    timeout?: number;
    warningTime?: number;
    enabled?: boolean;
  };
}

/**
 * Provider component that manages session timeout for the application
 */
export function SessionTimeoutProvider({
  children,
  config,
}: SessionTimeoutProviderProps) {
  const [showWarning, setShowWarning] = useState(false);
  
  const {
    timeRemaining,
    shouldShowWarning,
    isExpired,
    extendSession,
    logout,
  } = useSessionTimeout({
    config: config
      ? {
          timeout: config.timeout,
          warningTime: config.warningTime,
          enabled: config.enabled,
        }
      : undefined,
    onWarning: (timeRemaining) => {
      setShowWarning(true);
    },
    onExpired: async () => {
      // Session expired - logout
      await logout();
    },
  });
  
  // Show warning when shouldShowWarning becomes true
  useEffect(() => {
    if (shouldShowWarning) {
      setShowWarning(true);
    }
  }, [shouldShowWarning]);
  
  // Handle logout when session expires
  useEffect(() => {
    if (isExpired && !showWarning) {
      logout().catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to logout on session expiration:', error);
        }
      });
    }
  }, [isExpired, showWarning, logout]);
  
  return (
    <>
      {children}
      <SessionTimeoutWarning
        timeRemaining={timeRemaining}
        onExtend={extendSession}
        onLogout={logout}
        open={showWarning}
        onOpenChange={setShowWarning}
      />
    </>
  );
}


"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "@/hooks/useZentheaSession";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, AlertTriangle, XCircle } from "lucide-react";

interface AccessTimerProps {
  expirationTimestamp: number; // Unix timestamp when access expires
  onExpired?: () => void; // Optional callback when access expires
  className?: string; // Optional className for styling
  showBadge?: boolean; // Whether to show badge format (default: false, shows alert)
}

/**
 * AccessTimer component displays a countdown timer for support access expiration.
 * 
 * Features:
 * - Real-time countdown display (MM:SS format)
 * - Visual indicators based on time remaining:
 *   - Normal (green): > 5 minutes
 *   - Warning (yellow): 1-5 minutes
 *   - Critical (red): < 1 minute
 * - Auto-logout when expired
 * - Configurable display format (Alert or Badge)
 * 
 * @example
 * ```tsx
 * <AccessTimer 
 *   expirationTimestamp={Date.now() + 3600000} 
 *   onExpired={() => console.log('Access expired')}
 * />
 * ```
 */
export function AccessTimer({
  expirationTimestamp,
  onExpired,
  className = "",
  showBadge = false,
}: AccessTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [hasExpired, setHasExpired] = useState(false);

  // Calculate remaining time
  const updateTimer = useCallback(() => {
    const now = Date.now();
    const remaining = Math.max(0, expirationTimestamp - now);
    setTimeRemaining(remaining);

    // Check if expired
    if (remaining === 0 && !hasExpired) {
      setHasExpired(true);
      
      // Call optional callback
      if (onExpired) {
        onExpired();
      }

      // Auto-logout after a brief delay to show expiration message
      setTimeout(() => {
        signOut({ 
          callbackUrl: '/auth/signin?error=AccessExpired&message=Your+support+access+has+expired.+Please+request+new+access.' 
        });
      }, 2000); // 2 second delay to show expiration message
    }
  }, [expirationTimestamp, hasExpired, onExpired]);

  // Update timer every second
  useEffect(() => {
    if (hasExpired) return; // Stop updating if expired

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [updateTimer, hasExpired]);

  // Format time as MM:SS
  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Determine visual state based on time remaining
  const getTimerState = () => {
    if (timeRemaining === null) {
      return { level: "normal", color: "text-text-secondary", bgColor: "bg-background-secondary", icon: Clock };
    }

    if (hasExpired || timeRemaining === 0) {
      return { 
        level: "expired", 
        color: "text-status-error", 
        bgColor: "bg-status-error/10", 
        borderColor: "border-status-error/50",
        icon: XCircle,
        message: "Access expired"
      };
    }

    const minutes = Math.floor(timeRemaining / 60000);
    
    if (minutes < 1) {
      // Less than 1 minute - critical
      return { 
        level: "critical", 
        color: "text-status-error", 
        bgColor: "bg-status-error/10", 
        borderColor: "border-status-error/50",
        icon: AlertCircle,
        message: "Access expiring soon"
      };
    } else if (minutes < 5) {
      // 1-5 minutes - warning
      return { 
        level: "warning", 
        color: "text-status-warning", 
        bgColor: "bg-status-warning/10", 
        borderColor: "border-status-warning/50",
        icon: AlertTriangle,
        message: "Access expiring soon"
      };
    } else {
      // More than 5 minutes - normal
      return { 
        level: "normal", 
        color: "text-status-success", 
        bgColor: "bg-status-success/10", 
        borderColor: "border-status-success/50",
        icon: Clock,
        message: "Access active"
      };
    }
  };

  // Don't render if no expiration timestamp
  if (!expirationTimestamp) {
    return null;
  }

  const state = getTimerState();
  const Icon = state.icon;

  // Badge format
  if (showBadge) {
    return (
      <Badge
        variant="outline"
        className={`${state.bgColor} ${state.borderColor || "border-border-primary"} ${state.color} ${className}`}
      >
        <Icon className="h-3 w-3 mr-1" />
        {timeRemaining !== null && !hasExpired ? (
          <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
        ) : (
          <span>{state.message}</span>
        )}
      </Badge>
    );
  }

  // Alert format (default)
  return (
    <Alert
      className={`${state.bgColor} ${state.borderColor || "border-border-primary"} ${className}`}
    >
      <Icon className={`h-4 w-4 ${state.color}`} />
      <AlertDescription className={state.color}>
        {hasExpired ? (
          <span className="font-semibold">Access expired. Logging out...</span>
        ) : timeRemaining !== null ? (
          <>
            <span className="font-semibold">{state.message}: </span>
            <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
            {state.level === "critical" && (
              <span className="block mt-1 text-xs">
                Your support access will expire in less than 1 minute. Please save your work.
              </span>
            )}
            {state.level === "warning" && (
              <span className="block mt-1 text-xs">
                Your support access will expire soon. Please complete your work.
              </span>
            )}
          </>
        ) : (
          <span>Calculating time remaining...</span>
        )}
      </AlertDescription>
    </Alert>
  );
}


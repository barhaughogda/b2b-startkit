/**
 * Session Timeout Warning Modal
 * 
 * Displays a warning modal when the session is about to expire due to inactivity.
 * Allows users to extend their session or logout immediately.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';
import { formatTimeRemaining } from '@/lib/session';

export interface SessionTimeoutWarningProps {
  /** Time remaining until logout in milliseconds */
  timeRemaining: number;
  /** Callback when user chooses to extend session */
  onExtend: () => void;
  /** Callback when user chooses to logout */
  onLogout: () => void;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
}

/**
 * Session timeout warning modal component
 */
export function SessionTimeoutWarning({
  timeRemaining,
  onExtend,
  onLogout,
  open,
  onOpenChange,
}: SessionTimeoutWarningProps) {
  const [displayTime, setDisplayTime] = useState(timeRemaining);
  
  // Update display time every second
  useEffect(() => {
    setDisplayTime(timeRemaining);
    
    const interval = setInterval(() => {
      setDisplayTime((prev) => Math.max(0, prev - 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timeRemaining]);
  
  // Auto-logout when time reaches zero
  useEffect(() => {
    if (displayTime <= 0 && open) {
      onLogout();
    }
  }, [displayTime, open, onLogout]);
  
  const formattedTime = formatTimeRemaining(displayTime);
  const isCritical = displayTime < 60 * 1000; // Less than 1 minute
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isCritical ? (
              <AlertTriangle className="h-6 w-6 text-status-error" />
            ) : (
              <Clock className="h-6 w-6 text-status-warning" />
            )}
            <DialogTitle className="text-xl">
              Session Timeout Warning
            </DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Your session will expire due to inactivity. Please choose an action to continue.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex flex-col items-center gap-4">
            <div className={`text-4xl font-mono font-bold ${
              isCritical ? 'text-status-error' : 'text-status-warning'
            }`}>
              {formattedTime}
            </div>
            <p className="text-sm text-text-secondary text-center">
              {isCritical
                ? 'Your session will expire very soon. Please extend your session to continue working.'
                : 'Your session will expire soon. Click "Stay Logged In" to continue your session.'}
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onLogout}
            className="sm:mr-2"
          >
            Logout Now
          </Button>
          <Button
            onClick={() => {
              onExtend();
              onOpenChange(false);
            }}
            className="bg-interactive-primary hover:bg-interactive-primary-hover text-text-inverse"
          >
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


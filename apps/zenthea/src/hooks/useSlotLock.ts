/**
 * useSlotLock - React hook for optimistic slot locking
 * 
 * Manages temporary locks on appointment time slots to prevent double-booking.
 * Includes automatic heartbeat to keep locks alive while user is booking.
 * 
 * @example
 * ```tsx
 * const { acquireLock, releaseLock, isLocked, lockError } = useSlotLock({
 *   tenantId: 'demo-tenant',
 *   sessionId: 'unique-session-id',
 * });
 * 
 * // When user selects a time slot
 * const result = await acquireLock({
 *   userId: providerId,
 *   clinicId: clinicId,
 *   slotStart: selectedTime,
 *   slotEnd: selectedTime + (30 * 60 * 1000), // 30 min slot
 * });
 * 
 * // When booking is complete or cancelled
 * await releaseLock();
 * ```
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

// Heartbeat interval (2 minutes - well before the 5 minute expiry)
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

// Generate a unique session ID for this browser tab
const generateSessionId = (): string => {
  // Check if we already have a session ID in sessionStorage
  if (typeof window !== 'undefined') {
    let sessionId = sessionStorage.getItem('zenthea-booking-session');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem('zenthea-booking-session', sessionId);
    }
    return sessionId;
  }
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

interface UseSlotLockOptions {
  tenantId: string;
  sessionId?: string; // Optional custom session ID
  patientId?: Id<'patients'>; // Optional patient ID
  onLockExpired?: () => void; // Callback when lock expires
}

interface AcquireLockParams {
  userId: Id<'users'>;
  clinicId?: Id<'clinics'>;
  slotStart: number;
  slotEnd: number;
}

interface SlotLockState {
  lockId: Id<'slotLocks'> | null;
  userId: Id<'users'> | null;
  slotStart: number | null;
  slotEnd: number | null;
  expiresAt: number | null;
}

export function useSlotLock(options: UseSlotLockOptions) {
  const { tenantId, patientId, onLockExpired } = options;
  const sessionId = options.sessionId || generateSessionId();
  
  // Mutations
  const acquireLockMutation = useMutation((api as any).slotLocks.acquireLock);
  const releaseLockMutation = useMutation((api as any).slotLocks.releaseLock);
  const extendLockMutation = useMutation((api as any).slotLocks.extendLock);
  const releaseSessionLocksMutation = useMutation((api as any).slotLocks.releaseSessionLocks);
  
  // State
  const [lockState, setLockState] = useState<SlotLockState>({
    lockId: null,
    userId: null,
    slotStart: null,
    slotEnd: null,
    expiresAt: null,
  });
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  
  // Refs for heartbeat
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lockStateRef = useRef(lockState);
  
  // Keep ref in sync with state
  useEffect(() => {
    lockStateRef.current = lockState;
  }, [lockState]);
  
  // Heartbeat function to extend the lock
  const heartbeat = useCallback(async () => {
    const currentLock = lockStateRef.current;
    if (!currentLock.lockId) return;
    
    try {
      const result = await extendLockMutation({
        lockId: currentLock.lockId,
        sessionId,
      });
      
      if (result.extended) {
        setLockState(prev => ({
          ...prev,
          expiresAt: result.expiresAt,
        }));
      }
    } catch (error) {
      console.warn('[useSlotLock] Heartbeat failed:', error);
      // Lock might have expired - notify callback
      onLockExpired?.();
      // Clear the lock state
      setLockState({
        lockId: null,
        userId: null,
        slotStart: null,
        slotEnd: null,
        expiresAt: null,
      });
    }
  }, [extendLockMutation, sessionId, onLockExpired]);
  
  // Start heartbeat when we have a lock
  useEffect(() => {
    if (lockState.lockId) {
      // Start heartbeat interval
      heartbeatIntervalRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
      
      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      };
    }
  }, [lockState.lockId, heartbeat]);
  
  // Cleanup on unmount - release all session locks
  useEffect(() => {
    return () => {
      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      // Release all session locks (fire and forget)
      releaseSessionLocksMutation({ sessionId, tenantId }).catch(() => {
        // Ignore errors on cleanup
      });
    };
  }, [releaseSessionLocksMutation, sessionId, tenantId]);
  
  // Acquire a lock on a slot
  const acquireLock = useCallback(async (params: AcquireLockParams): Promise<boolean> => {
    setIsLocking(true);
    setLockError(null);
    
    try {
      // First release any existing lock
      if (lockStateRef.current.lockId) {
        try {
          await releaseLockMutation({
            lockId: lockStateRef.current.lockId,
            sessionId,
          });
        } catch {
          // Ignore errors when releasing old lock
        }
      }
      
      // Acquire new lock
      const result = await acquireLockMutation({
        userId: params.userId,
        clinicId: params.clinicId,
        slotStart: params.slotStart,
        slotEnd: params.slotEnd,
        patientId,
        sessionId,
        tenantId,
      });
      
      setLockState({
        lockId: result.lockId,
        userId: params.userId,
        slotStart: params.slotStart,
        slotEnd: params.slotEnd,
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes from now
      });
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reserve time slot';
      setLockError(message);
      setLockState({
        lockId: null,
        userId: null,
        slotStart: null,
        slotEnd: null,
        expiresAt: null,
      });
      return false;
    } finally {
      setIsLocking(false);
    }
  }, [acquireLockMutation, releaseLockMutation, patientId, sessionId, tenantId]);
  
  // Release the current lock
  const releaseLock = useCallback(async (): Promise<boolean> => {
    if (!lockStateRef.current.lockId) {
      return true; // No lock to release
    }
    
    try {
      await releaseLockMutation({
        lockId: lockStateRef.current.lockId,
        sessionId,
      });
      
      setLockState({
        lockId: null,
        userId: null,
        slotStart: null,
        slotEnd: null,
        expiresAt: null,
      });
      
      return true;
    } catch (error) {
      console.warn('[useSlotLock] Failed to release lock:', error);
      // Still clear local state
      setLockState({
        lockId: null,
        userId: null,
        slotStart: null,
        slotEnd: null,
        expiresAt: null,
      });
      return false;
    }
  }, [releaseLockMutation, sessionId]);
  
  return {
    // State
    isLocked: !!lockState.lockId,
    isLocking,
    lockError,
    lockState,
    sessionId,
    
    // Actions
    acquireLock,
    releaseLock,
  };
}

export type { AcquireLockParams, SlotLockState };

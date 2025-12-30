'use client';

import { useRef, useCallback, useEffect } from 'react';

export interface TouchGesture {
  type: 'swipe' | 'pinch' | 'doubletap' | 'longpress';
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  velocity?: number;
  center?: { x: number; y: number };
}

interface TouchGestureOptions {
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  preventDefault?: boolean;
}

interface TouchState {
  startTime: number;
  startX: number;
  startY: number;
  lastTapTime: number;
  tapCount: number;
  longPressTimer?: NodeJS.Timeout;
}

export function useTouchGestures(
  onGesture: (gesture: TouchGesture) => void,
  options: TouchGestureOptions = {}
): React.RefObject<HTMLDivElement | null> {
  const {
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300,
    preventDefault = false
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const touchState = useRef<TouchState>({
    startTime: 0,
    startX: 0,
    startY: 0,
    lastTapTime: 0,
    tapCount: 0
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    if (!touch) return;
    const now = Date.now();
    
    touchState.current = {
      startTime: now,
      startX: touch.clientX,
      startY: touch.clientY,
      lastTapTime: touchState.current.lastTapTime,
      tapCount: touchState.current.tapCount
    };

    // Handle double tap detection
    if (now - touchState.current.lastTapTime < doubleTapDelay) {
      touchState.current.tapCount++;
    } else {
      touchState.current.tapCount = 1;
    }

    // Start long press timer
    touchState.current.longPressTimer = setTimeout(() => {
      onGesture({
        type: 'longpress',
        center: { x: touch.clientX, y: touch.clientY }
      });
    }, longPressDelay);

  }, [onGesture, longPressDelay, doubleTapDelay, preventDefault]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }

    // Clear long press timer if user moves
    if (touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
      touchState.current.longPressTimer = undefined;
    }

    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchState.current.startX;
    const deltaY = touch.clientY - touchState.current.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Detect swipe gestures
    if (distance > swipeThreshold) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      if (absX > absY) {
        // Horizontal swipe
        onGesture({
          type: 'swipe',
          direction: deltaX > 0 ? 'right' : 'left',
          distance: absX,
          velocity: absX / (Date.now() - touchState.current.startTime)
        });
      } else {
        // Vertical swipe
        onGesture({
          type: 'swipe',
          direction: deltaY > 0 ? 'down' : 'up',
          distance: absY,
          velocity: absY / (Date.now() - touchState.current.startTime)
        });
      }
    }

    // Handle pinch gestures (two fingers)
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      if (touch1 && touch2) {
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        onGesture({
          type: 'pinch',
          distance,
          center: {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
          }
        });
      }
    }

  }, [onGesture, swipeThreshold, preventDefault]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }

    // Clear long press timer
    if (touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
      touchState.current.longPressTimer = undefined;
    }

    const now = Date.now();
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchState.current.startX;
    const deltaY = touch.clientY - touchState.current.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Handle tap gestures
    if (distance < 10 && (now - touchState.current.startTime) < 300) {
      if (touchState.current.tapCount === 2) {
        // Double tap
        onGesture({
          type: 'doubletap',
          center: { x: touch.clientX, y: touch.clientY }
        });
      }
      touchState.current.lastTapTime = now;
    }

  }, [onGesture, preventDefault]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault]);

  return ref;
}

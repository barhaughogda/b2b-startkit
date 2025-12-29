'use client';

import React, { useCallback } from 'react';
import { useTouchGestures, TouchGesture } from '@/hooks/useTouchGestures';
import { useModal } from './ModalContext';

interface TouchGestureHandlerProps {
  children: React.ReactNode;
  modalId?: string;
}

export function TouchGestureHandler({ children, modalId }: TouchGestureHandlerProps) {
  const { modals, closeModal, minimizeModal, maximizeModal, organizeModals } = useModal();

  const handleGesture = useCallback((gesture: TouchGesture) => {
    if (!modalId) return;

    const modal = modals.find(m => m.id === modalId);
    if (!modal) return;

    switch (gesture.type) {
      case 'swipe':
        if (gesture.direction === 'down' && gesture.distance && gesture.distance > 100) {
          // Swipe down to minimize
          minimizeModal(modalId);
        } else if (gesture.direction === 'up' && gesture.distance && gesture.distance > 100) {
          // Swipe up to maximize
          maximizeModal(modalId);
        }
        break;
        
      case 'doubletap':
        // Double tap to toggle fullscreen
        if (modal.isMaximized) {
          maximizeModal(modalId); // This will restore
        } else {
          maximizeModal(modalId); // This will maximize
        }
        break;
        
      case 'longpress':
        // Long press to show context menu (could be implemented)
        console.log('Long press detected - could show context menu');
        break;
        
      case 'pinch':
        // Pinch to zoom (for images/documents in modals)
        if (gesture.distance && gesture.distance > 1.2) {
          console.log('Pinch zoom in');
        } else if (gesture.distance && gesture.distance < 0.8) {
          console.log('Pinch zoom out');
        }
        break;
    }
  }, [modals, closeModal, minimizeModal, maximizeModal, organizeModals, modalId]);

  const touchRef = useTouchGestures(handleGesture, {
    swipeThreshold: 50,
    longPressDelay: 500,
    doubleTapDelay: 300,
    preventDefault: true
  });

  return (
    <div ref={touchRef as React.RefObject<HTMLDivElement>} className="h-full w-full">
      {children}
    </div>
  );
}

// Hook for specific modal gestures
export function useModalGestures(modalId: string) {
  const { modals, closeModal, minimizeModal, maximizeModal } = useModal();

  const handleGesture = useCallback((gesture: TouchGesture) => {
    const modal = modals.find(m => m.id === modalId);
    if (!modal) return;

    switch (gesture.type) {
      case 'swipe':
        if (gesture.direction === 'down' && gesture.distance && gesture.distance > 100) {
          minimizeModal(modalId);
        } else if (gesture.direction === 'up' && gesture.distance && gesture.distance > 100) {
          maximizeModal(modalId);
        } else if (gesture.direction === 'left' && gesture.distance && gesture.distance > 150) {
          // Swipe left to close (with confirmation)
          if (confirm('Close this modal?')) {
            closeModal(modalId);
          }
        }
        break;
        
      case 'doubletap':
        // Double tap to toggle fullscreen
        maximizeModal(modalId);
        break;
        
      case 'longpress':
        // Long press for context menu
        console.log('Long press on modal', modalId);
        break;
    }
  }, [modals, closeModal, minimizeModal, maximizeModal, modalId]);

  return useTouchGestures(handleGesture, {
    swipeThreshold: 50,
    longPressDelay: 500,
    doubleTapDelay: 300,
    preventDefault: true
  });
}

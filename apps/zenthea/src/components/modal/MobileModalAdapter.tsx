'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Minimize2, 
  Maximize2,
  MoreHorizontal,
  Grid3X3
} from 'lucide-react';
import { useModal } from './ModalContext';
import { useDeviceDetection } from '@/lib/utils/deviceDetection';
import { Modal } from './types';

interface MobileModalAdapterProps {
  children: React.ReactNode;
}

export function MobileModalAdapter({ children }: MobileModalAdapterProps) {
  const { modals, closeModal, minimizeModal, maximizeModal, organizeModals } = useModal();
  const deviceInfo = useDeviceDetection();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(null);
  const [swipeDelta, setSwipeDelta] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const openModals = modals.filter(modal => !modal.isMinimized);
  const currentModal = openModals[currentIndex];

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwipeStart({ x: touch.clientX, y: touch.clientY });
    setSwipeDelta(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeStart) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStart.x;
    const deltaY = touch.clientY - swipeStart.y;
    
    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
      setSwipeDelta(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeStart) return;
    
    const threshold = 100;
    
    if (swipeDelta > threshold && currentIndex > 0) {
      // Swipe right - go to previous modal
      setCurrentIndex(currentIndex - 1);
    } else if (swipeDelta < -threshold && currentIndex < openModals.length - 1) {
      // Swipe left - go to next modal
      setCurrentIndex(currentIndex + 1);
    }
    
    setSwipeStart(null);
    setSwipeDelta(0);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!deviceInfo.isMobile && !deviceInfo.isTablet) return;
      
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < openModals.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (currentModal) {
          closeModal(currentModal.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, openModals.length, isFullscreen, currentModal, closeModal, deviceInfo]);

  // Auto-close when no modals
  useEffect(() => {
    if (openModals.length === 0) {
      setCurrentIndex(0);
      setIsFullscreen(false);
    } else if (currentIndex >= openModals.length) {
      setCurrentIndex(Math.max(0, openModals.length - 1));
    }
  }, [openModals.length, currentIndex]);

  if (deviceInfo.isDesktop) {
    // Desktop - render normal modals
    return <>{children}</>;
  }

  if (openModals.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {currentIndex + 1} of {openModals.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentIndex(Math.min(openModals.length - 1, currentIndex + 1))}
              disabled={currentIndex === openModals.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {currentModal && (
            <div className="flex items-center gap-2">
              {currentModal.icon && <currentModal.icon className="h-4 w-4" />}
              <span className="text-sm font-medium truncate max-w-32">
                {currentModal.title}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => currentModal && closeModal(currentModal.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modal Content */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-hidden ${
          isFullscreen ? 'h-[calc(100vh-60px)]' : 'h-[calc(100vh-120px)]'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeDelta}px)`,
          transition: swipeStart ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {currentModal && (
          <div className="h-full overflow-auto">
            {currentModal.content}
          </div>
        )}
      </div>

      {/* Mobile Footer */}
      {!isFullscreen && (
        <div className="flex items-center justify-between p-4 border-t bg-background">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={organizeModals}>
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            {openModals.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {openModals.length} open
            </Badge>
          </div>
        </div>
      )}

      {/* Swipe Indicators */}
      {swipeStart && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            {currentIndex > 0 && (
              <div className="bg-black/50 text-white px-2 py-1 rounded text-xs">
                ← Previous
              </div>
            )}
          </div>
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            {currentIndex < openModals.length - 1 && (
              <div className="bg-black/50 text-white px-2 py-1 rounded text-xs">
                Next →
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

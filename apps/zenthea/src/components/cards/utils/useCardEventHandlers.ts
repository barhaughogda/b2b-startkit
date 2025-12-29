import { useCallback } from 'react';
import { CardEventHandlers } from '../types';

interface UseCardEventHandlersProps {
  id: string;
  isMinimized: boolean;
  isMaximized: boolean;
  handlers: CardEventHandlers;
  dragHandler: any;
  resizeHandler: any;
}

export function useCardEventHandlers({
  id,
  isMinimized,
  isMaximized,
  handlers,
  dragHandler,
  resizeHandler
}: UseCardEventHandlersProps) {
  // Mouse down handler for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only allow dragging for non-minimized cards
    if (isMinimized) {
      // For minimized cards, just focus and don't start dragging
      handlers.onFocus?.(id);
      return;
    }
    
    // DON'T prevent default here - let the browser track mouse movements
    // We'll prevent default in mousemove instead
    // This allows mousemove events to fire properly
    
    dragHandler.handleMouseDown(e);
    handlers.onFocus?.(id);
  }, [isMinimized, handlers, id, dragHandler]);

  // Resize start handler
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => {
    if (isMinimized) return;
    resizeHandler.handleMouseDown(e, direction);
  }, [isMinimized, resizeHandler, id]);

  // Window control handlers
  const handleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handlers.onMinimize?.(id);
  }, [handlers, id]);

  const handleMaximize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handlers.onMaximize?.(id);
  }, [handlers, id]);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handlers.onClose?.(id);
  }, [handlers, id]);

  // Double click handler for maximize toggle
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Toggle between maximized and normal size
    if (isMaximized) {
      handlers.onMaximize?.(id); // This will unmaximize
    } else {
      handlers.onMaximize?.(id); // This will maximize
    }
  }, [handlers, id, isMaximized]);

  // Card click handler
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handlers.onFocus?.(id);
    // Only expand if the card is minimized
    // For non-minimized cards, just bring to front without changing size
    if (isMinimized) {
      handlers.onExpand?.(id);
    }
    // For maximized or normal cards, just focus without changing size
  }, [handlers, id, isMinimized]);

  // Scroll event handlers
  const handleScroll = useCallback((e: React.UIEvent) => {
    e.stopPropagation();
    // Allow scrolling within the card
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    // Allow wheel scrolling within the card
  }, []);

  // Mouse event handlers for card interactions
  const handleCardMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handlers.onFocus?.(id);
    // Only expand if the card is minimized
    if (isMinimized) {
      handlers.onExpand?.(id);
    }
  }, [handlers, id, isMinimized]);

  return {
    handleMouseDown,
    handleResizeStart,
    handleMinimize,
    handleMaximize,
    handleClose,
    handleDoubleClick,
    handleCardClick,
    handleCardMouseDown,
    handleScroll,
    handleWheel
  };
}

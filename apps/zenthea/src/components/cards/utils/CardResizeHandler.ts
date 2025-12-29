import { useRef, useState, useEffect } from 'react';
import { CardEventHandlers } from '../types';

export interface ResizeState {
  isResizing: boolean;
  resizeStart: { x: number; y: number };
  initialSize: { width: number; height: number };
  resizeDirection: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
}

export interface ResizeConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

export class CardResizeHandler {
  private resizeState: ResizeState;
  private setResizeState: (state: ResizeState) => void;
  private handlers: CardEventHandlers;
  private constraints: ResizeConstraints;
  private id: string;
  private isResizingRef: { current: boolean } = { current: false };
  private resizeStartRef: { current: { x: number; y: number } } = { current: { x: 0, y: 0 } };
  private initialSizeRef: { current: { width: number; height: number } } = { current: { width: 0, height: 0 } };
  private resizeDirectionRef: { current: ResizeState['resizeDirection'] } = { current: 'se' };

  private handlersRef: { current: CardEventHandlers };

  constructor(
    resizeState: ResizeState,
    setResizeState: (state: ResizeState) => void,
    handlers: CardEventHandlers,
    constraints: ResizeConstraints,
    id: string
  ) {
    this.resizeState = resizeState;
    this.setResizeState = setResizeState;
    this.handlers = handlers;
    this.handlersRef = { current: handlers }; // Store handlers in a ref so we always have the latest
    this.constraints = constraints;
    this.id = id;
    this.isResizingRef.current = resizeState.isResizing;
    this.resizeStartRef.current = resizeState.resizeStart;
    this.initialSizeRef.current = resizeState.initialSize;
    this.resizeDirectionRef.current = resizeState.resizeDirection;
  }

  updateHandlers = (handlers: CardEventHandlers) => {
    this.handlers = handlers;
    this.handlersRef.current = handlers;
  };

  handleMouseDown = (e: React.MouseEvent, direction: ResizeState['resizeDirection']) => {
    console.log('[CardResizeHandler] handleMouseDown called', { id: this.id, direction });
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;

    // Update refs immediately for synchronous access
    this.isResizingRef.current = true;
    this.resizeStartRef.current = { x: startX, y: startY };
    this.initialSizeRef.current = { width: this.resizeState.initialSize.width, height: this.resizeState.initialSize.height };
    this.resizeDirectionRef.current = direction;

    this.setResizeState({
      isResizing: true,
      resizeStart: { x: startX, y: startY },
      initialSize: { width: this.resizeState.initialSize.width, height: this.resizeState.initialSize.height },
      resizeDirection: direction
    });

    // Add global mouse event listeners
    console.log('[CardResizeHandler] Adding event listeners', { id: this.id, isResizingRef: this.isResizingRef.current });
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    console.log('[CardResizeHandler] Event listeners added');
  };

  private handleMouseMove = (e: MouseEvent) => {
    console.log('[CardResizeHandler] handleMouseMove fired', { id: this.id, isResizingRef: this.isResizingRef.current });
    if (!this.isResizingRef.current) {
      console.log('[CardResizeHandler] handleMouseMove - not resizing, returning');
      return;
    }
    console.log('[CardResizeHandler] handleMouseMove', { id: this.id, hasOnResize: !!this.handlersRef.current.onResize });

    const deltaX = e.clientX - this.resizeStartRef.current.x;
    const deltaY = e.clientY - this.resizeStartRef.current.y;

    let newWidth = this.initialSizeRef.current.width;
    let newHeight = this.initialSizeRef.current.height;

    // Calculate new dimensions based on resize direction
    switch (this.resizeDirectionRef.current) {
      case 'se':
        newWidth = Math.max(this.constraints.minWidth, Math.min(this.constraints.maxWidth, this.initialSizeRef.current.width + deltaX));
        newHeight = Math.max(this.constraints.minHeight, Math.min(this.constraints.maxHeight, this.initialSizeRef.current.height + deltaY));
        break;
      case 'sw':
        newWidth = Math.max(this.constraints.minWidth, Math.min(this.constraints.maxWidth, this.initialSizeRef.current.width - deltaX));
        newHeight = Math.max(this.constraints.minHeight, Math.min(this.constraints.maxHeight, this.initialSizeRef.current.height + deltaY));
        break;
      case 'ne':
        newWidth = Math.max(this.constraints.minWidth, Math.min(this.constraints.maxWidth, this.initialSizeRef.current.width + deltaX));
        newHeight = Math.max(this.constraints.minHeight, Math.min(this.constraints.maxHeight, this.initialSizeRef.current.height - deltaY));
        break;
      case 'nw':
        newWidth = Math.max(this.constraints.minWidth, Math.min(this.constraints.maxWidth, this.initialSizeRef.current.width - deltaX));
        newHeight = Math.max(this.constraints.minHeight, Math.min(this.constraints.maxHeight, this.initialSizeRef.current.height - deltaY));
        break;
      case 'e':
        newWidth = Math.max(this.constraints.minWidth, Math.min(this.constraints.maxWidth, this.initialSizeRef.current.width + deltaX));
        break;
      case 'w':
        newWidth = Math.max(this.constraints.minWidth, Math.min(this.constraints.maxWidth, this.initialSizeRef.current.width - deltaX));
        break;
      case 's':
        newHeight = Math.max(this.constraints.minHeight, Math.min(this.constraints.maxHeight, this.initialSizeRef.current.height + deltaY));
        break;
      case 'n':
        newHeight = Math.max(this.constraints.minHeight, Math.min(this.constraints.maxHeight, this.initialSizeRef.current.height - deltaY));
        break;
    }

    // Call the resize handler - use handlersRef to get the latest handlers
    this.handlersRef.current.onResize?.(this.id, { width: newWidth, height: newHeight });
  };

  private handleMouseUp = () => {
    if (this.isResizingRef.current) {
      // Update ref immediately
      this.isResizingRef.current = false;
      
      this.setResizeState({
        ...this.resizeState,
        isResizing: false
      });
    }

    // Remove global mouse event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  updateState = (newState: ResizeState) => {
    this.resizeState = newState;
    // Update refs to keep them in sync
    // Don't reset isResizingRef if we're currently resizing (it's managed by handleMouseDown/handleMouseUp)
    if (!this.isResizingRef.current) {
      this.isResizingRef.current = newState.isResizing;
    }
    this.resizeStartRef.current = newState.resizeStart;
    this.initialSizeRef.current = newState.initialSize;
    this.resizeDirectionRef.current = newState.resizeDirection;
  };

  updateSize = (newSize: { width: number; height: number }) => {
    // Update the initial size when card dimensions change externally
    if (!this.isResizingRef.current) {
      this.initialSizeRef.current = newSize;
      this.setResizeState({
        ...this.resizeState,
        initialSize: newSize
      });
    }
  };

  cleanup = () => {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };
}

// Hook for using the resize handler
export const useCardResize = (
  initialSize: { width: number; height: number },
  handlers: CardEventHandlers,
  constraints: ResizeConstraints,
  id: string
) => {
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    resizeStart: { x: 0, y: 0 },
    initialSize,
    resizeDirection: 'se'
  });

  const resizeHandlerRef = useRef<CardResizeHandler | null>(null);
  const sizeRef = useRef(initialSize);

  // Create handler once and keep it stable
  if (!resizeHandlerRef.current) {
    resizeHandlerRef.current = new CardResizeHandler(resizeState, setResizeState, handlers, constraints, id);
  }

  // Update handlers when they change
  useEffect(() => {
    resizeHandlerRef.current?.updateHandlers(handlers);
  }, [handlers]);

  // Update the handler's state when resizeState changes
  resizeHandlerRef.current.updateState(resizeState);

  // Update initialSize when it changes externally (but not during resizing)
  useEffect(() => {
    if (!resizeState.isResizing) {
      if (sizeRef.current.width !== initialSize.width || sizeRef.current.height !== initialSize.height) {
        resizeHandlerRef.current?.updateSize(initialSize);
        sizeRef.current = initialSize;
      }
    }
  }, [initialSize.width, initialSize.height, resizeState.isResizing]);

  return {
    resizeState,
    resizeHandler: resizeHandlerRef.current,
    setResizeState
  };
};

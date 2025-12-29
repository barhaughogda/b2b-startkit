import { useRef, useState, useEffect } from 'react';
import { CardEventHandlers } from '../types';

export interface DragState {
  isDragging: boolean;
  dragStart: { x: number; y: number };
  initialPosition: { x: number; y: number };
}

export interface DragConstraints {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class CardDragHandler {
  private dragState: DragState;
  private setDragState: (state: DragState) => void;
  private handlers: CardEventHandlers;
  private constraints: DragConstraints;
  private id: string;
  private isDraggingRef: { current: boolean } = { current: false };
  private dragStartRef: { current: { x: number; y: number } } = { current: { x: 0, y: 0 } };
  private initialPositionRef: { current: { x: number; y: number } } = { current: { x: 0, y: 0 } };

  private handlersRef: { current: CardEventHandlers };

  constructor(
    dragState: DragState,
    setDragState: (state: DragState) => void,
    handlers: CardEventHandlers,
    constraints: DragConstraints,
    id: string
  ) {
    this.dragState = dragState;
    this.setDragState = setDragState;
    this.handlers = handlers;
    this.handlersRef = { current: handlers }; // Store handlers in a ref so we always have the latest
    this.constraints = constraints;
    this.id = id;
    this.isDraggingRef.current = dragState.isDragging;
    this.dragStartRef.current = dragState.dragStart;
    this.initialPositionRef.current = dragState.initialPosition;
  }

  updateHandlers = (handlers: CardEventHandlers) => {
    this.handlers = handlers;
    this.handlersRef.current = handlers;
  };

  handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Always prevent drag if clicking directly on interactive elements or resize handles
    const isDirectlyInteractive = target.matches('button, input, select, textarea, a, [role="button"], [tabindex], [data-no-drag]');
    const isResizeHandle = target.closest('[data-resize-handle="true"]');
    
    if (isDirectlyInteractive || isResizeHandle) {
      return;
    }

    // Check if we're on a drag handle area - if so, always allow drag
    const isDragHandle = target.closest('[data-drag-handle="true"]');
    
    // If not on a drag handle, check if we're inside an interactive element
    if (!isDragHandle) {
      const interactiveParent = target.closest('button, input, select, textarea, a, [role="button"]');
      if (interactiveParent) {
        return;
      }
    }

    // DON'T prevent default here - we need the browser to track mouse movements
    // We'll prevent default in mousemove to stop text selection and other behaviors
    
    const startX = e.clientX;
    const startY = e.clientY;

    // Update refs immediately for synchronous access
    this.isDraggingRef.current = true;
    this.dragStartRef.current = { x: startX, y: startY };
    this.initialPositionRef.current = { x: this.dragState.initialPosition.x, y: this.dragState.initialPosition.y };

    this.setDragState({
      isDragging: true,
      dragStart: { x: startX, y: startY },
      initialPosition: { x: this.dragState.initialPosition.x, y: this.dragState.initialPosition.y }
    });

    // DON'T add listeners here - let useEffect in the hook manage them
    // This matches the pattern used by the working modal system
  };

  handleMouseMove = (e: MouseEvent) => {
    if (!this.isDraggingRef.current) {
      return;
    }

    // Prevent all default behaviors FIRST
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const deltaX = e.clientX - this.dragStartRef.current.x;
    const deltaY = e.clientY - this.dragStartRef.current.y;

    const newX = Math.max(
      this.constraints.minX,
      Math.min(this.constraints.maxX, this.initialPositionRef.current.x + deltaX)
    );
    const newY = Math.max(
      this.constraints.minY,
      Math.min(this.constraints.maxY, this.initialPositionRef.current.y + deltaY)
    );

    // Call the drag handler - use handlersRef to get the latest handlers
    this.handlersRef.current.onDrag?.(this.id, { x: newX, y: newY });
  };

  handleMouseUp = () => {
    if (this.isDraggingRef.current) {
      // Update ref immediately
      this.isDraggingRef.current = false;
      
      // Keep the current position as the new initial position for the next drag
      // The actual position is being updated via onDrag callback, so just stop dragging
      this.setDragState({
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        initialPosition: this.dragState.initialPosition // Will sync with prop via useEffect
      });
    }

    // Listeners are now managed by useEffect in the hook, so no cleanup needed here
  };

  updateState = (newState: DragState) => {
    this.dragState = newState;
    // Update refs to keep them in sync
    // Don't reset isDraggingRef if we're currently dragging (it's managed by handleMouseDown/handleMouseUp)
    if (!this.isDraggingRef.current) {
      this.isDraggingRef.current = newState.isDragging;
    }
    this.dragStartRef.current = newState.dragStart;
    this.initialPositionRef.current = newState.initialPosition;
  };

  updatePosition = (newPosition: { x: number; y: number }) => {
    // Update the initial position when card position changes externally
    if (!this.isDraggingRef.current) {
      this.initialPositionRef.current = newPosition;
      this.setDragState({
        ...this.dragState,
        initialPosition: newPosition
      });
    }
  };

  // Note: cleanup() method removed - event listeners are now managed by useEffect cleanup
  // in useCardDrag hook, which properly removes the wrapped functions that were actually registered.
}

// Hook for using the drag handler
export const useCardDrag = (
  initialPosition: { x: number; y: number },
  handlers: CardEventHandlers,
  constraints: DragConstraints,
  id: string
) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    initialPosition
  });

  const dragHandlerRef = useRef<CardDragHandler | null>(null);
  const positionRef = useRef(initialPosition);

  // Create handler once and keep it stable
  if (!dragHandlerRef.current) {
    dragHandlerRef.current = new CardDragHandler(dragState, setDragState, handlers, constraints, id);
  }

  // Update handlers when they change
  useEffect(() => {
    dragHandlerRef.current?.updateHandlers(handlers);
  }, [handlers]);

  // Update the handler's state when dragState changes
  dragHandlerRef.current.updateState(dragState);

  // Add/remove event listeners based on isDragging state (like modal system)
  useEffect(() => {
    const handler = dragHandlerRef.current;
    if (!handler) return;

    if (dragState.isDragging) {
      // Wrap handlers to ensure correct binding
      const wrappedMouseMove = (e: MouseEvent) => {
        handler.handleMouseMove(e);
      };
      
      const wrappedMouseUp = () => {
        handler.handleMouseUp();
      };
      
      // Add listeners to document (like modal system)
      document.addEventListener('mousemove', wrappedMouseMove);
      document.addEventListener('mouseup', wrappedMouseUp);

      return () => {
        // Remove the wrapped listeners that were actually registered
        document.removeEventListener('mousemove', wrappedMouseMove);
        document.removeEventListener('mouseup', wrappedMouseUp);
      };
    }
  }, [dragState.isDragging, id]);

  // Update position when it changes externally (but not during dragging)
  useEffect(() => {
    if (!dragState.isDragging) {
      if (positionRef.current.x !== initialPosition.x || positionRef.current.y !== initialPosition.y) {
        dragHandlerRef.current?.updatePosition(initialPosition);
        positionRef.current = initialPosition;
      }
    }
  }, [initialPosition.x, initialPosition.y, dragState.isDragging]);

  return {
    dragState,
    dragHandler: dragHandlerRef.current,
    setDragState
  };
};

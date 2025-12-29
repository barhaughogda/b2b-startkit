'use client';

import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Modal, ModalContextType, ModalStack, ModalPosition, ModalDimensions } from './types';

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

// Smart positioning algorithm
function findAvailablePosition(existingModals: Modal[], defaultWidth: number = 500, defaultHeight: number = 500): ModalPosition {
  if (typeof window === 'undefined') {
    return { x: 100, y: 100 };
  }
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 20;
  
  let x = margin;
  let y = margin;
  
  if (existingModals.length === 0) {
    return { x, y };
  }
  
  const gridSize = 50;
  const maxAttempts = 100;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    let found = true;
    
    for (const modal of existingModals) {
      if (modal.isMinimized) continue;
      
      const modalX = modal.position?.x || 0;
      const modalY = modal.position?.y || 0;
      const modalWidth = modal.dimensions?.width || 500;
      const modalHeight = modal.dimensions?.height || 500;
      
      if (
        x < modalX + modalWidth + margin &&
        x + defaultWidth + margin > modalX &&
        y < modalY + modalHeight + margin &&
        y + defaultHeight + margin > modalY
      ) {
        found = false;
        break;
      }
    }
    
    if (found) {
      return { x, y };
    }
    
    x += gridSize;
    if (x + defaultWidth > viewportWidth - margin) {
      x = margin;
      y += gridSize;
    }
    
    if (y + defaultHeight > viewportHeight - margin) {
      const firstModal = existingModals.find(m => !m.isMinimized);
      if (firstModal) {
        return {
          x: (firstModal.position?.x || 0) + 20,
          y: (firstModal.position?.y || 0) + 20
        };
      }
    }
    
    attempts++;
  }
  
  return { x: margin, y: margin };
}

// Auto-organize modals in a grid
function organizeModalsInGrid(modals: Modal[]): Modal[] {
  if (typeof window === 'undefined' || modals.length === 0) return modals;
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 20;
  const modalWidth = 500;
  const modalHeight = 500;
  
  const cols = Math.floor((viewportWidth - margin) / (modalWidth + margin));
  const rows = Math.ceil(modals.length / cols);
  
  return modals.map((modal, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    const x = margin + col * (modalWidth + margin);
    const y = margin + row * (modalHeight + margin);
    
    return {
      ...modal,
      position: { x, y },
      dimensions: { width: modalWidth, height: modalHeight }
    };
  });
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = React.useState<Modal[]>([]);
  const [stacks, setStacks] = React.useState<ModalStack[]>([]);
  const [activeModalId, setActiveModalId] = React.useState<string | undefined>();
  const [nextZIndex, setNextZIndex] = React.useState(1000);
  const [isClient, setIsClient] = React.useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const openModal = useCallback((modalData: Omit<Modal, 'id' | 'zIndex'>) => {
    const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const sizeDimensions: Record<string, ModalDimensions> = {
      sm: { width: 384, height: 256 },
      md: { width: 512, height: 384 },
      lg: { width: 640, height: 512 },
      xl: { width: 768, height: 640 },
      full: { 
        width: typeof window !== 'undefined' ? window.innerWidth * 0.95 : 1200, 
        height: typeof window !== 'undefined' ? window.innerHeight * 0.95 : 800 
      }
    };
    
    const dimensions = modalData.dimensions || sizeDimensions[modalData.size || 'md'];
    const position = modalData.position || findAvailablePosition(modals, dimensions.width, dimensions.height);
    
    const newModal: Modal = {
      ...modalData,
      id,
      zIndex: nextZIndex,
      position,
      dimensions,
      isMinimized: false,
      isMaximized: false,
      openedAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
    };
    
    setModals(prev => [...prev, newModal]);
    setNextZIndex(prev => prev + 1);
    setActiveModalId(id);
    return id;
  }, [nextZIndex, modals]);

  const closeModal = useCallback((id: string) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
    setActiveModalId(prev => prev === id ? undefined : prev);
  }, []);

  const updateModal = useCallback((id: string, updates: Partial<Modal>) => {
    setModals(prev => prev.map(modal => 
      modal.id === id ? { ...modal, ...updates, lastAccessedAt: Date.now() } : modal
    ));
  }, []);

  const minimizeModal = useCallback((id: string) => {
    setModals(prev => prev.map(modal => 
      modal.id === id ? { ...modal, isMinimized: true } : modal
    ));
  }, []);

  const maximizeModal = useCallback((id: string) => {
    setModals(prev => prev.map(modal => {
      if (modal.id !== id) return modal;
      
      if (typeof window === 'undefined') return modal;
      
      const isCurrentlyMaximized = modal.isMaximized;
      
      if (isCurrentlyMaximized) {
        // Restore to original dimensions
        return {
          ...modal,
          isMaximized: false,
          dimensions: modal.originalDimensions || modal.dimensions,
          originalDimensions: undefined
        };
      } else {
        // Store current dimensions and maximize
        const currentDimensions = modal.dimensions || { width: 500, height: 500 };
        const maxWidth = window.innerWidth - 40;
        const maxHeight = window.innerHeight - 40;
        
        return {
          ...modal,
          isMaximized: true,
          originalDimensions: currentDimensions,
          dimensions: { width: maxWidth, height: maxHeight },
          position: {
            x: Math.max(0, (window.innerWidth - maxWidth) / 2),
            y: Math.max(0, (window.innerHeight - maxHeight) / 2)
          }
        };
      }
    }));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setModals(prev => prev.map(modal => 
      modal.id === id ? { ...modal, zIndex: nextZIndex } : modal
    ));
    setNextZIndex(prev => prev + 1);
    setActiveModalId(id);
  }, [nextZIndex]);

  const createStack = useCallback((name: string, groupBy: ModalStack['groupBy']) => {
    const id = `stack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newStack: ModalStack = {
      id,
      name,
      modals: [],
      groupBy,
      position: { x: 100, y: 100 }
    };
    
    setStacks(prev => [...prev, newStack]);
    return id;
  }, []);

  const addToStack = useCallback((modalId: string, stackId: string) => {
    setModals(prev => prev.map(modal => 
      modal.id === modalId ? { ...modal, stackId } : modal
    ));
    
    setStacks(prev => prev.map(stack => 
      stack.id === stackId 
        ? { ...stack, modals: [...stack.modals, modalId] }
        : stack
    ));
  }, []);

  const removeFromStack = useCallback((modalId: string) => {
    setModals(prev => prev.map(modal => 
      modal.id === modalId ? { ...modal, stackId: undefined } : modal
    ));
    
    setStacks(prev => prev.map(stack => ({
      ...stack,
      modals: stack.modals.filter(id => id !== modalId)
    })));
  }, []);

  const organizeModals = useCallback(() => {
    setModals(prev => organizeModalsInGrid(prev));
  }, []);

  const minimizeAll = useCallback(() => {
    setModals(prev => prev.map(modal => ({ ...modal, isMinimized: true })));
  }, []);

  const closeAll = useCallback(() => {
    if (confirm('Are you sure you want to close all modals? Any unsaved changes will be lost.')) {
      setModals([]);
      setActiveModalId(undefined);
    }
  }, []);

  const convertToTask = useCallback((modalId: string, taskData: Partial<Modal>) => {
    setModals(prev => prev.map(modal => 
      modal.id === modalId 
        ? { 
            ...modal, 
            ...taskData,
            status: 'open',
            dueDate: taskData.dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default to tomorrow
            priority: taskData.priority || 'medium'
          } 
        : modal
    ));
  }, []);

  const markTaskComplete = useCallback((modalId: string) => {
    setModals(prev => prev.map(modal => 
      modal.id === modalId 
        ? { ...modal, status: 'completed' }
        : modal
    ));
  }, []);

  const contextValue: ModalContextType = {
    modals,
    stacks,
    activeModalId,
    openModal,
    closeModal,
    updateModal,
    minimizeModal,
    maximizeModal,
    bringToFront,
    createStack,
    addToStack,
    removeFromStack,
    organizeModals,
    minimizeAll,
    closeAll,
    convertToTask,
    markTaskComplete,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
}

function ModalRenderer() {
  const { modals } = useModal();
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {modals.map((modal) => (
        <ModalWindow key={modal.id} modal={modal} />
      ))}
    </div>
  );
}

interface ModalWindowProps {
  modal: Modal;
}

function ModalWindow({ modal }: ModalWindowProps) {
  const { closeModal, minimizeModal, maximizeModal, updateModal, bringToFront } = useModal();
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = React.useState({ x: 0, y: 0, width: 0, height: 0 });
  const [position, setPosition] = React.useState(modal.position || { x: 100, y: 100 });
  const [dimensions, setDimensions] = React.useState(modal.dimensions || { width: 500, height: 500 });
  const modalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modal.position) setPosition(modal.position);
    if (modal.dimensions) setDimensions(modal.dimensions);
  }, [modal.position, modal.dimensions]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      bringToFront(modal.id);
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: dimensions.width,
      height: dimensions.height,
    });
    bringToFront(modal.id);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const maxX = window.innerWidth - dimensions.width;
      const maxY = window.innerHeight - dimensions.height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
    
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(300, resizeStart.width + deltaX);
      const newHeight = Math.max(200, resizeStart.height + deltaY);
      
      setDimensions({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      updateModal(modal.id, { position });
    }
    if (isResizing) {
      updateModal(modal.id, { dimensions });
    }
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, position, dimensions]);

  if (modal.isMinimized) {
    return (
      <div
        ref={modalRef}
        className="fixed bg-background border border-border rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 pointer-events-auto"
        style={{
          left: modal.position?.x || 0,
          top: modal.position?.y || 0,
          width: 200,
          height: 45,
          zIndex: modal.zIndex,
        }}
        onMouseDown={handleMouseDown}
        onClick={() => minimizeModal(modal.id)}
      >
        <div className="flex items-center justify-between h-full px-2 py-1">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {modal.icon && <modal.icon className="h-3.5 w-3.5 flex-shrink-0" />}
            <span className="text-xs font-medium truncate">{modal.title}</span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              className="h-6 w-6 p-0 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                minimizeModal(modal.id);
              }}
            >
              <span className="sr-only">Maximize</span>
            </button>
            <button
              className="h-6 w-6 p-0 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                closeModal(modal.id);
              }}
            >
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={modalRef}
      className="fixed bg-background border border-border rounded-lg shadow-lg hover:shadow-xl transition-shadow pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        width: dimensions.width,
        height: dimensions.height,
        zIndex: modal.zIndex,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b border-border cursor-move bg-muted/20"
        data-drag-handle
      >
        <div className="flex items-center gap-2">
          {modal.icon && <modal.icon className="h-5 w-5 text-muted-foreground" />}
          <h3 className="font-semibold text-sm truncate">{modal.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="h-6 w-6 p-0 hover:bg-muted rounded"
            onClick={() => minimizeModal(modal.id)}
            title="Minimize"
          >
            <span className="sr-only">Minimize</span>
          </button>
          <button
            className="h-6 w-6 p-0 hover:bg-muted rounded"
            onClick={() => maximizeModal(modal.id)}
            title="Maximize"
          >
            <span className="sr-only">Maximize</span>
          </button>
          <button
            className="h-6 w-6 p-0 hover:bg-muted rounded"
            onClick={() => closeModal(modal.id)}
            title="Close"
          >
            <span className="sr-only">Close</span>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 overflow-auto" style={{ height: dimensions.height - 60 }}>
        {modal.content}
      </div>
      
      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={handleResizeMouseDown}
        style={{
          background: 'linear-gradient(-45deg, transparent 30%, #ccc 30%, #ccc 50%, transparent 50%)',
        }}
      />
    </div>
  );
}

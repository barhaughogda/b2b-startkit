'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Minimize2, Maximize2, Move, RotateCcw, User, Activity, Heart, Pill, TestTube, Scan, FileText, Minus, Calendar, Tag, Paperclip, MessageSquare, Clock, Plus, Trash2, Edit, Info, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Modal {
  id: string;
  title: string;
  content: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
  isMinimized?: boolean;
  zIndex?: number;
  icon?: React.ComponentType<any>;
  eventType?: string;
  // Enhanced medical fields
  patientId?: string;
  patientName?: string;
  members?: Array<{ id: string; name: string; avatar?: string; role: string }>;
  tags?: Array<{ id: string; name: string; color: string }>;
  dueDate?: string;
  description?: string;
  attachments?: Array<{ id: string; name: string; type: string; size: string }>;
  comments?: Array<{ id: string; author: string; content: string; timestamp: string; avatar?: string }>;
  activity?: Array<{ id: string; action: string; timestamp: string; user: string; details?: string }>;
  // Resize functionality
  isResizing?: boolean;
  resizeHandle?: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's';
  // Store original dimensions before maximizing
  originalDimensions?: { width: number; height: number };
}

interface ModalContextType {
  modals: Modal[];
  openModal: (modal: Omit<Modal, 'id' | 'zIndex'>) => string;
  closeModal: (id: string) => void;
  minimizeModal: (id: string) => void;
  maximizeModal: (id: string) => void;
  updateModal: (id: string, updates: Partial<Modal>) => void;
  bringToFront: (id: string) => void;
}

// Smart positioning algorithm to find available space
function findAvailablePosition(existingModals: Modal[], defaultWidth: number = 400, defaultHeight: number = 300) {
  // Client-side only
  if (typeof window === 'undefined') {
    return { x: 20, y: 20 };
  }
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 20;
  
  // Start with a default position
  let x = margin;
  let y = margin;
  
  // If no existing modals, use default position
  if (existingModals.length === 0) {
    return { x, y };
  }
  
  // Create a grid of potential positions
  const gridSize = 50;
  const maxAttempts = 100;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    let found = true;
    
    // Check if this position conflicts with existing modals
    for (const modal of existingModals) {
      if (modal.isMinimized) continue;
      
      const modalX = modal.position?.x || 0;
      const modalY = modal.position?.y || 0;
      const modalWidth = modal.dimensions?.width || 500;
      const modalHeight = modal.dimensions?.height || 500;
      
      // Check for overlap
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
    
    // Move to next position
    x += gridSize;
    if (x + defaultWidth > viewportWidth - margin) {
      x = margin;
      y += gridSize;
    }
    
    if (y + defaultHeight > viewportHeight - margin) {
      // If we can't find space, stack on top of the first modal
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
  
  // Fallback: stack on top of the first modal
  const firstModal = existingModals.find(m => !m.isMinimized);
  if (firstModal) {
    return {
      x: (firstModal.position?.x || 0) + 20,
      y: (firstModal.position?.y || 0) + 20
    };
  }
  
  return { x: margin, y: margin };
}

function findCascadingPosition(existingModals: Modal[], defaultWidth: number = 500, defaultHeight: number = 500) {
  // Client-side only
  if (typeof window === 'undefined') {
    return { x: 100, y: 100 };
  }
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cascadeOffset = 30; // Offset for cascading effect
  const baseX = 100; // Base X position
  const baseY = 100; // Base Y position
  
  // Count non-minimized modals to determine cascade position
  const nonMinimizedModals = existingModals.filter(m => !m.isMinimized);
  const cascadeIndex = nonMinimizedModals.length;
  
  // Calculate cascading position
  const x = Math.min(baseX + (cascadeIndex * cascadeOffset), viewportWidth - defaultWidth - 20);
  const y = Math.min(baseY + (cascadeIndex * cascadeOffset), viewportHeight - defaultHeight - 20);
  
  return { x, y };
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ProviderModalProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = useState<Modal[]>([]);
  const [draggedModal, setDraggedModal] = useState<string | null>(null);
  const [resizingModal, setResizingModal] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState<number | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const openModal = useCallback((modalData: Omit<Modal, 'id' | 'zIndex'>) => {
    const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const maxZIndex = Math.max(...modals.map(m => m.zIndex || 0), 1000);
    
    const newModal: Modal = {
      ...modalData,
      id,
      zIndex: maxZIndex + 1,
      position: modalData.position || findCascadingPosition(modals),
      dimensions: modalData.dimensions || { width: 500, height: 500 },
      isMinimized: false,
    };
    
    setModals(prev => [...prev, newModal]);
    return id;
  }, [modals]);

  const closeModal = useCallback((id: string) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  }, []);

  const minimizeModal = useCallback((id: string) => {
    setModals(prev => {
      const targetModal = prev.find(m => m.id === id);
      if (!targetModal) return prev;
      
      // If already minimized, restore it with cascading position
      if (targetModal.isMinimized) {
        const cascadingPosition = findCascadingPosition(prev.filter(m => !m.isMinimized), targetModal.dimensions?.width || 500, targetModal.dimensions?.height || 500);
        return prev.map(modal => 
          modal.id === id 
            ? { 
                ...modal, 
                isMinimized: false,
                position: cascadingPosition
              } 
            : modal
        );
      }
      
      // If minimizing, add to stack
      const minimizedModals = prev.filter(m => m.isMinimized);
      const stackOffset = minimizedModals.length * 40; // 40px offset for each minimized modal
      
      return prev.map(modal => 
        modal.id === id 
          ? { 
              ...modal, 
              isMinimized: true,
              position: { 
                x: 20 + stackOffset, // 20px from left edge + stack offset
                y: typeof window !== 'undefined' ? window.innerHeight - 80 - stackOffset : 20 // 80px from bottom + stack offset
              }
            } 
          : modal
      );
    });
  }, []);

  const maximizeModal = useCallback((id: string) => {
    setModals(prev => prev.map(modal => {
      if (modal.id !== id) return modal;
      
      // Client-side only
      if (typeof window === 'undefined') return modal;
      
      const isCurrentlyMaximized = modal.dimensions?.width === window.innerWidth - 40;
      
      if (isCurrentlyMaximized) {
        // Restore to original dimensions and center
        const originalWidth = modal.originalDimensions?.width || 500;
        const originalHeight = modal.originalDimensions?.height || 500;
        return {
          ...modal,
          dimensions: { width: originalWidth, height: originalHeight },
          position: {
            x: Math.max(0, (window.innerWidth - originalWidth) / 2),
            y: Math.max(0, (window.innerHeight - originalHeight) / 2)
          },
          originalDimensions: undefined // Clear stored dimensions
        };
      } else {
        // Store current dimensions before maximizing
        const currentDimensions = modal.dimensions || { width: 500, height: 500 };
        const maxWidth = window.innerWidth - 40;
        const maxHeight = window.innerHeight - 40;
        return {
          ...modal,
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

  const updateModal = useCallback((id: string, updates: Partial<Modal>) => {
    setModals(prev => prev.map(modal => 
      modal.id === id ? { ...modal, ...updates } : modal
    ));
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent, modalId: string, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingModal(modalId);
    setModals(prev => prev.map(modal => 
      modal.id === modalId ? { ...modal, isResizing: true, resizeHandle: handle as any } : modal
    ));
  }, []);

  const handleResize = useCallback((e: MouseEvent) => {
    if (!resizingModal) return;

    setModals(prev => prev.map(modal => {
      if (modal.id !== resizingModal) return modal;

      const currentModal = modal;
      const handle = currentModal.resizeHandle;
      if (!handle || !currentModal.dimensions) return modal;

      const deltaX = e.clientX - (currentModal.position?.x || 0);
      const deltaY = e.clientY - (currentModal.position?.y || 0);
      
      let newWidth = currentModal.dimensions.width;
      let newHeight = currentModal.dimensions.height;
      let newX = currentModal.position?.x || 0;
      let newY = currentModal.position?.y || 0;

      // Minimum dimensions
      const minWidth = 300;
      const minHeight = 200;

      if (handle.includes('e')) {
        newWidth = Math.max(minWidth, deltaX);
      }
      if (handle.includes('w')) {
        const widthChange = deltaX;
        newWidth = Math.max(minWidth, currentModal.dimensions.width - widthChange);
        newX = (currentModal.position?.x || 0) + widthChange;
      }
      if (handle.includes('s')) {
        newHeight = Math.max(minHeight, deltaY);
      }
      if (handle.includes('n')) {
        const heightChange = deltaY;
        newHeight = Math.max(minHeight, currentModal.dimensions.height - heightChange);
        newY = (currentModal.position?.y || 0) + heightChange;
      }

      return {
        ...modal,
        dimensions: { width: newWidth, height: newHeight },
        position: { x: newX, y: newY }
      };
    }));
  }, [resizingModal]);

  const handleResizeEnd = useCallback(() => {
    setResizingModal(null);
    setModals(prev => prev.map(modal => 
      modal.isResizing ? { ...modal, isResizing: false, resizeHandle: undefined } : modal
    ));
  }, []);

  const bringToFront = useCallback((id: string) => {
    const maxZIndex = Math.max(...modals.map(m => m.zIndex || 0));
    setModals(prev => prev.map(modal => 
      modal.id === id ? { ...modal, zIndex: maxZIndex + 1 } : modal
    ));
  }, [modals]);

  // Handle drag functionality
  const handleMouseDown = useCallback((e: React.MouseEvent, modalId: string) => {
    const modal = modals.find(m => m.id === modalId);
    if (!modal) return;
    
    // For minimized modals, allow dragging from anywhere on the modal
    // For full modals, only allow dragging from the header area
    if (!modal.isMinimized && e.target !== e.currentTarget) return;
    
    setDragStartTime(Date.now());
    setDraggedModal(modalId);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - (modal.position?.x || 0),
      y: e.clientY - (modal.position?.y || 0)
    });
    bringToFront(modalId);
  }, [modals, bringToFront]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && draggedModal) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      updateModal(draggedModal, {
        position: { x: Math.max(0, Math.min(typeof window !== 'undefined' ? window.innerWidth - 200 : 800, newX)), y: Math.max(0, newY) }
      });
    }
    
    if (resizingModal) {
      handleResize(e);
    }
  }, [isDragging, draggedModal, dragOffset, updateModal, resizingModal, handleResize]);

  const handleMouseUp = useCallback(() => {
    setDraggedModal(null);
    setIsDragging(false);
    if (resizingModal) {
      handleResizeEnd();
    }
  }, [resizingModal, handleResizeEnd]);

  useEffect(() => {
    if (isDragging || resizingModal) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, resizingModal, handleMouseMove, handleMouseUp]);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <ModalContext.Provider value={{
      modals,
      openModal,
      closeModal,
      minimizeModal,
      maximizeModal,
      updateModal,
      bringToFront
    }}>
      {children}
      {isClient && createPortal(
        <div className="fixed inset-0 pointer-events-none z-50">
          {modals.map((modal) => (
            <DraggableModal
              key={modal.id}
              modal={modal}
              onMouseDown={(e) => handleMouseDown(e, modal.id)}
              onClose={() => closeModal(modal.id)}
              onMinimize={() => minimizeModal(modal.id)}
              onMaximize={() => maximizeModal(modal.id)}
              onResizeStart={handleResizeStart}
              isDragging={isDragging && draggedModal === modal.id}
              dragStartTime={dragStartTime}
            />
          ))}
        </div>,
        document.body
      )}
    </ModalContext.Provider>
  );
}

// Medical Modal Content Component
function MedicalModalContent({ modal }: { modal: Modal }) {
  const [newComment, setNewComment] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const handleAddComment = () => {
    if (newComment.trim()) {
      // In a real app, this would save to the backend
      console.log('Adding comment:', newComment);
      setNewComment('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Patient Connection */}
      {modal.patientName && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border">
          <User className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Patient:</span>
          <span className="text-sm text-blue-700">{modal.patientName}</span>
        </div>
      )}

      {/* Action Buttons Row - Active State Design */}
      <div className="flex gap-1">
        <Button 
          variant="default" 
          size="sm" 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <User className="h-3 w-3" />
          <span>Members</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100"
        >
          <Tag className="h-3 w-3" />
          <span>Tags</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100"
        >
          <Calendar className="h-3 w-3" />
          <span>Due Date</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100"
        >
          <Paperclip className="h-3 w-3" />
          <span>Attachments</span>
        </Button>
      </div>

      {/* Members Section */}
      {modal.members && modal.members.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Care Team</span>
          </div>
          <div className="flex items-center gap-2">
            {modal.members.slice(0, 3).map((member) => (
              <div key={member.id} className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {member.name.charAt(0)}
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <Plus className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        </div>
      )}

      {/* Tags Section */}
      {modal.tags && modal.tags.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Medical Tags</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {modal.tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                <span>{tag.name}</span>
                <button className="ml-1 hover:bg-red-200 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <Plus className="h-3 w-3 text-gray-600" />
            </Button>
          </div>
        </div>
      )}

      {/* Due Date Section */}
      {modal.dueDate && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Follow-up Date</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">{modal.dueDate}</span>
            <Button variant="ghost" size="sm" className="p-1">
              <Calendar className="h-3 w-3 text-gray-500" />
            </Button>
            <Button variant="ghost" size="sm" className="p-1">
              <Trash2 className="h-3 w-3 text-gray-500" />
            </Button>
          </div>
        </div>
      )}

      {/* Description Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Clinical Notes</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="p-1">
              <Edit className="h-3 w-3 text-gray-500" />
            </Button>
            <Button variant="ghost" size="sm" className="p-1">
              <Info className="h-3 w-3 text-gray-500" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Write clinical notes..."
            className="w-full p-2 border border-gray-200 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue={modal.description || ''}
          />
        </div>
      </div>

      {/* Attachments Section */}
      {modal.attachments && modal.attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Medical Documents</span>
          </div>
          <div className="space-y-1">
            {modal.attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{attachment.name}</span>
                  <span className="text-xs text-gray-500">({attachment.size})</span>
                </div>
                <Button variant="ghost" size="sm">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Medical Activity</span>
          </div>
          <button 
            className="text-xs text-blue-600 hover:text-blue-800"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>

        {/* Comment Input */}
        <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-md">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
            P
          </div>
          <input
            type="text"
            placeholder="Leave a clinical note..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 text-sm border-none outline-none bg-transparent placeholder-gray-400"
          />
          <Button variant="ghost" size="sm" onClick={handleAddComment} className="p-1">
            <MessageSquare className="h-3 w-3 text-gray-500" />
          </Button>
        </div>

        {/* Activity Log */}
        {modal.activity && modal.activity.length > 0 && (
          <div className="space-y-2">
            {modal.activity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 text-sm text-gray-700">
                <div className="flex-shrink-0 mt-0.5">
                  {activity.action.includes('Due date') && <Calendar className="h-3 w-3 text-gray-500" />}
                  {activity.action.includes('tag') && <Tag className="h-3 w-3 text-gray-500" />}
                  {activity.action.includes('assigned') && <User className="h-3 w-3 text-gray-500" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-700">{activity.action}</div>
                  {activity.details && showDetails && (
                    <div className="text-xs text-gray-500 mt-1">{activity.details}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableModal({ 
  modal, 
  onMouseDown, 
  onClose, 
  onMinimize, 
  onMaximize,
  onResizeStart,
  isDragging,
  dragStartTime
}: { 
  modal: Modal; 
  onMouseDown: (e: React.MouseEvent) => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onResizeStart: (e: React.MouseEvent, modalId: string, handle: string) => void;
  isDragging: boolean;
  dragStartTime: number | null;
}) {
  const Icon = modal.icon;
  
  if (modal.isMinimized) {
    return (
      <div
        className="fixed bg-background border border-border rounded-lg shadow-lg pointer-events-auto cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105"
        style={{
          left: modal.position?.x || 0,
          top: modal.position?.y || 0,
          width: 200,
          height: 45,
          zIndex: modal.zIndex || 1000,
        }}
        onMouseDown={onMouseDown}
        onClick={(e) => {
          // Only toggle if it's a quick click (not a drag)
          const clickTime = Date.now();
          const timeDiff = dragStartTime ? clickTime - dragStartTime : 0;
          
          if (!isDragging && timeDiff < 200) { // 200ms threshold for quick click
            onMinimize();
          }
        }}
      >
        <div className="flex items-center justify-between h-full px-2 py-1">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
            <span className="text-xs font-medium truncate">{modal.title}</span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0" 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { 
                e.stopPropagation(); 
                onMinimize(); 
              }}
            >
              <Minus className="h-2.5 w-2.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0" 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { 
                e.stopPropagation(); 
                onClose(); 
              }}
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>
        {/* Stack indicator */}
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border border-background"></div>
      </div>
    );
  }

  return (
    <div
      className="fixed bg-background border border-border rounded-lg shadow-lg pointer-events-auto"
      style={{
        left: modal.position?.x || 0,
        top: modal.position?.y || 0,
        width: modal.dimensions?.width || 500,
        height: modal.dimensions?.height || 500,
        zIndex: modal.zIndex || 1000,
      }}
    >
      <Card className="h-full flex flex-col">
        <CardHeader 
          className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-move select-none"
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            <CardTitle className="text-sm font-medium">{modal.title}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onMinimize}>
              <Minus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onMaximize}>
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {modal.patientId ? (
            <MedicalModalContent modal={modal} />
          ) : (
            modal.content
          )}
        </CardContent>
      </Card>
      
      {/* Resize Handles */}
      <div 
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-gray-300 hover:bg-gray-400 opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={(e) => onResizeStart(e, modal.id, 'se')}
      />
      <div 
        className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize bg-gray-300 hover:bg-gray-400 opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={(e) => onResizeStart(e, modal.id, 'sw')}
      />
      <div 
        className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize bg-gray-300 hover:bg-gray-400 opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={(e) => onResizeStart(e, modal.id, 'ne')}
      />
      <div 
        className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize bg-gray-300 hover:bg-gray-400 opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={(e) => onResizeStart(e, modal.id, 'nw')}
      />
    </div>
  );
}

export function useProviderModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useProviderModal must be used within a ProviderModalProvider');
  }
  return context;
}

// Event type configuration for provider modals
const eventTypeConfig = {
  visit: { 
    icon: User, 
    label: 'Visit',
    color: 'text-green-600'
  },
  hospitalization: { 
    icon: Activity, 
    label: 'Hospitalization',
    color: 'text-red-600'
  },
  procedure: { 
    icon: Heart, 
    label: 'Procedure',
    color: 'text-orange-600'
  },
  medication: { 
    icon: Pill, 
    label: 'Medication',
    color: 'text-yellow-600'
  },
  lab: { 
    icon: TestTube, 
    label: 'Lab',
    color: 'text-blue-600'
  },
  imaging: { 
    icon: Scan, 
    label: 'Imaging',
    color: 'text-purple-600'
  },
  physician: { 
    icon: User, 
    label: 'Physician',
    color: 'text-indigo-600'
  },
  diagnosis: { 
    icon: FileText, 
    label: 'Diagnosis',
    color: 'text-pink-600'
  }
};

// Hook for opening specific types of modals
export function useProviderPatientModals() {
  const { openModal, closeModal } = useProviderModal();

  const openEventModal = useCallback((event: any) => {
    const eventConfig = eventTypeConfig[event.type as keyof typeof eventTypeConfig] || eventTypeConfig.visit;
    const Icon = eventConfig.icon;
    
    return openModal({
      title: event.title,
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Icon className={`h-5 w-5 ${eventConfig.color}`} />
            <span className={`font-medium ${eventConfig.color}`}>{eventConfig.label}</span>
          </div>
          <div className="space-y-2">
            <div>
              <span className="font-medium text-sm text-muted-foreground">Date & Time:</span>
              <p className="text-sm">{event.date} at {event.time}</p>
            </div>
            {event.provider && (
              <div>
                <span className="font-medium text-sm text-muted-foreground">Provider:</span>
                <p className="text-sm">{event.provider}</p>
              </div>
            )}
            {event.description && (
              <div>
                <span className="font-medium text-sm text-muted-foreground">Description:</span>
                <p className="text-sm">{event.description}</p>
              </div>
            )}
            {event.status && (
              <div>
                <span className="font-medium text-sm text-muted-foreground">Status:</span>
                <p className="text-sm capitalize">{event.status}</p>
              </div>
            )}
            {event.priority && (
              <div>
                <span className="font-medium text-sm text-muted-foreground">Priority:</span>
                <p className="text-sm capitalize">{event.priority}</p>
              </div>
            )}
          </div>
          <div className="pt-4 border-t">
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                View Details
              </Button>
              <Button size="sm" variant="outline">
                Edit Event
              </Button>
              <Button size="sm" variant="outline">
                Add Note
              </Button>
            </div>
          </div>
        </div>
      ),
      size: 'lg',
      icon: Icon,
      eventType: event.type,
      // Enhanced medical data
      patientId: event.patientId || '1',
      patientName: event.patientName || 'John Doe',
      members: [
        { id: '1', name: 'Dr. Emily Rodriguez', role: 'Primary Care Physician' },
        { id: '2', name: 'Dr. Sarah Chen', role: 'Specialist' },
        { id: '3', name: 'Nurse Mike Johnson', role: 'Registered Nurse' }
      ],
      tags: [
        { id: '1', name: 'Follow-up Required', color: 'red' },
        { id: '2', name: 'High Priority', color: 'orange' },
        { id: '3', name: 'Medication Review', color: 'blue' }
      ],
      dueDate: 'March 15, 2024, 2:00 PM',
      description: event.description || 'Comprehensive medical assessment and treatment plan review. Patient shows positive response to current medication regimen.',
      attachments: [
        { id: '1', name: 'Lab Results - CBC.pdf', type: 'PDF', size: '2.3 MB' },
        { id: '2', name: 'X-Ray - Chest.jpg', type: 'Image', size: '1.8 MB' },
        { id: '3', name: 'Prescription - Medication.pdf', type: 'PDF', size: '0.5 MB' }
      ],
      comments: [
        { id: '1', author: 'Dr. Emily Rodriguez', content: 'Patient responding well to treatment. Continue current medication.', timestamp: '2 hours ago' },
        { id: '2', author: 'Nurse Mike Johnson', content: 'Vital signs stable. Patient comfortable.', timestamp: '1 hour ago' }
      ],
      activity: [
        { id: '1', action: 'You have scheduled a follow-up appointment for March 15, 2024', timestamp: '2 hours ago', user: 'Dr. Emily Rodriguez', details: 'Follow-up scheduled in Cardiology department' },
        { id: '2', action: 'You have added the tag Follow-up Required to this medical record', timestamp: '1 hour ago', user: 'Dr. Sarah Chen', details: 'Tagged for priority follow-up' },
        { id: '3', action: 'You have assigned Dr. Emily Rodriguez to this case', timestamp: '30 minutes ago', user: 'System', details: 'Primary care physician assigned' }
      ]
    });
  }, [openModal]);

  const openMessageModal = useCallback((message: any) => {
    return openModal({
      title: message.subject,
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-600">Message</span>
          </div>
          <div className="space-y-2">
            <div>
              <span className="font-medium text-sm text-muted-foreground">From:</span>
              <p className="text-sm">{message.from}</p>
            </div>
            <div>
              <span className="font-medium text-sm text-muted-foreground">To:</span>
              <p className="text-sm">{message.to}</p>
            </div>
            <div>
              <span className="font-medium text-sm text-muted-foreground">Subject:</span>
              <p className="text-sm">{message.subject}</p>
            </div>
            <div>
              <span className="font-medium text-sm text-muted-foreground">Content:</span>
              <p className="text-sm">{message.content}</p>
            </div>
            <div>
              <span className="font-medium text-sm text-muted-foreground">Timestamp:</span>
              <p className="text-sm">{message.timestamp}</p>
            </div>
            <div>
              <span className="font-medium text-sm text-muted-foreground">Priority:</span>
              <p className="text-sm capitalize">{message.priority}</p>
            </div>
            <div>
              <span className="font-medium text-sm text-muted-foreground">Status:</span>
              <p className="text-sm">{message.isRead ? 'Read' : 'Unread'}</p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Reply
              </Button>
              <Button size="sm" variant="outline">
                Forward
              </Button>
              <Button size="sm" variant="outline">
                Mark as Read
              </Button>
            </div>
          </div>
        </div>
      ),
      size: 'lg',
      icon: MessageSquare,
      // Enhanced message data
      patientId: message.patientId || '1',
      patientName: message.patientName || 'John Doe',
      members: [
        { id: '1', name: message.from, role: 'Healthcare Provider' },
        { id: '2', name: message.to, role: 'Patient' }
      ],
      tags: [
        { id: '1', name: message.priority === 'high' ? 'High Priority' : message.priority === 'medium' ? 'Medium Priority' : 'Low Priority', color: message.priority === 'high' ? 'red' : message.priority === 'medium' ? 'yellow' : 'green' },
        { id: '2', name: message.type === 'incoming' ? 'Incoming' : 'Outgoing', color: message.type === 'incoming' ? 'blue' : 'green' }
      ],
      dueDate: message.timestamp,
      description: message.content,
      attachments: [],
      comments: [],
      activity: [
        { id: '1', action: `Message ${message.type === 'incoming' ? 'received from' : 'sent to'} ${message.type === 'incoming' ? message.from : message.to}`, timestamp: message.timestamp, user: message.type === 'incoming' ? message.from : message.to, details: message.subject }
      ]
    });
  }, [openModal]);

  const openAppointmentModal = useCallback((appointment: any) => {
    return openModal({
      title: appointment.title,
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-600">Appointment</span>
          </div>
          <div className="space-y-2">
            <div>
              <span className="font-medium text-sm text-muted-foreground">Provider:</span>
              <p className="text-sm">{appointment.provider}</p>
            </div>
            <div>
              <span className="font-medium text-sm text-muted-foreground">Date & Time:</span>
              <p className="text-sm">{appointment.date} at {appointment.time}</p>
            </div>
            {appointment.location && (
              <div>
                <span className="font-medium text-sm text-muted-foreground">Location:</span>
                <p className="text-sm">{appointment.location}</p>
              </div>
            )}
            {appointment.duration && (
              <div>
                <span className="font-medium text-sm text-muted-foreground">Duration:</span>
                <p className="text-sm">{appointment.duration}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-sm text-muted-foreground">Status:</span>
              <p className="text-sm capitalize">{appointment.status}</p>
            </div>
            <div>
              <span className="font-medium text-sm text-muted-foreground">Priority:</span>
              <p className="text-sm capitalize">{appointment.priority}</p>
            </div>
            {appointment.notes && (
              <div>
                <span className="font-medium text-sm text-muted-foreground">Notes:</span>
                <p className="text-sm">{appointment.notes}</p>
              </div>
            )}
          </div>
          <div className="pt-4 border-t">
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Reschedule
              </Button>
              <Button size="sm" variant="outline">
                Cancel
              </Button>
              <Button size="sm" variant="outline">
                Add Notes
              </Button>
            </div>
          </div>
        </div>
      ),
      size: 'lg',
      icon: Calendar,
      // Enhanced appointment data
      patientId: appointment.patientId || '1',
      patientName: appointment.patientName || 'John Doe',
      members: [
        { id: '1', name: appointment.provider, role: 'Healthcare Provider' },
        { id: '2', name: 'Patient', role: 'Patient' }
      ],
      tags: [
        { id: '1', name: appointment.priority === 'high' ? 'High Priority' : appointment.priority === 'medium' ? 'Medium Priority' : 'Low Priority', color: appointment.priority === 'high' ? 'red' : appointment.priority === 'medium' ? 'yellow' : 'green' },
        { id: '2', name: appointment.status === 'confirmed' ? 'Confirmed' : appointment.status === 'pending' ? 'Pending' : appointment.status === 'completed' ? 'Completed' : 'Scheduled', color: appointment.status === 'confirmed' ? 'green' : appointment.status === 'pending' ? 'yellow' : appointment.status === 'completed' ? 'gray' : 'blue' }
      ],
      dueDate: appointment.date + ' ' + appointment.time,
      description: appointment.notes || appointment.title,
      attachments: [],
      comments: [],
      activity: [
        { id: '1', action: `Appointment ${appointment.status} with ${appointment.provider}`, timestamp: appointment.date + ' ' + appointment.time, user: appointment.provider, details: appointment.title }
      ]
    });
  }, [openModal]);

  const openCreateMessageModal = useCallback(() => {
    return openModal({
      title: 'Create New Message',
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-600">New Message</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                To
              </label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
                placeholder="Select recipient..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Subject
              </label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
                placeholder="Enter message subject..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Priority
              </label>
              <select className="w-full px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Message
              </label>
              <textarea 
                rows={6}
                className="w-full px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
                placeholder="Type your message here..."
              />
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Save Draft
              </Button>
              <Button size="sm" className="bg-interactive-primary hover:bg-interactive-primary-hover text-white">
                Send Message
              </Button>
            </div>
          </div>
        </div>
      ),
      size: 'lg',
      icon: Mail,
      // Enhanced message creation data
      patientId: '1',
      patientName: 'John Doe',
      members: [
        { id: '1', name: 'Dr. Sarah Johnson', role: 'Healthcare Provider' },
        { id: '2', name: 'Patient', role: 'Patient' }
      ],
      tags: [
        { id: '1', name: 'New Message', color: 'blue' }
      ],
      dueDate: new Date().toISOString(),
      description: 'Creating a new message',
      attachments: [],
      comments: [],
      activity: [
        { id: '1', action: 'Message creation initiated', timestamp: new Date().toISOString(), user: 'Dr. Sarah Johnson', details: 'New message' }
      ]
    });
  }, [openModal]);

  const openCreateAppointmentModal = useCallback(() => {
    return openModal({
      title: 'Schedule New Appointment',
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-600">New Appointment</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Appointment Type
              </label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
                placeholder="e.g., Annual Physical, Follow-up, Consultation..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Date
                </label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Time
                </label>
                <input 
                  type="time" 
                  className="w-full px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Provider
              </label>
              <select className="w-full px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus">
                <option value="">Select provider...</option>
                <option value="dr-sarah-johnson">Dr. Sarah Johnson</option>
                <option value="dr-michael-chen">Dr. Michael Chen</option>
                <option value="dr-lisa-wang">Dr. Lisa Wang</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Location
              </label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
                placeholder="e.g., Main Clinic - Room 201"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Duration
                </label>
                <select className="w-full px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Priority
                </label>
                <select className="w-full px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus">
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Notes
              </label>
              <textarea 
                rows={4}
                className="w-full px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
                placeholder="Additional notes or special requirements..."
              />
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Save Draft
              </Button>
              <Button size="sm" variant="outline">
                Check Availability
              </Button>
              <Button size="sm" className="bg-interactive-primary hover:bg-interactive-primary-hover text-white">
                Schedule Appointment
              </Button>
            </div>
          </div>
        </div>
      ),
      size: 'lg',
      icon: Calendar,
      // Enhanced appointment creation data
      patientId: '1',
      patientName: 'John Doe',
      members: [
        { id: '1', name: 'Dr. Sarah Johnson', role: 'Healthcare Provider' },
        { id: '2', name: 'Patient', role: 'Patient' }
      ],
      tags: [
        { id: '1', name: 'New Appointment', color: 'blue' }
      ],
      dueDate: new Date().toISOString(),
      description: 'Scheduling a new appointment',
      attachments: [],
      comments: [],
      activity: [
        { id: '1', action: 'Appointment scheduling initiated', timestamp: new Date().toISOString(), user: 'Dr. Sarah Johnson', details: 'New appointment' }
      ]
    });
  }, [openModal]);

  return {
    openEventModal,
    openMessageModal,
    openAppointmentModal,
    openCreateMessageModal,
    openCreateAppointmentModal,
    closeModal
  };
}

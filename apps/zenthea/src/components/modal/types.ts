import { ReactNode } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ModalStatus = 'open' | 'completed' | 'archived';
export type TaskType = 'soap-note' | 'prescription' | 'lab-result' | 'vital-signs' | 'message' | 'appointment' | 'imaging' | 'procedure' | 'other';

export interface ModalPosition {
  x: number;
  y: number;
}

export interface ModalDimensions {
  width: number;
  height: number;
}

export interface ModalStack {
  id: string;
  name: string;
  modals: string[];
  groupBy: 'created' | 'type' | 'provider' | 'priority';
  position: ModalPosition;
}

export interface Modal {
  id: string;
  title: string;
  content: ReactNode;
  size?: ModalSize;
  position?: ModalPosition;
  dimensions?: ModalDimensions;
  isMinimized?: boolean;
  isMaximized?: boolean;
  zIndex?: number;
  icon?: React.ComponentType<any>;
  
  // Task-related fields
  taskType?: TaskType;
  status?: ModalStatus;
  dueDate?: string;
  priority?: ModalPriority;
  assignedProviderId?: string;
  
  // Medical record fields
  patientId?: string;
  patientName?: string;
  recordId?: string;
  
  // Message fields
  messageId?: string;
  threadId?: string;
  
  // UI state
  isDragging?: boolean;
  isResizing?: boolean;
  resizeHandle?: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's';
  originalDimensions?: ModalDimensions;
  
  // Stack management
  stackId?: string;
  
  // Analytics
  openedAt?: number;
  lastAccessedAt?: number;
  accessCount?: number;
}

export interface ModalContextType {
  modals: Modal[];
  stacks: ModalStack[];
  activeModalId?: string;
  
  // Core actions
  openModal: (modal: Omit<Modal, 'id' | 'zIndex'>) => string;
  closeModal: (id: string) => void;
  updateModal: (id: string, updates: Partial<Modal>) => void;
  
  // Modal management
  minimizeModal: (id: string) => void;
  maximizeModal: (id: string) => void;
  bringToFront: (id: string) => void;
  
  // Stack management
  createStack: (name: string, groupBy: ModalStack['groupBy']) => string;
  addToStack: (modalId: string, stackId: string) => void;
  removeFromStack: (modalId: string) => void;
  organizeModals: () => void;
  
  // Global controls
  minimizeAll: () => void;
  closeAll: () => void;
  
  // Task conversion
  convertToTask: (modalId: string, taskData: Partial<Modal>) => void;
  markTaskComplete: (modalId: string) => void;
}

export interface ModalTemplate {
  id: string;
  name: string;
  type: TaskType;
  component: React.ComponentType<any>;
  defaultSize: ModalSize;
  defaultDimensions: ModalDimensions;
  icon: React.ComponentType<any>;
}

export interface ModalAnalytics {
  modalId: string;
  openTime: number;
  closeTime?: number;
  duration?: number;
  accessCount: number;
  lastAccessed: number;
  performance: {
    renderTime: number;
    dragFPS: number;
    resizeFPS: number;
  };
}

export interface TouchGesture {
  type: 'swipe' | 'pinch' | 'longpress' | 'doubletap';
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  duration?: number;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: string;
  description: string;
}

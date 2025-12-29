'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Minimize2, Maximize2, Move, RotateCcw } from 'lucide-react';
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
      const modalWidth = modal.dimensions?.width || 400;
      const modalHeight = modal.dimensions?.height || 300;
      
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

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = useState<Modal[]>([]);
  const [nextZIndex, setNextZIndex] = useState(1000);

  const openModal = useCallback((modalData: Omit<Modal, 'id' | 'zIndex'>) => {
    const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get default dimensions based on size
    const sizeDimensions = {
      sm: { width: 384, height: 256 },
      md: { width: 512, height: 384 },
      lg: { width: 640, height: 512 },
      xl: { width: 768, height: 640 },
      full: { width: window.innerWidth * 0.95, height: window.innerHeight * 0.95 }
    };
    
    const dimensions = modalData.dimensions || sizeDimensions[modalData.size || 'md'];
    
    // Find available position
    const position = modalData.position || findAvailablePosition(modals, dimensions.width, dimensions.height);
    
    const newModal: Modal = {
      ...modalData,
      id,
      zIndex: nextZIndex,
      position,
      dimensions,
      isMinimized: false,
    };
    
    setModals(prev => [...prev, newModal]);
    setNextZIndex(prev => prev + 1);
    return id;
  }, [nextZIndex, modals]);

  const closeModal = useCallback((id: string) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  }, []);

  const minimizeModal = useCallback((id: string) => {
    setModals(prev => prev.map(modal => 
      modal.id === id ? { ...modal, isMinimized: true } : modal
    ));
  }, []);

  const maximizeModal = useCallback((id: string) => {
    setModals(prev => prev.map(modal => 
      modal.id === id ? { ...modal, isMinimized: false, zIndex: nextZIndex } : modal
    ));
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex]);

  const updateModal = useCallback((id: string, updates: Partial<Modal>) => {
    setModals(prev => prev.map(modal => 
      modal.id === id ? { ...modal, ...updates } : modal
    ));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setModals(prev => prev.map(modal => 
      modal.id === id ? { ...modal, zIndex: nextZIndex } : modal
    ));
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex]);

  return (
    <ModalContext.Provider value={{
      modals,
      openModal,
      closeModal,
      minimizeModal,
      maximizeModal,
      updateModal,
      bringToFront,
    }}>
      {children}
      <ModalRenderer />
    </ModalContext.Provider>
  );
}

function ModalRenderer() {
  const { modals, closeModal, minimizeModal, maximizeModal } = useModal();

  if (typeof window === 'undefined') return null;

  const minimizedModals = modals.filter(m => m.isMinimized);
  const hasMinimizedModals = minimizedModals.length > 0;

  return createPortal(
    <>
      {/* Taskbar background for minimized modals */}
      {hasMinimizedModals && (
        <div 
          className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t border-border z-[999]"
          style={{ 
            // Extend height if there are multiple rows
            height: minimizedModals.length > Math.floor(window.innerWidth / 210) ? '100px' : '50px'
          }}
        />
      )}
      
      {modals.map((modal) => (
        <ModalWindow
          key={modal.id}
          modal={modal}
          onClose={() => closeModal(modal.id)}
          onMinimize={() => minimizeModal(modal.id)}
          onMaximize={() => maximizeModal(modal.id)}
        />
      ))}
    </>,
    document.body
  );
}

interface ModalWindowProps {
  modal: Modal;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}

function ModalWindow({ modal, onClose, onMinimize, onMaximize }: ModalWindowProps) {
  const { updateModal, bringToFront, modals } = useModal();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [position, setPosition] = useState(modal.position || { x: 100, y: 100 });
  const [dimensions, setDimensions] = useState(modal.dimensions || { width: 400, height: 300 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Update position and dimensions when modal props change
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
      
      // Keep modal within viewport bounds
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
    // Calculate position along the bottom of the screen
    const minimizedModals = modals.filter(m => m.isMinimized);
    const currentIndex = minimizedModals.findIndex(m => m.id === modal.id);
    const taskbarHeight = 50;
    const taskbarY = window.innerHeight - taskbarHeight;
    const modalWidth = 200;
    const modalMargin = 10;
    const totalWidth = modalWidth + modalMargin;
    
    // Calculate position, wrapping to next row if needed
    const maxModalsPerRow = Math.floor(window.innerWidth / totalWidth);
    const row = Math.floor(currentIndex / maxModalsPerRow);
    const col = currentIndex % maxModalsPerRow;
    const taskbarX = col * totalWidth + modalMargin;
    const taskbarYAdjusted = taskbarY - (row * (40 + 10)); // 40px height + 10px margin
    
    return (
      <div
        ref={modalRef}
        className="fixed bg-background border border-border rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105"
        style={{
          left: taskbarX,
          top: taskbarYAdjusted,
          zIndex: modal.zIndex,
          width: '200px',
          height: '40px',
        }}
        onMouseDown={handleMouseDown}
        onClick={onMaximize}
      >
        <div className="flex items-center justify-between p-2 h-full">
          <div className="flex items-center gap-2">
            {modal.icon && (
              <modal.icon className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium truncate">{modal.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onMaximize();
              }}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={modalRef}
      className="fixed bg-background border border-border rounded-lg shadow-lg hover:shadow-xl transition-shadow"
      style={{
        left: position.x,
        top: position.y,
        width: dimensions.width,
        height: dimensions.height,
        zIndex: modal.zIndex,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header with drag handle */}
      <div 
        className="flex items-center justify-between p-3 border-b border-border cursor-move bg-muted/20"
        data-drag-handle
      >
        <div className="flex items-center gap-2">
          {modal.icon && (
            <modal.icon className="h-5 w-5 text-muted-foreground" />
          )}
          <h3 className="font-semibold text-sm truncate">{modal.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onMinimize}
            title="Minimize"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onClose}
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
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

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

// Import icons for timeline events
import { 
  User, 
  Activity, 
  Heart, 
  Pill, 
  TestTube, 
  Scan, 
  FileText 
} from 'lucide-react';

// Event type configuration matching the timeline
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
export function usePatientProfileModals() {
  const { openModal, closeModal } = useModal();

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
        </div>
      ),
      size: 'md',
      icon: Icon,
      eventType: event.type,
    });
  }, [openModal]);

  const openDiagnosisModal = useCallback((diagnosisId: string) => {
    // Mock diagnosis data - in real app this would come from API
    const diagnosisData = {
      'rotator-cuff-1': {
        name: 'Rotator cuff injury',
        icdCode: 'ICD-10-CM R03',
        visits: 44,
        complaint: 'Disturb sleep, arm weakness',
        latestUpdate: '2024-01-22',
        status: 'active',
        severity: 'moderate',
        treatment: 'Physical therapy, NSAIDs, rest',
        followUp: '6 weeks',
        provider: 'Dr. Sarah Johnson, Orthopedics'
      },
      'knee-injury-1': {
        name: 'Knee ligament strain',
        icdCode: 'ICD-10-CM S83.4',
        visits: 12,
        complaint: 'Pain during movement, swelling',
        latestUpdate: '2024-01-15',
        status: 'healing',
        severity: 'mild',
        treatment: 'RICE protocol, physical therapy',
        followUp: '4 weeks',
        provider: 'Dr. Michael Chen, Sports Medicine'
      }
    };

    const diagnosis = diagnosisData[diagnosisId as keyof typeof diagnosisData] || {
      name: 'Unknown Diagnosis',
      icdCode: 'N/A',
      visits: 0,
      complaint: 'No information available',
      latestUpdate: 'N/A',
      status: 'unknown',
      severity: 'unknown',
      treatment: 'No treatment information',
      followUp: 'N/A',
      provider: 'Unknown'
    };

    return openModal({
      title: diagnosis.name,
      content: (
        <div className="space-y-6">
          {/* Header with ICD code and visit count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500 text-white">
                {diagnosis.visits} Visits
              </Badge>
              <span className="text-sm font-medium text-gray-600">
                {diagnosis.icdCode}
              </span>
            </div>
            <Badge variant={diagnosis.status === 'active' ? 'default' : 'secondary'}>
              {diagnosis.status}
            </Badge>
          </div>

          {/* Complaint and Details */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-1">Complaint</h4>
              <p className="text-sm">{diagnosis.complaint}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-1">Treatment</h4>
              <p className="text-sm">{diagnosis.treatment}</p>
            </div>

            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-1">Follow Up</h4>
              <p className="text-sm">{diagnosis.followUp}</p>
            </div>

            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-1">Provider</h4>
              <p className="text-sm">{diagnosis.provider}</p>
            </div>

            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-1">Latest Update</h4>
              <p className="text-sm">{diagnosis.latestUpdate}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button className="flex-1 bg-green-600 hover:bg-green-700">
              View Notes
            </Button>
            <Button variant="outline" className="flex-1">
              View Timeline
            </Button>
          </div>
        </div>
      ),
      size: 'lg',
      icon: FileText,
      eventType: 'diagnosis',
    });
  }, [openModal]);

  const openLabResultModal = useCallback((labId: string) => {
    return openModal({
      title: 'Lab Result Details',
      content: (
        <div className="space-y-4">
          <p>Lab result details for ID: {labId}</p>
          <p>This would contain detailed lab results, trends, reference ranges, etc.</p>
        </div>
      ),
      size: 'lg',
      icon: TestTube,
      eventType: 'lab',
    });
  }, [openModal]);

  const openMedicationModal = useCallback((medicationId: string) => {
    return openModal({
      title: 'Medication Details',
      content: (
        <div className="space-y-4">
          <p>Medication details for ID: {medicationId}</p>
          <p>This would contain medication information, dosage, side effects, etc.</p>
        </div>
      ),
      size: 'md',
      icon: Pill,
      eventType: 'medication',
    });
  }, [openModal]);

  const openImagingModal = useCallback((imagingId: string) => {
    return openModal({
      title: 'Imaging Study Details',
      content: (
        <div className="space-y-4">
          <p>Imaging study details for ID: {imagingId}</p>
          <p>This would contain imaging results, reports, images, etc.</p>
        </div>
      ),
      size: 'xl',
      icon: Scan,
      eventType: 'imaging',
    });
  }, [openModal]);

  return {
    openEventModal,
    openDiagnosisModal,
    openLabResultModal,
    openMedicationModal,
    openImagingModal,
    closeModal,
  };
}

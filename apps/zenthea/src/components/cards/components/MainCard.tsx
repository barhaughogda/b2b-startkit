import React, { useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { CardEventHandlers, Priority, TaskStatus, CardType, AssignmentType, CardDimensions, CardPosition } from '../types';
import { CardHeaderComponent, CardControls, CardDropdowns, ResizeHandles } from './index';

interface MainCardProps {
  id: string;
  type: CardType;
  title: string;
  priority: Priority;
  status: TaskStatus;
  assignedTo?: string;
  assignmentType?: AssignmentType;
  patientId: string;
  patientName: string;
  patientDateOfBirth?: string;
  dueDate?: string;
  isMinimized: boolean;
  isMaximized: boolean;
  dimensions: CardDimensions;
  position: CardPosition;
  zIndex: number;
  activeTab?: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity';
  onTabChange?: (tab: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity') => void;
  tabNames?: {
    info?: string;
    members?: string;
    tags?: string;
    dueDate?: string;
    attachments?: string;
    notes?: string;
    activity?: string;
  };
  handlers: CardEventHandlers;
  className?: string;
  children: React.ReactNode;
  // Event handlers
  handleMouseDown: (e: React.MouseEvent) => void;
  handleResizeStart: (e: React.MouseEvent, direction: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => void;
  handleMinimize: (e: React.MouseEvent) => void;
  handleMaximize: (e: React.MouseEvent) => void;
  handleClose: (e: React.MouseEvent) => void;
  handleDoubleClick: (e: React.MouseEvent) => void;
  handleCardClick: (e: React.MouseEvent) => void;
  handleScroll: (e: React.UIEvent) => void;
  handleWheel: (e: React.WheelEvent) => void;
  // Dropdown state
  priorityRef: React.RefObject<HTMLDivElement>;
  statusRef: React.RefObject<HTMLDivElement>;
  isPriorityDropdownOpen: boolean;
  isStatusDropdownOpen: boolean;
  getPriorityDropdownPosition: () => { top: number; left: number };
  getStatusDropdownPosition: () => { top: number; left: number };
  togglePriorityDropdown: () => void;
  toggleStatusDropdown: () => void;
  handlePriorityChange: (priority: Priority) => void;
  handleStatusChange: (status: TaskStatus) => void;
}

export function MainCard({
  id,
  type,
  title,
  priority,
  status,
  assignedTo,
  assignmentType,
  patientId,
  patientName,
  patientDateOfBirth,
  dueDate,
  isMinimized,
  isMaximized,
  dimensions,
  position,
  zIndex,
  activeTab,
  onTabChange,
  tabNames,
  handlers,
  className,
  children,
  handleMouseDown,
  handleResizeStart,
  handleMinimize,
  handleMaximize,
  handleClose,
  handleDoubleClick,
  handleCardClick,
  handleScroll,
  handleWheel,
  priorityRef,
  statusRef,
  isPriorityDropdownOpen,
  isStatusDropdownOpen,
  getPriorityDropdownPosition,
  getStatusDropdownPosition,
  togglePriorityDropdown,
  toggleStatusDropdown,
  handlePriorityChange,
  handleStatusChange
}: MainCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const isPatient = session?.user?.role === 'patient';

  // Note: Removed native mousedown listener to prevent duplicate handler invocations.
  // React's synthetic event system (via CardHeaderComponent's onMouseDown) handles
  // drag initiation correctly. The native listener was causing handleMouseDown to be
  // called twice: once from the native listener and once from React's synthetic handler.

  // Render header with integrated tab navigation
  const renderHeader = () => {
    return (
      <CardHeaderComponent
        id={id}
        type={type}
        title={title}
        patientName={patientName}
        patientId={patientId}
        patientDateOfBirth={patientDateOfBirth}
        assignedTo={assignedTo}
        activeTab={activeTab || 'info'}
        onTabChange={onTabChange}
        tabNames={tabNames}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        isPatient={isPatient}
      >
        {/* Window Controls */}
        <CardControls
          isMinimized={isMinimized}
          isMaximized={isMaximized}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          onClose={handleClose}
        />

        {/* Priority/Status Controls - Hidden for patients */}
        {!isPatient && (
          <div className="absolute top-12 right-2 flex items-center gap-2 z-50">
            <CardDropdowns
              priority={priority}
              status={status}
              priorityRef={priorityRef}
              statusRef={statusRef}
              isPriorityDropdownOpen={() => isPriorityDropdownOpen}
              isStatusDropdownOpen={() => isStatusDropdownOpen}
              getPriorityDropdownPosition={() => {
                const pos = getPriorityDropdownPosition();
                return { x: pos.left, y: pos.top };
              }}
              getStatusDropdownPosition={() => {
                const pos = getStatusDropdownPosition();
                return { x: pos.left, y: pos.top };
              }}
              togglePriorityDropdown={togglePriorityDropdown}
              toggleStatusDropdown={toggleStatusDropdown}
              handlePriorityChange={handlePriorityChange}
              handleStatusChange={handleStatusChange}
            />
          </div>
        )}
      </CardHeaderComponent>
    );
  };

  return (
    <div
      ref={cardRef}
      data-testid="card-system-card"
      className={cn(
        "card-system-card fixed bg-background border border-border rounded-lg shadow-lg pointer-events-auto cursor-move select-none",
        isMaximized && "inset-4",
        className
      )}
      data-z-index={zIndex}
      draggable={false}
      style={isMaximized ? {} : {
        position: 'fixed',
        left: `${position.x}px`, // Allow free horizontal positioning
        top: `${position.y}px`, // Allow free vertical positioning
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        maxWidth: `${dimensions.width}px`,
        maxHeight: `${dimensions.height}px`,
        overflow: 'hidden', // Prevent content overflow
        zIndex: zIndex,
        userSelect: 'none', // Prevent text selection during drag
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
      onClick={handleCardClick}
      onScroll={handleScroll}
      onWheel={handleWheel}
      onDragStart={(e) => {
        // Prevent default HTML5 drag behavior
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
    >
      <Card className="h-full w-full flex flex-col overflow-hidden">
        {renderHeader()}
        <CardContent 
          className="flex-1 overflow-y-auto overflow-x-hidden min-w-0"
          onMouseDown={(e) => {
            // Stop propagation for interactive elements to prevent drag
            const target = e.target as HTMLElement;
            const isInteractive = target.closest('button, input, select, textarea, a, [role="button"], [tabindex], [data-no-drag]');
            const isResizeHandle = target.closest('[data-resize-handle="true"]');
            if (isInteractive || isResizeHandle) {
              e.stopPropagation();
            }
            // For non-interactive elements, let the event bubble to the parent drag handler
          }}
          onScroll={handleScroll}
          onWheel={handleWheel}
          style={{ 
            height: `calc(${dimensions.height}px - 60px)`, // Subtract header height
            maxHeight: type === 'message' ? 'calc(100vh - 10px)' : `calc(${dimensions.height}px - 60px)`, // Respect card height
            minHeight: '200px', // Ensure minimum height for scrolling
            maxWidth: `${dimensions.width}px`, // Constrain width to prevent overflow
            width: '100%' // Fill available width
          }}
        >
          {children}
        </CardContent>
      </Card>
      
      <ResizeHandles 
        isMinimized={isMinimized}
        onResizeStart={handleResizeStart}
      />
    </div>
  );
}

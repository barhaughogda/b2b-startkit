'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BaseCardProps, 
  CardEventHandlers, 
  AssignmentType 
} from './types';
import { 
  cardTypeConfig, 
  priorityConfig, 
  statusConfig, 
  priorityDropdownConfig, 
  statusDropdownConfig,
  type CardType,
  type Priority,
  type TaskStatus
} from './config';
import { 
  useCardDrag, 
  useCardResize, 
  useCardDropdowns, 
  useCardTabs,
  useCardEventHandlers,
  type DragConstraints,
  type ResizeConstraints,
  MIN_CARD_Y_POSITION,
  MAX_CARD_Y_POSITION,
  MIN_CARD_X_POSITION,
  MAX_CARD_X_POSITION
} from './utils';
import { 
  MinimizedCard,
  MainCard
} from './components';


// Error boundary component for card system
class CardErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Card system error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Card Error</span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            Something went wrong with this card. Please try refreshing the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}





interface BaseCardComponentProps extends BaseCardProps {
  handlers: CardEventHandlers;
  className?: string;
  children: React.ReactNode;
}

// Base Card Component as a functional component
export function BaseCardComponent({ 
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
  children
}: BaseCardComponentProps) {
  // Initialize utility classes
  const dragConstraints: DragConstraints = {
    minX: 0,
    maxX: MAX_CARD_X_POSITION() - dimensions.width,
    minY: MIN_CARD_Y_POSITION,
    maxY: MAX_CARD_Y_POSITION() - dimensions.height
  };

  const resizeConstraints: ResizeConstraints = {
    minWidth: 300,
    maxWidth: 1200,
    minHeight: 200,
    maxHeight: 800
  };

  const { dragState, dragHandler } = useCardDrag(position, handlers, dragConstraints, id);
  const { resizeState, resizeHandler } = useCardResize(dimensions, handlers, resizeConstraints, id);
  const { dropdownState, dropdownManager, priorityRef, statusRef } = useCardDropdowns(handlers, id);
  const { tabState, tabManager } = useCardTabs(activeTab, onTabChange);
  const { data: session } = useZentheaSession();
  const isPatient = session?.user?.role === 'patient';

  // Redirect patients away from restricted tabs (tags, dueDate, notes)
  // Use ref to prevent multiple redirects and optimize dependencies
  const restrictedTabs = ['tags', 'dueDate', 'notes'] as const;
  useEffect(() => {
    if (!isPatient) return;
    
    if (restrictedTabs.includes(tabState.activeTab as typeof restrictedTabs[number])) {
      const targetTab = 'info';
      tabManager.handleTabChange(targetTab);
      handlers.onTabChange?.(id, targetTab);
      onTabChange?.(targetTab);
    }
    // Only depend on isPatient and activeTab to prevent infinite loops
    // tabManager, handlers, and callbacks are stable references from hooks/props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPatient, tabState.activeTab]);

  // Event handlers using the new hook
  const {
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
  } = useCardEventHandlers({
    id,
    isMinimized,
    isMaximized,
    handlers,
    dragHandler,
    resizeHandler
  });

  // Cleanup utility classes on unmount
  useEffect(() => {
    return () => {
      // Note: dragHandler cleanup is handled by useCardDrag's useEffect cleanup
      // No need to call dragHandler.cleanup() here
      resizeHandler.cleanup();
      dropdownManager.cleanup();
    };
  }, [dragHandler, resizeHandler, dropdownManager]);

  // Note: Document scroll prevention is now handled by CardSystemProvider
  // This ensures proper scroll behavior for both background and card content



  // Main render
  if (isMinimized) {
    return (
      <MinimizedCard
        id={id}
        type={type}
        title={title}
        patientName={patientName}
        dueDate={dueDate}
        position={position}
        zIndex={zIndex}
        className={className}
        onExpand={handlers.onExpand || (() => {})}
        onClose={handlers.onClose || (() => {})}
      />
    );
  }


  return (
    <MainCard
      id={id}
      type={type}
      title={title}
      priority={priority}
      status={status}
      assignedTo={assignedTo}
      assignmentType={assignmentType}
      patientId={patientId}
      patientName={patientName}
      patientDateOfBirth={patientDateOfBirth}
      dueDate={dueDate}
      isMinimized={isMinimized}
      isMaximized={isMaximized}
      dimensions={dimensions}
      position={position}
      zIndex={zIndex}
      activeTab={tabState.activeTab}
      onTabChange={(tab) => {
        tabManager.handleTabChange(tab);
        handlers.onTabChange?.(id, tab);
        onTabChange?.(tab);
      }}
      tabNames={tabNames}
      handlers={handlers}
      className={className}
      handleMouseDown={handleMouseDown}
      handleResizeStart={handleResizeStart}
      handleMinimize={handleMinimize}
      handleMaximize={handleMaximize}
      handleClose={handleClose}
      handleDoubleClick={handleDoubleClick}
      handleCardClick={handleCardClick}
      handleScroll={handleScroll}
      handleWheel={handleWheel}
      priorityRef={priorityRef}
      statusRef={statusRef}
      isPriorityDropdownOpen={dropdownManager.isPriorityDropdownOpen()}
      isStatusDropdownOpen={dropdownManager.isStatusDropdownOpen()}
      getPriorityDropdownPosition={() => {
        const pos = dropdownManager.getPriorityDropdownPosition();
        return pos ? { top: pos.y, left: pos.x } : { top: 0, left: 0 };
      }}
      getStatusDropdownPosition={() => {
        const pos = dropdownManager.getStatusDropdownPosition();
        return pos ? { top: pos.y, left: pos.x } : { top: 0, left: 0 };
      }}
      togglePriorityDropdown={dropdownManager.togglePriorityDropdown}
      toggleStatusDropdown={dropdownManager.toggleStatusDropdown}
      handlePriorityChange={dropdownManager.handlePriorityChange}
      handleStatusChange={dropdownManager.handleStatusChange}
    >
      {children}
    </MainCard>
  );
}

// Wrapped BaseCardComponent with error boundary
export function BaseCard(props: BaseCardProps & { children: React.ReactNode; handlers: CardEventHandlers }) {
  return (
    <CardErrorBoundary>
      <BaseCardComponent {...props} />
    </CardErrorBoundary>
  );
}
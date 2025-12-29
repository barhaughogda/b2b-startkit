'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { 
  priorityDropdownConfig, 
  statusDropdownConfig,
  type Priority,
  type TaskStatus
} from '../config';

interface CardDropdownsProps {
  priority: Priority;
  status: TaskStatus;
  priorityRef: React.RefObject<HTMLDivElement>;
  statusRef: React.RefObject<HTMLDivElement>;
  isPriorityDropdownOpen: () => boolean;
  isStatusDropdownOpen: () => boolean;
  getPriorityDropdownPosition: () => { x: number; y: number } | null;
  getStatusDropdownPosition: () => { x: number; y: number } | null;
  togglePriorityDropdown: () => void;
  toggleStatusDropdown: () => void;
  handlePriorityChange: (priority: Priority) => void;
  handleStatusChange: (status: TaskStatus) => void;
}

export function CardDropdowns({
  priority,
  status,
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
}: CardDropdownsProps) {
  const priorityInfo = priorityDropdownConfig[priority] || priorityDropdownConfig.medium;
  const statusInfo = statusDropdownConfig[status] || statusDropdownConfig.new;

  return (
    <>
      <div className="flex items-center justify-end gap-4">
        {/* Priority Dropdown */}
        <div ref={priorityRef} className="relative">
          <Button 
            variant="outline" 
            size="sm" 
            className={`flex items-center gap-2 ${priorityInfo.color} border`}
            onClick={togglePriorityDropdown}
          >
            <span className="text-xs font-medium">{priorityInfo.label}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        {/* Status Dropdown */}
        <div ref={statusRef} className="relative">
          <Button 
            variant="outline" 
            size="sm" 
            className={`flex items-center gap-2 ${statusInfo.color} border`}
            onClick={toggleStatusDropdown}
          >
            <span className="text-xs font-medium">{statusInfo.label}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Priority Dropdown Menu */}
      {isPriorityDropdownOpen() && createPortal(
        <div 
          className="dropdown-menu fixed bg-surface-elevated border border-border-primary rounded-md shadow-lg min-w-[200px] z-[9999]"
          style={{ 
            top: getPriorityDropdownPosition()?.y || 0, 
            left: getPriorityDropdownPosition()?.x || 0,
            position: 'fixed',
            pointerEvents: 'auto'
          }}
        >
          {Object.entries(priorityDropdownConfig).map(([key, config]) => (
            <div 
              key={key}
              className="px-3 py-2 hover:bg-surface-interactive cursor-pointer text-sm text-text-primary"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePriorityChange(key as Priority);
              }}
            >
              <span className={config.color.split(' ')[0]}>{config.label}</span>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Status Dropdown Menu */}
      {isStatusDropdownOpen() && createPortal(
        <div 
          className="dropdown-menu fixed bg-surface-elevated border border-border-primary rounded-md shadow-lg min-w-[200px] z-[9999]"
          style={{ 
            top: getStatusDropdownPosition()?.y || 0, 
            left: getStatusDropdownPosition()?.x || 0,
            position: 'fixed',
            pointerEvents: 'auto'
          }}
        >
          {Object.entries(statusDropdownConfig).map(([key, config]) => (
            <div 
              key={key}
              className="px-3 py-2 hover:bg-surface-interactive cursor-pointer text-sm text-text-primary"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStatusChange(key as TaskStatus);
              }}
            >
              <span className={config.color.split(' ')[0]}>{config.label}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

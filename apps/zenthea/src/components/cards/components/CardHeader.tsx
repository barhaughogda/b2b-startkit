'use client';

import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  TestTube,
  MessageSquare,
  Activity,
  FileText,
  Pill,
  Stethoscope,
  AlertCircle,
  User,
  Tag,
  CalendarIcon,
  Paperclip
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardTypeConfig, type CardType } from '../config';
import { BaseCardProps } from '../types';

interface CardHeaderProps {
  id: string;
  type: CardType;
  title: string;
  patientName: string;
  patientId: string;
  patientDateOfBirth?: string;
  assignedTo?: string;
  activeTab: string;
  onTabChange?: (tab: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity') => void;
  tabNames?: Record<string, string>;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  isPatient?: boolean;
  children: React.ReactNode; // For control buttons and dropdowns
}

export function CardHeaderComponent({
  id,
  type,
  title,
  patientName,
  patientId,
  patientDateOfBirth,
  assignedTo,
  activeTab,
  onTabChange,
  tabNames,
  onMouseDown,
  onDoubleClick,
  isPatient = false,
  children
}: CardHeaderProps) {
  // Get card type configuration for colors
  const typeConfig = cardTypeConfig[type] || cardTypeConfig.appointment;
  
  return (
    <CardHeader 
      className={cn(
        "flex flex-col space-y-0 pb-0 cursor-move select-none relative",
        typeConfig.borderColor,
        "border-l-4"
      )}
      style={{ 
        overflow: 'visible',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
      data-drag-handle="true"
      draggable={false}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
    >
      {/* Control buttons and dropdowns - passed as children */}
      {children}

      {/* Top section - Card info */}
      <div className="flex items-start justify-between w-full pb-2 pr-20">
        {/* Left side - Card info */}
        <div className="flex flex-col gap-1">
          {/* Card Type Row */}
          <div className="flex items-center gap-2">
            {type === 'appointment' && <Calendar className={cn("h-5 w-5", typeConfig.color)} />}
            {type === 'labResult' && <TestTube className={cn("h-5 w-5", typeConfig.color)} />}
            {type === 'message' && <MessageSquare className={cn("h-5 w-5", typeConfig.color)} />}
            {type === 'vitalSigns' && <Activity className={cn("h-5 w-5", typeConfig.color)} />}
            {type === 'soapNote' && <FileText className={cn("h-5 w-5", typeConfig.color)} />}
            {type === 'prescription' && <Pill className={cn("h-5 w-5", typeConfig.color)} />}
            {type === 'procedure' && <Stethoscope className={cn("h-5 w-5", typeConfig.color)} />}
            {type === 'diagnosis' && <AlertCircle className={cn("h-5 w-5", typeConfig.color)} />}
            <CardTitle className={cn("font-bold text-lg", typeConfig.color)}>
              {type === 'appointment' && 'Appointment'}
              {type === 'labResult' && 'Lab Results'}
              {type === 'message' && 'Message'}
              {type === 'vitalSigns' && 'Vital Signs'}
              {type === 'soapNote' && 'SOAP Note'}
              {type === 'prescription' && 'Prescription'}
              {type === 'procedure' && 'Procedure'}
              {type === 'diagnosis' && 'Diagnosis'}
            </CardTitle>
          </div>
          
          {/* Patient Name Row */}
          <div>
            <h3 className="font-bold text-base text-text-primary">{patientName}</h3>
          </div>
          
          {/* Patient Info Row */}
          <div>
            <p className="text-sm text-text-secondary">
              {patientDateOfBirth ? `DOB: ${patientDateOfBirth}` : `ID: ${patientId}`}
            </p>
          </div>
        </div>
        
        {/* Right side - Assignment indicator */}
        {assignedTo && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="text-xs text-muted-foreground">{assignedTo}</span>
          </div>
        )}
      </div>
      
      {/* Tab Navigation - Integrated into header */}
      <div className="flex gap-1 pt-2 pb-2 border-b border-border-primary overflow-x-auto scrollbar-hide">
        <Button
          variant={activeTab === 'info' ? 'default' : 'ghost'}
          size="sm"
          className="rounded-full text-xs whitespace-nowrap min-w-fit"
          onClick={() => onTabChange?.('info')}
        >
          <Calendar className="h-3 w-3 mr-1" />
          {tabNames?.info || 'Info'}
        </Button>
        <Button
          variant={activeTab === 'members' ? 'default' : 'ghost'}
          size="sm"
          className="rounded-full text-xs whitespace-nowrap min-w-fit"
          onClick={() => onTabChange?.('members')}
        >
          <User className="h-3 w-3 mr-1" />
          {isPatient ? 'Caring Team' : 'Members'}
        </Button>
        {/* Tags, Due Date, and Notes tabs - Hidden for patients */}
        {!isPatient && (
          <>
            <Button
              variant={activeTab === 'tags' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full text-xs whitespace-nowrap min-w-fit"
              onClick={() => onTabChange?.('tags')}
            >
              <Tag className="h-3 w-3 mr-1" />
              {tabNames?.tags || 'Tags'}
            </Button>
            <Button
              variant={activeTab === 'dueDate' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full text-xs whitespace-nowrap min-w-fit"
              onClick={() => onTabChange?.('dueDate')}
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              Due Date
            </Button>
          </>
        )}
        <Button
          variant={activeTab === 'attachments' ? 'default' : 'ghost'}
          size="sm"
          className="rounded-full text-xs whitespace-nowrap min-w-fit"
          onClick={() => onTabChange?.('attachments')}
        >
          <Paperclip className="h-3 w-3 mr-1" />
          Attachments
        </Button>
        {/* Notes tab - Hidden for patients */}
        {!isPatient && (
          <Button
            variant={activeTab === 'notes' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-full text-xs whitespace-nowrap min-w-fit"
            onClick={() => onTabChange?.('notes')}
          >
            <FileText className="h-3 w-3 mr-1" />
            Notes
          </Button>
        )}
        <Button
          variant={activeTab === 'activity' ? 'default' : 'ghost'}
          size="sm"
          className="rounded-full text-xs whitespace-nowrap min-w-fit"
          onClick={() => onTabChange?.('activity')}
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Activity
        </Button>
      </div>
    </CardHeader>
  );
}

import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardTypeConfig, type CardType } from '../config';
import { getMinimizedCardText, truncateText } from '../utils/CardConstants';

interface MinimizedCardProps {
  id: string;
  type: CardType;
  title: string;
  patientName: string;
  dueDate?: string;
  position: { x: number; y: number };
  zIndex: number;
  className?: string;
  onExpand?: (id: string) => void;
  onClose: (id: string) => void;
}

export function MinimizedCard({
  id,
  type,
  title,
  patientName,
  dueDate,
  position,
  zIndex,
  className,
  onExpand,
  onClose
}: MinimizedCardProps) {
  // Get card type configuration
  const typeConfig = cardTypeConfig[type] || cardTypeConfig.appointment;
  const IconComponent = typeConfig.icon;
  const minimizedText = getMinimizedCardText(type, title, dueDate);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // For minimized cards, expand to previous state instead of maximizing
    onExpand?.(id);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(id);
  };

  return (
    <div
      className={cn(
        "fixed border rounded-lg shadow-lg pointer-events-auto cursor-pointer",
        "w-64 h-12 flex items-center justify-between px-3",
        typeConfig.bgColor,
        typeConfig.borderColor,
        className
      )}
      style={{
        position: 'fixed',
        left: `${position?.x || 20}px`,
        top: `${position?.y || (typeof window !== 'undefined' ? window.innerHeight - 100 : 100)}px`, // Default to lower area
        zIndex: zIndex,
      }}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <IconComponent className={cn("h-4 w-4 flex-shrink-0", typeConfig.color)} />
        <span 
          className={cn(
            "text-sm font-medium truncate overflow-hidden whitespace-nowrap",
            typeConfig.color
          )}
          title={`${minimizedText} - ${patientName}`} // Show full info on hover
        >
          {truncateText(minimizedText, 25)}
        </span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex-shrink-0 h-6 w-6 p-0 hover:bg-gray-200"
        onClick={handleClose}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

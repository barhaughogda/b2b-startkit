'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Minimize2, 
  Maximize2, 
  RotateCcw, 
  Minus
} from 'lucide-react';

interface CardControlsProps {
  isMinimized: boolean;
  isMaximized: boolean;
  onMinimize: (e: React.MouseEvent) => void;
  onMaximize: (e: React.MouseEvent) => void;
  onClose: (e: React.MouseEvent) => void;
}

export function CardControls({
  isMinimized,
  isMaximized,
  onMinimize,
  onMaximize,
  onClose
}: CardControlsProps) {
  return (
    <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
      <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
        <Minus className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onMaximize} className="h-6 w-6 p-0">
        {isMaximized ? <RotateCcw className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
      </Button>
      <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

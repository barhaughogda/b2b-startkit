'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Grid3X3, 
  Minimize2, 
  X, 
  Maximize2,
  Layers, 
  Calendar, 
  Tag, 
  User, 
  AlertTriangle
} from 'lucide-react';
import { useCardSystem } from './CardSystemProvider';
import { UI_Z_INDEX } from '@/lib/z-index';

export function CardControlBar() {
  const { 
    cards, 
    tileAll, 
    minimizeAll, 
    restoreAll, 
    closeAll,
    stackByPriority,
    stackByType,
    stackByProvider,
    stackByPatient,
    stackByDueDate
  } = useCardSystem();
  
  const [showStackManager, setShowStackManager] = useState(false);
  const stackManagerRef = useRef<HTMLDivElement>(null);

  // Ensure CardControlBar is always on top of all cards
  // Use portal z-index base to ensure it appears above all cards
  // Memoized to ensure stable z-index within a single component lifecycle
  // MUST be called before early return to follow Rules of Hooks
  const CONTROL_BAR_Z_INDEX = useMemo(() => UI_Z_INDEX.CONTROL_BAR, []);

  // Handle click outside to close stack manager dropdown
  useEffect(() => {
    if (!showStackManager) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (stackManagerRef.current && !stackManagerRef.current.contains(target)) {
        setShowStackManager(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStackManager]);

  const openCards = cards.filter(card => !card.isMinimized);
  const minimizedCards = cards.filter(card => card.isMinimized);
  const hasCards = cards.length > 0;

  if (!hasCards) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 pointer-events-auto"
      style={{ zIndex: CONTROL_BAR_Z_INDEX }}
    >
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-2 flex items-center gap-2">
        {/* Card count */}
        <Badge variant="secondary" className="text-xs">
          {openCards.length} open
          {minimizedCards.length > 0 && `, ${minimizedCards.length} minimized`}
        </Badge>

        {/* Tile All button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={tileAll}
          title="Organize all cards in a grid"
          className="h-8 w-8 p-0"
          disabled={openCards.length === 0}
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>

        {/* Stack management */}
        <div className="relative" ref={stackManagerRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStackManager(!showStackManager)}
            title="Manage stacks"
            className="h-8 w-8 p-0"
            disabled={openCards.length === 0}
          >
            <Layers className="h-4 w-4" />
          </Button>
          
          {showStackManager && (
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-background border border-border rounded-lg shadow-lg p-2" data-stack-manager>
              <div className="space-y-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Group by
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    stackByPriority();
                    setShowStackManager(false);
                  }}
                  disabled={openCards.length === 0}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  By Priority
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    stackByType();
                    setShowStackManager(false);
                  }}
                  disabled={openCards.length === 0}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  By Type
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    stackByProvider();
                    setShowStackManager(false);
                  }}
                  disabled={openCards.length === 0}
                >
                  <User className="h-4 w-4 mr-2" />
                  By Provider
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    stackByPatient();
                    setShowStackManager(false);
                  }}
                  disabled={openCards.length === 0}
                >
                  <User className="h-4 w-4 mr-2" />
                  By Patient
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    stackByDueDate();
                    setShowStackManager(false);
                  }}
                  disabled={openCards.length === 0}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  By Due Date
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Restore All */}
        <Button
          variant="ghost"
          size="sm"
          onClick={restoreAll}
          title="Restore all minimized cards"
          className="h-8 w-8 p-0"
          disabled={minimizedCards.length === 0}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        {/* Minimize All */}
        <Button
          variant="ghost"
          size="sm"
          onClick={minimizeAll}
          title="Minimize all cards"
          className="h-8 w-8 p-0"
          disabled={openCards.length === 0}
        >
          <Minimize2 className="h-4 w-4" />
        </Button>

        {/* Close All */}
        <Button
          variant="ghost"
          size="sm"
          onClick={closeAll}
          title="Close all cards"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


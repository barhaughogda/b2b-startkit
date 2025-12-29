'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Grid3X3, 
  Minimize2, 
  X, 
  Layers, 
  Calendar, 
  Tag, 
  User, 
  AlertTriangle,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import { useModal } from './ModalContext';

export function ModalControlBar() {
  const { 
    modals, 
    stacks, 
    organizeModals, 
    minimizeAll, 
    closeAll, 
    createStack,
    activeModalId 
  } = useModal();
  
  const [showStackManager, setShowStackManager] = useState(false);
  const [showGroupOptions, setShowGroupOptions] = useState(false);

  const openModals = modals.filter(modal => !modal.isMinimized);
  const minimizedModals = modals.filter(modal => modal.isMinimized);
  const hasModals = modals.length > 0;

  if (!hasModals) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] pointer-events-auto">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-2 flex items-center gap-2">
        {/* Modal count */}
        <Badge variant="secondary" className="text-xs">
          {openModals.length} open
          {minimizedModals.length > 0 && `, ${minimizedModals.length} minimized`}
        </Badge>

        {/* Organize button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={organizeModals}
          title="Organize all modals in a grid"
          className="h-8 w-8 p-0"
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>

        {/* Stack management */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStackManager(!showStackManager)}
            title="Manage stacks"
            className="h-8 w-8 p-0"
          >
            <Layers className="h-4 w-4" />
          </Button>
          
          {showStackManager && (
            <div className="absolute bottom-full right-0 mb-2 w-80 bg-background border border-border rounded-lg shadow-lg p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Stack Manager</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowStackManager(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Stack management features coming soon...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Group by options */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGroupOptions(!showGroupOptions)}
            title="Group modals by"
            className="h-8 w-8 p-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          
          {showGroupOptions && (
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-background border border-border rounded-lg shadow-lg p-2">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    createStack('By Date', 'created');
                    setShowGroupOptions(false);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  By Date
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    createStack('By Type', 'type');
                    setShowGroupOptions(false);
                  }}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  By Type
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    createStack('By Provider', 'provider');
                    setShowGroupOptions(false);
                  }}
                >
                  <User className="h-4 w-4 mr-2" />
                  By Provider
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    createStack('By Priority', 'priority');
                    setShowGroupOptions(false);
                  }}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  By Priority
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Minimize all */}
        <Button
          variant="ghost"
          size="sm"
          onClick={minimizeAll}
          title="Minimize all modals"
          className="h-8 w-8 p-0"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>

        {/* Close all */}
        <Button
          variant="ghost"
          size="sm"
          onClick={closeAll}
          title="Close all modals"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Stack indicators */}
      {stacks.length > 0 && (
        <div className="absolute bottom-full right-0 mb-2 flex gap-1">
          {stacks.map((stack) => (
            <div
              key={stack.id}
              className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-2 flex items-center gap-2"
            >
              <Badge variant="outline" className="text-xs">
                {stack.name}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stack.modals.length}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

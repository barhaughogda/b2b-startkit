'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Command, 
  Search, 
  X, 
  Keyboard, 
  Zap,
  Square,
  Minimize2,
  Circle,
  Plus,
  RotateCcw,
  HelpCircle
} from 'lucide-react';
import { useModalKeyboardShortcuts, KeyboardShortcut } from '@/hooks/useModalKeyboardShortcuts';
import { useModal } from './ModalContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { modals, organizeModals, minimizeAll, closeAll, openModal } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    {
      id: 'organize',
      title: 'Organize Modals',
      description: 'Arrange all modals in a grid',
      icon: Square,
      action: () => {
        organizeModals();
        onClose();
      }
    },
    {
      id: 'minimize-all',
      title: 'Minimize All',
      description: 'Minimize all open modals',
      icon: Minimize2,
      action: () => {
        minimizeAll();
        onClose();
      }
    },
    {
      id: 'close-all',
      title: 'Close All',
      description: 'Close all modals',
      icon: Circle,
      action: () => {
        if (confirm('Close all modals?')) {
          closeAll();
          onClose();
        }
      }
    },
    {
      id: 'new-modal',
      title: 'New Modal',
      description: 'Create a new modal',
      icon: Plus,
      action: () => {
        openModal({
          title: 'New Modal',
          content: 'NewModal',
          size: 'md'
        });
        onClose();
      }
    },
    {
      id: 'refresh',
      title: 'Refresh',
      description: 'Refresh modal system',
      icon: RotateCcw,
      action: () => {
        window.location.reload();
      }
    }
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            Math.min(prev + 1, filteredCommands.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background border border-border rounded-lg shadow-lg">
        <div className="flex items-center gap-3 p-4 border-b">
          <Command className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <Input
              placeholder="Search commands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No commands found
            </div>
          ) : (
            filteredCommands.map((command, index) => {
              const Icon = command.icon;
              return (
                <button
                  key={command.id}
                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 ${
                    index === selectedIndex ? 'bg-muted' : ''
                  }`}
                  onClick={command.action}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{command.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {command.description}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
        
        <div className="p-3 border-t text-xs text-muted-foreground">
          Use ↑↓ to navigate, Enter to select, Esc to close
        </div>
      </div>
    </div>
  );
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const { shortcuts } = useModalKeyboardShortcuts();

  if (!isOpen) return null;

  const formatKey = (shortcut: KeyboardShortcut) => {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.metaKey) parts.push('Cmd');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    parts.push(shortcut.key);
    return parts.join(' + ');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-background border border-border rounded-lg shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Keyboard className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="grid gap-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{shortcut.description}</div>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {formatKey(shortcut)}
                </Badge>
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              <span>Press ? to show this help at any time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KeyboardShortcutHelper() {
  const { 
    showCommandPalette, 
    setShowCommandPalette, 
    showShortcuts, 
    setShowShortcuts 
  } = useModalKeyboardShortcuts();

  return (
    <>
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)} 
      />
      <KeyboardShortcutsModal 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />
    </>
  );
}

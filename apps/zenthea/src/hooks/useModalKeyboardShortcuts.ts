'use client';

import { useState, useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
}

interface UseModalKeyboardShortcutsReturn {
  shortcuts: KeyboardShortcut[];
  showCommandPalette: boolean;
  setShowCommandPalette: (show: boolean) => void;
  showShortcuts: boolean;
  setShowShortcuts: (show: boolean) => void;
}

export function useModalKeyboardShortcuts(): UseModalKeyboardShortcutsReturn {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrlKey: true,
      description: 'Open command palette',
      action: () => setShowCommandPalette(true)
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      action: () => setShowShortcuts(true)
    },
    {
      key: 'Escape',
      description: 'Close modal or command palette',
      action: () => {
        setShowCommandPalette(false);
        setShowShortcuts(false);
      }
    },
    {
      key: 'o',
      ctrlKey: true,
      description: 'Organize modals',
      action: () => {
        // This will be handled by the modal context
        if (process.env.NODE_ENV === 'development') {
          console.log('Organize modals');
        }
      }
    },
    {
      key: 'm',
      ctrlKey: true,
      description: 'Minimize all modals',
      action: () => {
        // This will be handled by the modal context
        if (process.env.NODE_ENV === 'development') {
          console.log('Minimize all modals');
        }
      }
    },
    {
      key: 'w',
      ctrlKey: true,
      description: 'Close all modals',
      action: () => {
        // This will be handled by the modal context
        if (process.env.NODE_ENV === 'development') {
          console.log('Close all modals');
        }
      }
    }
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement) {
      return;
    }

    // Check for command palette shortcut
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setShowCommandPalette(true);
      return;
    }

    // Check for shortcuts help
    if (e.key === '?') {
      e.preventDefault();
      setShowShortcuts(true);
      return;
    }

    // Check for escape
    if (e.key === 'Escape') {
      if (showCommandPalette) {
        setShowCommandPalette(false);
      } else if (showShortcuts) {
        setShowShortcuts(false);
      }
      return;
    }

    // Check other shortcuts
    shortcuts.forEach(shortcut => {
      if (shortcut.key === e.key &&
          !!shortcut.ctrlKey === e.ctrlKey &&
          !!shortcut.metaKey === e.metaKey &&
          !!shortcut.shiftKey === e.shiftKey &&
          !!shortcut.altKey === e.altKey) {
        e.preventDefault();
        shortcut.action();
      }
    });
  }, [shortcuts, showCommandPalette, showShortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts,
    showCommandPalette,
    setShowCommandPalette,
    showShortcuts,
    setShowShortcuts
  };
}

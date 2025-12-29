'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Modal, ModalStack } from './types';

interface ModalStackManagerProps {
  children: React.ReactNode;
}

interface ModalStackManagerContextType {
  stacks: ModalStack[];
  createStack: (name: string, modals: Modal[]) => string;
  addToStack: (stackId: string, modal: Modal) => void;
  removeFromStack: (stackId: string, modalId: string) => void;
  moveToStack: (modalId: string, fromStackId: string, toStackId: string) => void;
  getStack: (stackId: string) => ModalStack | undefined;
  getModalStack: (modalId: string) => string | null;
  organizeStack: (stackId: string) => void;
  minimizeStack: (stackId: string) => void;
  closeStack: (stackId: string) => void;
}

const ModalStackManagerContext = React.createContext<ModalStackManagerContextType | null>(null);

export function useModalStackManager(): ModalStackManagerContextType {
  const context = React.useContext(ModalStackManagerContext);
  if (!context) {
    throw new Error('useModalStackManager must be used within a ModalStackManager');
  }
  return context;
}

export function ModalStackManager({ children }: ModalStackManagerProps) {
  const [stacks, setStacks] = useState<ModalStack[]>([]);

  const createStack = useCallback((name: string, modals: Modal[] = []): string => {
    const newStack: ModalStack = {
      id: `stack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      modals: modals.map(modal => modal.id),
      position: { x: 100, y: 100 },
      groupBy: 'created',    };

    setStacks(prev => [...prev, newStack]);
    return newStack.id;
  }, []);

  const addToStack = useCallback((stackId: string, modal: Modal) => {
    setStacks(prev => prev.map(stack => 
      stack.id === stackId 
        ? { ...stack, modals: [...stack.modals, modal.id] }
        : stack
    ));
  }, []);

  const removeFromStack = useCallback((stackId: string, modalId: string) => {
    setStacks(prev => prev.map(stack => 
      stack.id === stackId 
        ? { ...stack, modals: stack.modals.filter(id => id !== modalId) }
        : stack
    ));
  }, []);

  const moveToStack = useCallback((modalId: string, fromStackId: string, toStackId: string) => {
    setStacks(prev => prev.map(stack => {
      if (stack.id === fromStackId) {
        return { ...stack, modals: stack.modals.filter(id => id !== modalId) };
      } else if (stack.id === toStackId) {
        return { ...stack, modals: [...stack.modals, modalId] };
      }
      return stack;
    }));
  }, []);

  const getStack = useCallback((stackId: string): ModalStack | undefined => {
    return stacks.find(stack => stack.id === stackId);
  }, [stacks]);

  const getModalStack = useCallback((modalId: string): string | null => {
    const stack = stacks.find(stack => stack.modals.includes(modalId));
    return stack ? stack.id : null;
  }, [stacks]);

  const organizeStack = useCallback((stackId: string) => {
    const stack = stacks.find(s => s.id === stackId);
    if (!stack) return;

    // Simple grid organization for modals in stack
    const modalsPerRow = Math.ceil(Math.sqrt(stack.modals.length));
    const modalSize = { width: 300, height: 200 };
    const spacing = 20;

    setStacks(prev => prev.map(s => 
      s.id === stackId 
        ? {
            ...s,
          }
        : s
    ));
  }, [stacks]);

  const minimizeStack = useCallback((stackId: string) => {
    // Stack minimization logic can be implemented here
    if (process.env.NODE_ENV === "development") {
      console.log("Minimize stack:", stackId);
    }
  }, []);
  const closeStack = useCallback((stackId: string) => {
    setStacks(prev => prev.filter(stack => stack.id !== stackId));
  }, []);

  const contextValue = useMemo(() => ({
    stacks,
    createStack,
    addToStack,
    removeFromStack,
    moveToStack,
    getStack,
    getModalStack,
    organizeStack,
    minimizeStack,
    closeStack
  }), [
    stacks,
    createStack,
    addToStack,
    removeFromStack,
    moveToStack,
    getStack,
    getModalStack,
    organizeStack,
    minimizeStack,
    closeStack
  ]);

  return (
    <ModalStackManagerContext.Provider value={contextValue}>
      {children}
    </ModalStackManagerContext.Provider>
  );
}

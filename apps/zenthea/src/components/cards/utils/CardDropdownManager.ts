import { useCallback, useEffect, useRef, useState } from 'react';
import { CardEventHandlers, Priority, TaskStatus } from '../types';

export interface DropdownState {
  priorityDropdownOpen: boolean;
  statusDropdownOpen: boolean;
}

export interface DropdownPosition {
  x: number;
  y: number;
}

export class CardDropdownManager {
  private dropdownState: DropdownState;
  private setDropdownState: (state: DropdownState) => void;
  private handlers: CardEventHandlers;
  private priorityRef: React.RefObject<HTMLDivElement>;
  private statusRef: React.RefObject<HTMLDivElement>;
  private id: string;

  constructor(
    dropdownState: DropdownState,
    setDropdownState: (state: DropdownState) => void,
    handlers: CardEventHandlers,
    priorityRef: React.RefObject<HTMLDivElement>,
    statusRef: React.RefObject<HTMLDivElement>,
    id: string
  ) {
    this.dropdownState = dropdownState;
    this.setDropdownState = setDropdownState;
    this.handlers = handlers;
    this.priorityRef = priorityRef;
    this.statusRef = statusRef;
    this.id = id;
  }

  togglePriorityDropdown = () => {
    this.setDropdownState({
      ...this.dropdownState,
      priorityDropdownOpen: !this.dropdownState.priorityDropdownOpen,
      statusDropdownOpen: false
    });
  };

  toggleStatusDropdown = () => {
    this.setDropdownState({
      ...this.dropdownState,
      statusDropdownOpen: !this.dropdownState.statusDropdownOpen,
      priorityDropdownOpen: false
    });
  };

  closeAllDropdowns = () => {
    this.setDropdownState({
      priorityDropdownOpen: false,
      statusDropdownOpen: false
    });
  };

  handlePriorityChange = (priority: Priority) => {
    this.handlers.onPriorityChange?.(this.id, priority);
    this.closeAllDropdowns();
  };

  handleStatusChange = (status: TaskStatus) => {
    this.handlers.onStatusChange?.(this.id, status);
    this.closeAllDropdowns();
  };

  // Get dropdown state
  isPriorityDropdownOpen = () => {
    return this.dropdownState.priorityDropdownOpen;
  };

  isStatusDropdownOpen = () => {
    return this.dropdownState.statusDropdownOpen;
  };

  // Get dropdown position
  getPriorityDropdownPosition = (): DropdownPosition | null => {
    if (!this.dropdownState.priorityDropdownOpen || !this.priorityRef.current) return null;

    const rect = this.priorityRef.current.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.bottom + 4
    };
  };

  getStatusDropdownPosition = (): DropdownPosition | null => {
    if (!this.dropdownState.statusDropdownOpen || !this.statusRef.current) return null;

    const rect = this.statusRef.current.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.bottom + 4
    };
  };

  // Handle click outside to close dropdowns
  handleClickOutside = (e: MouseEvent) => {
    if (
      this.priorityRef.current &&
      !this.priorityRef.current.contains(e.target as Node) &&
      this.statusRef.current &&
      !this.statusRef.current.contains(e.target as Node)
    ) {
      this.closeAllDropdowns();
    }
  };

  setupEventListeners = () => {
    document.addEventListener('mousedown', this.handleClickOutside);
  };

  cleanup = () => {
    document.removeEventListener('mousedown', this.handleClickOutside);
  };
}

// Hook for using the dropdown manager
export const useCardDropdowns = (handlers: CardEventHandlers, id: string) => {
  const [dropdownState, setDropdownState] = useState<DropdownState>({
    priorityDropdownOpen: false,
    statusDropdownOpen: false
  });

  const priorityRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const dropdownManager = useCallback(
    () => new CardDropdownManager(dropdownState, setDropdownState, handlers, priorityRef, statusRef, id),
    [dropdownState, handlers, id]
  );

  useEffect(() => {
    const manager = dropdownManager();
    manager.setupEventListeners();
    return () => manager.cleanup();
  }, [dropdownManager]);

  return {
    dropdownState,
    dropdownManager: dropdownManager(),
    priorityRef,
    statusRef
  };
};

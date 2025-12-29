import { useEffect, useRef, useCallback } from 'react';

interface UseFocusTrapOptions {
  enabled?: boolean;
  initialFocus?: boolean;
  returnFocus?: boolean;
}

export function useFocusTrap(options: UseFocusTrapOptions = {}) {
  const { enabled = true, initialFocus = true, returnFocus = true } = options;
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];
  }, []);

  const focusFirstElement = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements]);

  const focusLastElement = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, [getFocusableElements]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || !containerRef.current) return;

    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      // Only trap focus if we're at the boundaries
      if (event.shiftKey) {
        // Shift + Tab: reverse tabbing - trap at first element
        if (activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: forward tabbing - trap at last element
        if (activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [enabled, getFocusableElements]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store the previously focused element
    if (returnFocus) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }

    // Focus the first element if requested
    if (initialFocus) {
      // Use a small delay to ensure the modal is fully rendered
      const timeoutId = setTimeout(focusFirstElement, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [enabled, initialFocus, focusFirstElement, returnFocus]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  // Cleanup function to restore focus
  const cleanup = useCallback(() => {
    if (returnFocus && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [returnFocus]);

  return {
    containerRef,
    focusFirstElement,
    focusLastElement,
    cleanup
  };
}

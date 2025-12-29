/**
 * Accessibility Utilities for Website Builder
 * 
 * Provides helper functions and constants for ensuring WCAG 2.1 AA compliance
 * in all website builder components.
 */

// =============================================================================
// SKIP LINK UTILS
// =============================================================================

/**
 * IDs for skip link targets
 */
export const SKIP_LINK_TARGETS = {
  MAIN_CONTENT: 'main-content',
  NAVIGATION: 'main-navigation',
  FOOTER: 'footer-content',
  BOOKING: 'booking-section',
} as const;

/**
 * Generate skip link configuration
 */
export function generateSkipLinks() {
  return [
    { id: SKIP_LINK_TARGETS.MAIN_CONTENT, label: 'Skip to main content' },
    { id: SKIP_LINK_TARGETS.NAVIGATION, label: 'Skip to navigation' },
    { id: SKIP_LINK_TARGETS.FOOTER, label: 'Skip to footer' },
  ];
}

// =============================================================================
// FOCUS MANAGEMENT
// =============================================================================

/**
 * Trap focus within a container element (useful for modals, menus)
 */
export function trapFocus(container: HTMLElement) {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);
  
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Focus the first focusable element in a container
 */
export function focusFirstElement(container: HTMLElement) {
  const focusableElement = container.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  focusableElement?.focus();
}

// =============================================================================
// ARIA HELPERS
// =============================================================================

/**
 * Generate unique IDs for ARIA attributes
 */
export function generateAriaId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ARIA live region announcement
 */
export function announceToScreenReader(message: string, politeness: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', politeness);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement is made
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// =============================================================================
// KEYBOARD NAVIGATION
// =============================================================================

/**
 * Handle keyboard navigation for interactive lists
 */
export function handleListNavigation(
  e: React.KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onSelect: (index: number) => void
) {
  switch (e.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex]?.focus();
      break;
    case 'Home':
      e.preventDefault();
      items[0]?.focus();
      break;
    case 'End':
      e.preventDefault();
      items[items.length - 1]?.focus();
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      onSelect(currentIndex);
      break;
  }
}

// =============================================================================
// COLOR CONTRAST
// =============================================================================

/**
 * Calculate relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Parse hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return null;
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsContrastAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 */
export function meetsContrastAAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Suggest an accessible text color based on background
 */
export function getAccessibleTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.179 ? '#000000' : '#ffffff';
}

// =============================================================================
// REDUCED MOTION
// =============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on user preference
 */
export function getAnimationDuration(defaultMs: number): number {
  return prefersReducedMotion() ? 0 : defaultMs;
}

// =============================================================================
// FORM ACCESSIBILITY
// =============================================================================

/**
 * Generate ARIA attributes for form fields
 */
export function getFormFieldAriaProps(
  id: string,
  label: string,
  error?: string,
  description?: string,
  required?: boolean
) {
  const props: Record<string, string | boolean | undefined> = {
    id,
    'aria-label': label,
    'aria-required': required,
    'aria-invalid': !!error,
  };

  if (error) {
    props['aria-errormessage'] = `${id}-error`;
  }

  if (description) {
    props['aria-describedby'] = `${id}-description`;
  }

  return props;
}

// =============================================================================
// SCREEN READER TEXT
// =============================================================================

/**
 * CSS class for visually hidden but screen reader accessible text
 */
export const SR_ONLY_CLASS = 'sr-only';

/**
 * Create screen reader only text
 */
export function srOnly(text: string): { className: string; children: string } {
  return {
    className: SR_ONLY_CLASS,
    children: text,
  };
}


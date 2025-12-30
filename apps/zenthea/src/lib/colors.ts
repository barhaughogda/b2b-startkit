/**
 * ZENTHEA COLOR SYSTEM - TypeScript Support
 * 
 * This file provides TypeScript types and utilities for the centralized color system.
 * All colors are defined in src/styles/colors.css and referenced here for type safety.
 */

// ========================================
// THEME TYPES
// ========================================

export type Theme = 'light' | 'dark' | 'high-contrast';

export interface ThemeConfig {
  name: Theme;
  label: string;
  description: string;
  isDark: boolean;
  isHighContrast: boolean;
}

export const THEMES: Record<Theme, ThemeConfig> = {
  light: {
    name: 'light',
    label: 'Light Theme',
    description: 'Default light theme with brand colors',
    isDark: false,
    isHighContrast: false,
  },
  dark: {
    name: 'dark',
    label: 'Dark Theme',
    description: 'Dark theme optimized for low-light environments',
    isDark: true,
    isHighContrast: false,
  },
  'high-contrast': {
    name: 'high-contrast',
    label: 'High Contrast Theme',
    description: 'Maximum contrast theme for accessibility',
    isDark: false,
    isHighContrast: true,
  },
};

// ========================================
// BRAND COLOR TYPES
// ========================================

export interface BrandColors {
  teal: string;
  purple: string;
  coral: string;
  cream: string;
}

export const BRAND_COLORS: BrandColors = {
  teal: '#008080',
  purple: '#5F284A',
  coral: '#E07B7E',
  cream: '#F2DDC9',
};

// ========================================
// SEMANTIC COLOR TYPES
// ========================================

export interface SemanticColors {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
    overlay: string;
  };
  surface: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
    interactive: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
    inverse: string;
    link: string;
    linkHover: string;
  };
  border: {
    primary: string;
    secondary: string;
    tertiary: string;
    focus: string;
    error: string;
    success: string;
    warning: string;
  };
  interactive: {
    primary: string;
    primaryHover: string;
    primaryActive: string;
    secondary: string;
    secondaryHover: string;
    secondaryActive: string;
    disabled: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
    critical: string;
  };
}

// ========================================
// HEALTHCARE COLOR TYPES
// ========================================

export interface HealthcareColors {
  patient: {
    default: string;
    active: string;
    inactive: string;
    discharged: string;
  };
  appointment: {
    default: string;
    scheduled: string;
    confirmed: string;
    cancelled: string;
    rescheduled: string;
  };
  vital: {
    default: string;
    normal: string;
    elevated: string;
    critical: string;
    low: string;
  };
  lab: {
    normal: string;
    abnormal: string;
    critical: string;
    pending: string;
    unavailable: string;
  };
  alert: {
    info: string;
    warning: string;
    error: string;
    critical: string;
    success: string;
  };
  treatment: {
    active: string;
    completed: string;
    pending: string;
    cancelled: string;
  };
  insurance: {
    active: string;
    pending: string;
    denied: string;
    expired: string;
  };
  medical: {
    normal: string;
    abnormal: string;
    critical: string;
    stable: string;
    unstable: string;
  };
}

// ========================================
// COLOR UTILITY FUNCTIONS
// ========================================

/**
 * Get CSS custom property value
 */
export function getCSSVariable(property: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(property)
    .trim();
}

/**
 * Set CSS custom property value
 */
export function setCSSVariable(property: string, value: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(property, value);
}

/**
 * Get theme-specific color value
 */
export function getThemeColor(colorPath: string): string {
  const property = `--color-${colorPath}`;
  return getCSSVariable(property);
}

/**
 * Get healthcare color value
 */
export function getHealthcareColor(colorPath: string): string {
  const property = `--healthcare-${colorPath}`;
  return getCSSVariable(property);
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Get current theme from document
 */
export function getCurrentTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  const theme = document.documentElement.getAttribute('data-theme') as Theme;
  return theme || 'light';
}

/**
 * Check if current theme is dark
 */
export function isDarkTheme(): boolean {
  return getCurrentTheme() === 'dark';
}

/**
 * Check if current theme is high contrast
 */
export function isHighContrastTheme(): boolean {
  return getCurrentTheme() === 'high-contrast';
}

// ========================================
// CONTRAST UTILITY FUNCTIONS
// ========================================

/**
 * Calculate relative luminance of a color
 */
export function getLuminance(color: string): number {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  // Apply gamma correction
  const converted = [r, g, b].map(c => 
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  
  const rs = converted[0]!;
  const gs = converted[1]!;
  const bs = converted[2]!;
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsWCAGAA(foreground: string, background: string): boolean {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= 4.5; // WCAG AA standard
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 */
export function meetsWCAGAAA(foreground: string, background: string): boolean {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= 7.0; // WCAG AAA standard
}

// ========================================
// COLOR VALIDATION
// ========================================

/**
 * Validate that all required colors are defined
 */
export function validateColorSystem(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if we're in browser
  if (typeof window === 'undefined') {
    return { valid: true, errors: [] };
  }
  
  // Required color categories
  const requiredColors = [
    // Brand colors
    '--zenthea-teal',
    '--zenthea-purple',
    '--zenthea-coral',
    '--zenthea-cream',
    
    // Semantic colors
    '--color-background-primary',
    '--color-text-primary',
    '--color-border-primary',
    '--color-interactive-primary',
    '--color-status-success',
    
    // Healthcare colors
    '--healthcare-patient',
    '--healthcare-appointment',
    '--healthcare-vital',
    '--healthcare-alert-info',
  ];
  
  for (const color of requiredColors) {
    const value = getCSSVariable(color);
    if (!value) {
      errors.push(`Missing color: ${color}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ========================================
// TENANT BRANDING SUPPORT
// ========================================

export interface TenantBranding {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  font?: string;
}

/**
 * Apply tenant-specific branding
 */
export function applyTenantBranding(tenantId: string, branding: TenantBranding): void {
  if (typeof document === 'undefined') return;
  
  // Set tenant-specific CSS variables
  setCSSVariable('--tenant-primary', branding.primary);
  setCSSVariable('--tenant-secondary', branding.secondary);
  setCSSVariable('--tenant-accent', branding.accent);
  setCSSVariable('--tenant-background', branding.background);
  
  if (branding.font) {
    setCSSVariable('--tenant-font', branding.font);
  }
  
  // Apply tenant attribute to document
  document.documentElement.setAttribute('data-tenant', tenantId);
}

/**
 * Clear tenant branding
 */
export function clearTenantBranding(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.removeAttribute('data-tenant');
}

// ========================================
// EXPORT ALL TYPES AND UTILITIES
// ========================================


/**
 * Color Contrast Validation System
 * Validates WCAG AA compliance for all color combinations
 */

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  level: 'AA' | 'AAA' | 'FAIL';
}

export interface ColorPair {
  foreground: string;
  background: string;
  context: string;
}

/**
 * Calculate relative luminance of a color
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate contrast ratio between two colors
 */
export function calculateContrast(foreground: string, background: string): ContrastResult {
  const fgLuminance = getLuminance(foreground);
  const bgLuminance = getLuminance(background);
  
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  
  const ratio = (lighter + 0.05) / (darker + 0.05);
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7.0,
    level: ratio >= 7.0 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'FAIL'
  };
}

/**
 * Validate color pairs for accessibility
 */
export function validateColorPairs(pairs: ColorPair[]): Array<ColorPair & { result: ContrastResult }> {
  return pairs.map(pair => ({
    ...pair,
    result: calculateContrast(pair.foreground, pair.background)
  }));
}

/**
 * Get accessible alternatives for failed color combinations
 */
export function getAccessibleAlternatives(foreground: string, background: string): string[] {
  const alternatives: string[] = [];
  
  // For light backgrounds, suggest darker text
  if (getLuminance(background) > 0.5) {
    alternatives.push('#000000'); // Pure black
    alternatives.push('#1a1a1a'); // Very dark gray
    alternatives.push('#333333'); // Dark gray
  }
  
  // For dark backgrounds, suggest lighter text
  if (getLuminance(background) < 0.5) {
    alternatives.push('#ffffff'); // Pure white
    alternatives.push('#f8f9fa'); // Very light gray
    alternatives.push('#e9ecef'); // Light gray
  }
  
  return alternatives.filter(alt => {
    const result = calculateContrast(alt, background);
    return result.passesAA;
  });
}

/**
 * Common problematic color combinations in the codebase
 */
export const PROBLEMATIC_PATTERNS = [
  // Status colors with low opacity backgrounds
  { pattern: /text-status-error.*bg-status-error.*bg-opacity-10/, severity: 'HIGH' },
  { pattern: /text-status-warning.*bg-status-warning.*bg-opacity-10/, severity: 'HIGH' },
  { pattern: /text-status-info.*bg-status-info.*bg-opacity-10/, severity: 'HIGH' },
  { pattern: /text-status-success.*bg-status-success.*bg-opacity-10/, severity: 'HIGH' },
  
  // Brand colors with low opacity backgrounds
  { pattern: /text-zenthea-purple.*bg-zenthea-purple.*bg-opacity-10/, severity: 'HIGH' },
  { pattern: /text-zenthea-teal.*bg-zenthea-teal.*bg-opacity-10/, severity: 'MEDIUM' },
  
  // Tertiary text on secondary backgrounds
  { pattern: /text-text-tertiary.*bg-surface-secondary/, severity: 'MEDIUM' },
  { pattern: /text-muted-foreground.*bg-surface/, severity: 'MEDIUM' },
  
  // Low contrast combinations
  { pattern: /text-gray-500.*bg-gray-100/, severity: 'HIGH' },
  { pattern: /text-gray-600.*bg-gray-200/, severity: 'HIGH' },
];

/**
 * Validate a className string for contrast issues
 */
export function validateClassName(className: string): {
  hasIssues: boolean;
  issues: Array<{ pattern: string; severity: string; suggestion: string }>;
} {
  const issues: Array<{ pattern: string; severity: string; suggestion: string }> = [];
  
  PROBLEMATIC_PATTERNS.forEach(({ pattern, severity }) => {
    if (pattern.test(className)) {
      issues.push({
        pattern: pattern.toString(),
        severity,
        suggestion: getSuggestionForPattern(pattern)
      });
    }
  });
  
  return {
    hasIssues: issues.length > 0,
    issues
  };
}

function getSuggestionForPattern(pattern: RegExp): string {
  if (pattern.source.includes('bg-opacity-10')) {
    return 'Use higher opacity background (bg-opacity-20 or bg-opacity-30) or darker text color';
  }
  if (pattern.source.includes('text-text-tertiary')) {
    return 'Use text-text-primary or text-text-secondary for better contrast';
  }
  if (pattern.source.includes('text-muted-foreground')) {
    return 'Use text-foreground or text-primary for better contrast';
  }
  return 'Consider using semantic color classes with better contrast ratios';
}

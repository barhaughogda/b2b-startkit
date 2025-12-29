/**
 * Accessibility Testing Utilities for Zenthea Design System
 * 
 * This module provides utilities for testing WCAG 2.1 AA compliance,
 * contrast ratios, and accessibility features across all themes.
 */

export interface ContrastResult {
  ratio: number;
  level: 'AA' | 'AAA' | 'FAIL';
  largeText: boolean;
  normalText: boolean;
}

export interface AccessibilityTestResult {
  element: string;
  foreground: string;
  background: string;
  contrast: ContrastResult;
  passed: boolean;
}

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.1 guidelines
 */
export function calculateContrastRatio(foreground: string, background: string): ContrastResult {
  const fgLuminance = getLuminance(foreground);
  const bgLuminance = getLuminance(background);
  
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  
  const ratio = (lighter + 0.05) / (darker + 0.05);
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    level: getContrastLevel(ratio),
    largeText: ratio >= 3, // WCAG AA for large text
    normalText: ratio >= 4.5, // WCAG AA for normal text
  };
}

/**
 * Get relative luminance of a color
 */
function getLuminance(color: string): number {
  const rgb = hexToRgb(color);
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
 * Get contrast level based on ratio
 */
function getContrastLevel(ratio: number): 'AA' | 'AAA' | 'FAIL' {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'FAIL';
}

/**
 * Test all color combinations in the design system
 */
export function testAllColorCombinations(): AccessibilityTestResult[] {
  const results: AccessibilityTestResult[] = [];
  
  // Zenthea brand colors
  const zentheaColors = {
    primary: '#008080', // Teal
    secondary: '#5F284A', // Dark Purple
    accent: '#E07B7E', // Coral
    background: '#F2DDC9', // Cream
  };
  
  // Healthcare colors
  const healthcareColors = {
    patient: '#22c55e', // Green
    appointment: '#008080', // Teal
    vital: '#B91C1C', // Red
    critical: '#991B1B', // Darker Red
    normal: '#22c55e', // Green
    abnormal: '#B91C1C', // Red
    warning: '#eab308', // Yellow
    info: '#008080', // Teal
    success: '#22c55e', // Green
    error: '#B91C1C', // Red
  };
  
  // Test combinations
  const allColors = { ...zentheaColors, ...healthcareColors };
  const backgrounds = ['#ffffff', '#000000', '#f8f9fa', '#212529'];
  
  Object.entries(allColors).forEach(([name, foreground]) => {
    backgrounds.forEach(background => {
      const contrast = calculateContrastRatio(foreground, background);
      results.push({
        element: `${name} on ${background}`,
        foreground,
        background,
        contrast,
        passed: contrast.normalText || contrast.largeText,
      });
    });
  });
  
  return results;
}

/**
 * Test keyboard navigation
 */
export function testKeyboardNavigation(): string[] {
  const issues: string[] = [];
  
  // Check for focusable elements
  const focusableElements = document.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  focusableElements.forEach((element, index) => {
    const nextElement = focusableElements[index + 1];
    if (nextElement) {
      const rect1 = element.getBoundingClientRect();
      const rect2 = nextElement.getBoundingClientRect();
      
      // Check if elements are in logical tab order
      if (rect1.top > rect2.top || (rect1.top === rect2.top && rect1.left > rect2.left)) {
        issues.push(`Tab order issue: ${element.tagName} followed by ${nextElement.tagName}`);
      }
    }
  });
  
  return issues;
}

/**
 * Test screen reader compatibility
 */
export function testScreenReaderCompatibility(): string[] {
  const issues: string[] = [];
  
  // Check for missing alt text
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      issues.push(`Image missing alt text: ${img.src}`);
    }
  });
  
  // Check for missing labels
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const id = input.id;
    const label = document.querySelector(`label[for="${id}"]`);
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    
    if (!label && !ariaLabel && !ariaLabelledBy) {
      issues.push(`Form control missing label: ${input.tagName}`);
    }
  });
  
  // Check for missing headings
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) {
    issues.push('Page missing heading structure');
  }
  
  return issues;
}

/**
 * Test focus indicators
 */
export function testFocusIndicators(): string[] {
  const issues: string[] = [];
  
  const focusableElements = document.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  focusableElements.forEach(element => {
    const computedStyle = window.getComputedStyle(element, ':focus');
    const outline = computedStyle.outline;
    const boxShadow = computedStyle.boxShadow;
    
    if (outline === 'none' && !boxShadow) {
      issues.push(`Element missing focus indicator: ${element.tagName}`);
    }
  });
  
  return issues;
}

/**
 * Generate accessibility report
 */
export function generateAccessibilityReport(): {
  contrastTests: AccessibilityTestResult[];
  keyboardIssues: string[];
  screenReaderIssues: string[];
  focusIssues: string[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    wcagCompliant: boolean;
  };
} {
  const contrastTests = testAllColorCombinations();
  const keyboardIssues = testKeyboardNavigation();
  const screenReaderIssues = testScreenReaderCompatibility();
  const focusIssues = testFocusIndicators();
  
  const passedTests = contrastTests.filter(test => test.passed).length;
  const failedTests = contrastTests.length - passedTests;
  
  return {
    contrastTests,
    keyboardIssues,
    screenReaderIssues,
    focusIssues,
    summary: {
      totalTests: contrastTests.length,
      passedTests,
      failedTests,
      wcagCompliant: failedTests === 0 && keyboardIssues.length === 0 && 
                     screenReaderIssues.length === 0 && focusIssues.length === 0,
    },
  };
}

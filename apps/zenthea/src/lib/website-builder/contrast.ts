/**
 * Contrast Checker - WCAG Compliance Utilities
 *
 * Provides utilities to check color contrast ratios and ensure accessibility
 * compliance with WCAG AA standards (4.5:1 for normal text, 3:1 for large text).
 */

/**
 * Validate hex color format
 * @param hex - Hex color string (e.g., '#FFFFFF', '#FFF', 'FFFFFF', 'FFF')
 * @returns True if valid hex color format
 */
export function isValidHex(hex: string): boolean {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
}

/**
 * Convert hex color to RGB
 * @param hex - Hex color string (e.g., '#FFFFFF', '#FFF', 'FFFFFF', 'FFF')
 * @returns RGB object with r, g, b properties (0-255) or null if invalid
 */
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace('#', '')

  // Handle 3-character shorthand (e.g., 'FFF' -> 'FFFFFF')
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('')
  }

  // Parse hex string (must be 6 characters after expansion)
  if (hex.length !== 6) {
    return null
  }

  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null
  }

  return { r, g, b }
}

/**
 * Calculate relative luminance for a color
 * Based on WCAG 2.0 formula
 * @param rgb - RGB color values
 * @returns Luminance value (0-1)
 */
export function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.0 formula
 * @param hexColor1 - First hex color
 * @param hexColor2 - Second hex color
 * @returns Contrast ratio (1-21) or null if invalid colors
 */
export function getContrastRatio(
  hexColor1: string,
  hexColor2: string
): number | null {
  const rgb1 = hexToRgb(hexColor1)
  const rgb2 = hexToRgb(hexColor2)

  if (!rgb1 || !rgb2) {
    return null
  }

  const lum1 = getLuminance(rgb1)
  const lum2 = getLuminance(rgb2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * @param contrastRatio - Contrast ratio (typically 1-21)
 * @param isLargeText - Whether the text is large (18pt+ or 14pt+ bold)
 * @returns True if meets AA standard, false otherwise
 */
export function meetsWCAGAA(
  contrastRatio: number | null,
  isLargeText: boolean = false
): boolean {
  if (contrastRatio === null) {
    return false
  }

  // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
  return isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 * @param contrastRatio - Contrast ratio (typically 1-21)
 * @param isLargeText - Whether the text is large (18pt+ or 14pt+ bold)
 * @returns True if meets AAA standard, false otherwise
 */
export function meetsWCAGAAA(
  contrastRatio: number | null,
  isLargeText: boolean = false
): boolean {
  if (contrastRatio === null) {
    return false
  }

  // WCAG AAA requires 7:1 for normal text, 4.5:1 for large text
  return isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7
}

/**
 * Get contrast status message
 * @param contrastRatio - Contrast ratio
 * @param isLargeText - Whether the text is large
 * @returns Object with status and message
 */
export function getContrastStatus(
  contrastRatio: number | null,
  isLargeText: boolean = false
): { status: 'pass' | 'warn' | 'fail'; message: string } {
  if (contrastRatio === null) {
    return { status: 'fail', message: 'Invalid color' }
  }

  const aaMin = isLargeText ? 3 : 4.5
  const aaaMin = isLargeText ? 4.5 : 7

  if (contrastRatio >= aaaMin) {
    return {
      status: 'pass',
      message: `✓ WCAG AAA (${contrastRatio.toFixed(1)}:1)`,
    }
  } else if (contrastRatio >= aaMin) {
    return {
      status: 'pass',
      message: `✓ WCAG AA (${contrastRatio.toFixed(1)}:1)`,
    }
  } else if (contrastRatio >= 1) {
    return {
      status: 'warn',
      message: `⚠ Low contrast (${contrastRatio.toFixed(1)}:1)`,
    }
  } else {
    return { status: 'fail', message: 'Invalid contrast ratio' }
  }
}

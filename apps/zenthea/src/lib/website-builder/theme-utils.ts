/**
 * Theme Utilities for Website Builder
 * 
 * Provides CSS variable generation, font mapping, and helper functions
 * for applying theme settings consistently across blocks.
 */

import type { ThemeConfig } from './schema';
import { FONT_PAIRS, DEFAULT_THEME } from './schema';

/**
 * Flexible theme type that accepts both proper ThemeConfig and schema data
 * with string enums (from Convex/database). The mergeThemeWithDefaults function
 * handles the conversion from string enums to proper types.
 */
type FlexibleThemeInput = 
  | Partial<ThemeConfig>
  | Partial<{
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      backgroundColor?: string;
      textColor?: string;
      fontPair?: string;
      headingSize?: string;
      sectionSpacing?: string;
      cornerRadius?: string;
      buttonStyle?: string;
      colorMode?: string;
      customCss?: string;
    }>
  | null
  | undefined;

// =============================================================================
// FONT CONFIGURATION
// =============================================================================

/**
 * Google Fonts URL mapping for each font pair
 */
export const FONT_URLS: Record<string, string> = {
  'inter-system': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'poppins-inter': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@400;500&display=swap',
  'playfair-lato': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Lato:wght@400;700&display=swap',
  'montserrat-opensans': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;600&display=swap',
  'raleway-roboto': 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&family=Roboto:wght@400;500&display=swap',
};

/**
 * CSS font-family declarations for each font pair
 */
export const FONT_FAMILIES: Record<string, { heading: string; body: string }> = {
  'inter-system': {
    heading: "'Inter', system-ui, -apple-system, sans-serif",
    body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  'poppins-inter': {
    heading: "'Poppins', sans-serif",
    body: "'Inter', sans-serif",
  },
  'playfair-lato': {
    heading: "'Playfair Display', serif",
    body: "'Lato', sans-serif",
  },
  'montserrat-opensans': {
    heading: "'Montserrat', sans-serif",
    body: "'Open Sans', sans-serif",
  },
  'raleway-roboto': {
    heading: "'Raleway', sans-serif",
    body: "'Roboto', sans-serif",
  },
};

// =============================================================================
// SPACING CONFIGURATION
// =============================================================================

/**
 * Section spacing values mapped to CSS
 */
export const SECTION_SPACING: Record<string, { py: string; pyMd: string }> = {
  compact: { py: '2rem', pyMd: '3rem' },      // py-8 md:py-12
  normal: { py: '3rem', pyMd: '4rem' },       // py-12 md:py-16
  spacious: { py: '4rem', pyMd: '6rem' },     // py-16 md:py-24
};

/**
 * Heading size values mapped to CSS
 */
export const HEADING_SIZES: Record<string, { h1: string; h2: string; h3: string }> = {
  small: {
    h1: 'clamp(2rem, 5vw, 2.5rem)',      // ~text-3xl to text-4xl
    h2: 'clamp(1.5rem, 4vw, 1.875rem)',  // ~text-2xl to text-3xl
    h3: 'clamp(1.25rem, 3vw, 1.5rem)',   // ~text-xl to text-2xl
  },
  medium: {
    h1: 'clamp(2.25rem, 6vw, 3.75rem)',  // ~text-4xl to text-6xl
    h2: 'clamp(1.875rem, 5vw, 2.25rem)', // ~text-3xl to text-4xl
    h3: 'clamp(1.5rem, 4vw, 1.875rem)',  // ~text-2xl to text-3xl
  },
  large: {
    h1: 'clamp(3rem, 8vw, 4.5rem)',      // ~text-5xl to text-7xl
    h2: 'clamp(2.25rem, 6vw, 3rem)',     // ~text-4xl to text-5xl
    h3: 'clamp(1.875rem, 5vw, 2.25rem)', // ~text-3xl to text-4xl
  },
};

/**
 * Corner radius values mapped to CSS
 */
export const CORNER_RADIUS: Record<string, string> = {
  none: '0',
  small: '0.25rem',   // rounded-sm (4px)
  medium: '0.5rem',   // rounded-lg (8px)
  large: '1rem',      // rounded-xl (16px)
  full: '9999px',     // rounded-full
};

// =============================================================================
// CSS VARIABLE GENERATION
// =============================================================================

export interface ThemeCSSVariables {
  // Colors
  '--theme-primary': string;
  '--theme-secondary': string;
  '--theme-accent': string;
  '--theme-bg': string;
  '--theme-text': string;
  // Colors with opacity variants
  '--theme-primary-10': string;
  '--theme-primary-20': string;
  '--theme-primary-90': string;
  '--theme-secondary-10': string;
  '--theme-secondary-20': string;
  // Typography
  '--theme-font-heading': string;
  '--theme-font-body': string;
  '--theme-h1-size': string;
  '--theme-h2-size': string;
  '--theme-h3-size': string;
  // Spacing
  '--theme-section-py': string;
  '--theme-section-py-md': string;
  // Radius
  '--theme-radius': string;
  '--theme-radius-sm': string;
  '--theme-radius-lg': string;
}

/**
 * Convert hex color to RGB values
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
 * Create color with opacity
 */
function colorWithOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Merge partial theme with defaults to create a complete ThemeConfig
 * Handles string types for enum properties by validating and converting them
 * Accepts flexible input types to handle schema data that may have string enums
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeThemeWithDefaults(theme: any): ThemeConfig {
  if (!theme) return DEFAULT_THEME;
  
  // Validate and convert string enum values to proper types
  const validatedTheme: Partial<ThemeConfig> = { ...theme };
  
  // Validate cornerRadius
  if (validatedTheme.cornerRadius && typeof validatedTheme.cornerRadius === 'string') {
    const validRadiuses = ['none', 'small', 'medium', 'large', 'full'] as const;
    if (validRadiuses.includes(validatedTheme.cornerRadius as typeof validRadiuses[number])) {
      validatedTheme.cornerRadius = validatedTheme.cornerRadius as ThemeConfig['cornerRadius'];
    } else {
      validatedTheme.cornerRadius = DEFAULT_THEME.cornerRadius;
    }
  }
  
  // Validate headingSize
  if (validatedTheme.headingSize && typeof validatedTheme.headingSize === 'string') {
    const validSizes = ['small', 'medium', 'large'] as const;
    if (validSizes.includes(validatedTheme.headingSize as typeof validSizes[number])) {
      validatedTheme.headingSize = validatedTheme.headingSize as ThemeConfig['headingSize'];
    } else {
      validatedTheme.headingSize = DEFAULT_THEME.headingSize;
    }
  }
  
  // Validate sectionSpacing
  if (validatedTheme.sectionSpacing && typeof validatedTheme.sectionSpacing === 'string') {
    const validSpacings = ['compact', 'normal', 'spacious'] as const;
    if (validSpacings.includes(validatedTheme.sectionSpacing as typeof validSpacings[number])) {
      validatedTheme.sectionSpacing = validatedTheme.sectionSpacing as ThemeConfig['sectionSpacing'];
    } else {
      validatedTheme.sectionSpacing = DEFAULT_THEME.sectionSpacing;
    }
  }
  
  // Validate buttonStyle
  if (validatedTheme.buttonStyle && typeof validatedTheme.buttonStyle === 'string') {
    const validStyles = ['solid', 'outline', 'ghost'] as const;
    if (validStyles.includes(validatedTheme.buttonStyle as typeof validStyles[number])) {
      validatedTheme.buttonStyle = validatedTheme.buttonStyle as ThemeConfig['buttonStyle'];
    } else {
      validatedTheme.buttonStyle = DEFAULT_THEME.buttonStyle;
    }
  }
  
  // Validate colorMode
  if (validatedTheme.colorMode && typeof validatedTheme.colorMode === 'string') {
    const validModes = ['light', 'dark', 'auto'] as const;
    if (validModes.includes(validatedTheme.colorMode as typeof validModes[number])) {
      validatedTheme.colorMode = validatedTheme.colorMode as ThemeConfig['colorMode'];
    } else {
      validatedTheme.colorMode = DEFAULT_THEME.colorMode;
    }
  }
  
  return {
    ...DEFAULT_THEME,
    ...validatedTheme,
  } as ThemeConfig;
}

/**
 * Generate CSS variables object from theme config
 * Accepts partial theme objects and merges with defaults
 * Handles both proper ThemeConfig types and schema data with string enums
 */
export function generateThemeCSSVariables(
  theme: FlexibleThemeInput
): ThemeCSSVariables {
  const fullTheme = mergeThemeWithDefaults(theme);
  const fontPair = fullTheme.fontPair || 'inter-system';
  const fonts = FONT_FAMILIES[fontPair] || FONT_FAMILIES['inter-system']!;
  const headingSizeKey = fullTheme.headingSize || 'medium';
  const headingSizes = HEADING_SIZES[headingSizeKey] || HEADING_SIZES['medium']!;
  const spacingKey = fullTheme.sectionSpacing || 'normal';
  const spacing = SECTION_SPACING[spacingKey] || SECTION_SPACING['normal']!;
  const radiusKey = fullTheme.cornerRadius || 'medium';
  const radius = CORNER_RADIUS[radiusKey] || CORNER_RADIUS['medium']!;

  return {
    // Colors
    '--theme-primary': fullTheme.primaryColor,
    '--theme-secondary': fullTheme.secondaryColor,
    '--theme-accent': fullTheme.accentColor || fullTheme.primaryColor,
    '--theme-bg': fullTheme.backgroundColor,
    '--theme-text': fullTheme.textColor,
    // Color variants
    '--theme-primary-10': colorWithOpacity(fullTheme.primaryColor, 0.1),
    '--theme-primary-20': colorWithOpacity(fullTheme.primaryColor, 0.2),
    '--theme-primary-90': colorWithOpacity(fullTheme.primaryColor, 0.9),
    '--theme-secondary-10': colorWithOpacity(fullTheme.secondaryColor, 0.1),
    '--theme-secondary-20': colorWithOpacity(fullTheme.secondaryColor, 0.2),
    // Typography
    '--theme-font-heading': fonts.heading,
    '--theme-font-body': fonts.body,
    '--theme-h1-size': headingSizes.h1,
    '--theme-h2-size': headingSizes.h2,
    '--theme-h3-size': headingSizes.h3,
    // Spacing
    '--theme-section-py': spacing.py,
    '--theme-section-py-md': spacing.pyMd,
    // Radius
    '--theme-radius': radius,
    '--theme-radius-sm': CORNER_RADIUS[fullTheme.cornerRadius === 'none' ? 'none' : 'small'] || CORNER_RADIUS['small']!,
    '--theme-radius-lg': CORNER_RADIUS[
      fullTheme.cornerRadius === 'full' ? 'full' : 
      fullTheme.cornerRadius === 'large' ? 'large' : 
      'medium'
    ] || CORNER_RADIUS['medium']!,
  };
}

/**
 * Generate inline style object from theme for React components
 * Accepts partial theme objects and merges with defaults
 * Handles both proper ThemeConfig types and schema data with string enums
 */
export function getThemeStyles(
  theme: FlexibleThemeInput
): React.CSSProperties {
  return generateThemeCSSVariables(theme) as unknown as React.CSSProperties;
}

/**
 * Get Google Fonts link URL for the selected font pair
 */
export function getFontUrl(fontPair: string): string {
  return FONT_URLS[fontPair] || FONT_URLS['inter-system']!;
}

/**
 * Get font family CSS for heading or body
 */
export function getFontFamily(fontPair: string, type: 'heading' | 'body'): string {
  const fonts = FONT_FAMILIES[fontPair] || FONT_FAMILIES['inter-system']!;
  return fonts[type];
}

// =============================================================================
// HELPER FUNCTIONS FOR BLOCKS
// =============================================================================

/**
 * Get primary color with optional opacity
 * Accepts partial theme objects and merges with defaults
 */
export function getPrimaryColor(
  theme: FlexibleThemeInput,
  opacity?: number
): string {
  const color = theme?.primaryColor || DEFAULT_THEME.primaryColor;
  if (opacity !== undefined) {
    return colorWithOpacity(color, opacity);
  }
  return color;
}

/**
 * Get secondary color with optional opacity
 * Accepts partial theme objects and merges with defaults
 */
export function getSecondaryColor(
  theme: FlexibleThemeInput,
  opacity?: number
): string {
  const color = theme?.secondaryColor || DEFAULT_THEME.secondaryColor;
  if (opacity !== undefined) {
    return colorWithOpacity(color, opacity);
  }
  return color;
}

/**
 * Get accent color with optional opacity
 * Accepts partial theme objects and merges with defaults
 */
export function getAccentColor(
  theme: FlexibleThemeInput,
  opacity?: number
): string {
  const color = theme?.accentColor || theme?.primaryColor || DEFAULT_THEME.accentColor;
  if (opacity !== undefined) {
    return colorWithOpacity(color, opacity);
  }
  return color;
}

/**
 * Generate button styles based on theme
 * Accepts partial theme objects and merges with defaults
 */
export function getButtonStyles(
  theme: FlexibleThemeInput,
  variant: 'primary' | 'secondary' | 'outline' = 'primary'
): React.CSSProperties {
  const primaryColor = theme?.primaryColor || DEFAULT_THEME.primaryColor;
  const secondaryColor = theme?.secondaryColor || DEFAULT_THEME.secondaryColor;

  switch (variant) {
    case 'primary':
      return {
        backgroundColor: primaryColor,
        color: '#ffffff',
      };
    case 'secondary':
      return {
        backgroundColor: secondaryColor,
        color: '#ffffff',
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderColor: primaryColor,
        color: primaryColor,
      };
    default:
      return {};
  }
}

/**
 * Check if a color is dark (for determining text color)
 */
export function isColorDark(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance < 0.5;
}

/**
 * Get contrasting text color (white or dark) for a background
 */
export function getContrastingTextColor(backgroundColor: string): string {
  return isColorDark(backgroundColor) ? '#ffffff' : '#1a1a1a';
}

/**
 * Get primary text color from theme (for headings, important text)
 * Accepts partial theme objects and merges with defaults
 */
export function getPrimaryTextColor(
  theme: FlexibleThemeInput
): string {
  return theme?.textColor || DEFAULT_THEME.textColor;
}

/**
 * Get secondary text color from theme (for subtitles, descriptions)
 * Uses a lighter version of textColor or secondaryColor
 * Accepts partial theme objects and merges with defaults
 */
export function getSecondaryTextColor(
  theme: FlexibleThemeInput
): string {
  if (!theme) return '#78716c'; // Default tertiary color
  
  // Use textColor with reduced opacity, or secondaryColor if it's suitable
  const textColor = theme.textColor || DEFAULT_THEME.textColor;
  const rgb = hexToRgb(textColor);
  
  if (rgb) {
    // Create a lighter version (70% opacity) for secondary text
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
  }
  
  return '#78716c';
}

/**
 * Get tertiary text color from theme (for less important text)
 * Accepts partial theme objects and merges with defaults
 */
export function getTertiaryTextColor(
  theme: FlexibleThemeInput
): string {
  if (!theme) return '#78716c'; // Default tertiary color
  
  const textColor = theme.textColor || DEFAULT_THEME.textColor;
  const rgb = hexToRgb(textColor);
  
  if (rgb) {
    // Create an even lighter version (50% opacity) for tertiary text
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
  }
  
  return '#78716c';
}

/**
 * Get background color from theme
 * Accepts partial theme objects and merges with defaults
 */
export function getBackgroundColor(
  theme: FlexibleThemeInput
): string {
  return theme?.backgroundColor || DEFAULT_THEME.backgroundColor;
}

/**
 * Get hover background color for buttons (slightly darker version of primary color)
 * Accepts partial theme objects and merges with defaults
 */
export function getButtonHoverBgColor(
  theme: FlexibleThemeInput
): string {
  const primaryColor = getPrimaryColor(theme);
  const rgb = hexToRgb(primaryColor);
  
  if (rgb) {
    // Darken by 10% for hover state
    return `rgba(${Math.max(0, rgb.r - 25)}, ${Math.max(0, rgb.g - 25)}, ${Math.max(0, rgb.b - 25)}, 1)`;
  }
  
  return primaryColor;
}

/**
 * Get hover text color for buttons (white for dark backgrounds, primary color for light)
 * Accepts partial theme objects and merges with defaults
 */
export function getButtonHoverTextColor(
  theme: FlexibleThemeInput,
  isDarkBackground = false
): string {
  if (isDarkBackground) {
    return '#ffffff';
  }
  
  const primaryColor = getPrimaryColor(theme);
  const rgb = hexToRgb(primaryColor);
  
  if (rgb) {
    // For light backgrounds, use white text on hover
    return '#ffffff';
  }
  
  return primaryColor;
}


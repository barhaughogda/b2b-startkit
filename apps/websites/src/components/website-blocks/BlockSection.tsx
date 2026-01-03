'use client';

/**
 * BlockSection - Shared wrapper for website builder blocks
 * 
 * Applies per-block appearance settings (background/text colors) consistently.
 * Uses a token-first approach with optional custom hex overrides.
 * 
 * Design principles:
 * - Token values map to theme CSS variables for consistency
 * - Custom hex values override tokens when specified
 * - 'default' token preserves the block's built-in styling
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { BlockAppearance, BackgroundToken, TextToken, ThemeConfig } from '@/lib/website-builder/schema';
import { DEFAULT_BLOCK_APPEARANCE } from '@/lib/website-builder/schema';
import { getPrimaryColor, getSecondaryColor, isColorDark } from '@/lib/website-builder/theme-utils';

// =============================================================================
// TYPES
// =============================================================================

export interface BlockSectionProps {
  /** Block content */
  children: React.ReactNode;
  /** Appearance configuration (optional) */
  appearance?: BlockAppearance;
  /** Theme configuration for token resolution */
  theme?: Partial<ThemeConfig>;
  /** Block type for data attribute */
  blockType?: string;
  /** Block ID for data attribute */
  blockId?: string;
  /** HTML id attribute for anchor navigation */
  id?: string;
  /** Additional className */
  className?: string;
  /** Whether in preview mode (adds padding for visibility) */
  isPreview?: boolean;
  /** HTML element to render (default: section) */
  as?: 'section' | 'div' | 'article';
  /** Default section padding (can be overridden by blocks) */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Additional styles */
  style?: React.CSSProperties;
}

// =============================================================================
// TOKEN TO STYLE MAPPINGS
// =============================================================================

/**
 * Normalize color values (handle uppercase VAR -> var)
 */
function normalizeColor(color: string | undefined): string | undefined {
  if (!color) return color;
  const trimmed = color.trim();
  if (trimmed.toLowerCase().startsWith('var(--')) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

/**
 * Map background tokens to CSS classes/styles
 * These map to the Zenthea design system CSS variables (--color-*)
 */
function getBackgroundStyle(
  token: BackgroundToken,
  customColor: string | undefined,
  theme?: Partial<ThemeConfig>
): React.CSSProperties {
  // Custom color takes precedence
  const normalizedCustom = normalizeColor(customColor);
  if (normalizedCustom) {
    return { backgroundColor: normalizedCustom };
  }

  // Token-based styling using design system variables
  switch (token) {
    case 'default':
      return {}; // Let block handle its own background
    case 'primary':
      return { backgroundColor: 'var(--color-background-elevated)' }; // White
    case 'secondary':
      return { backgroundColor: 'var(--color-background-secondary)' }; // Light teal
    case 'surface':
      return { backgroundColor: 'var(--color-surface-elevated)' }; // White
    case 'accent':
      // Use theme primary color or fall back to CSS variable
      return { backgroundColor: theme ? getPrimaryColor(theme) : 'var(--zenthea-teal)' };
    case 'accent-light':
      // Use theme primary with opacity or fall back to light teal
      return { backgroundColor: theme ? getPrimaryColor(theme, 0.1) : 'var(--zenthea-teal-100)' };
    case 'transparent':
      return { backgroundColor: 'transparent' };
    default:
      return {};
  }
}

/**
 * Map text tokens to CSS classes/styles
 * These map to the Zenthea design system CSS variables (--color-text-*)
 */
function getTextStyle(
  token: TextToken,
  customColor: string | undefined,
  theme?: Partial<ThemeConfig>,
  backgroundToken?: BackgroundToken,
  backgroundCustom?: string
): React.CSSProperties {
  // Custom color takes precedence
  const normalizedCustom = normalizeColor(customColor);
  if (normalizedCustom) {
    return { color: normalizedCustom };
  }

  // Token-based styling using design system variables
  switch (token) {
    case 'default':
      return {}; // Let block handle its own text color
    case 'primary':
      return { color: 'var(--color-text-primary)' }; // Dark purple in light, white in dark
    case 'secondary':
      return { color: 'var(--color-text-secondary)' }; // Teal
    case 'tertiary':
      return { color: 'var(--color-text-tertiary)' }; // Gray
    case 'on-accent':
      // Auto-detect contrast for accent backgrounds
      if (backgroundToken === 'accent' || backgroundCustom) {
        const bgColor = normalizeColor(backgroundCustom) || (theme ? getPrimaryColor(theme) : '#008080');
        return { color: isColorDark(bgColor) ? '#ffffff' : 'var(--color-text-primary)' };
      }
      return { color: '#ffffff' }; // Default to white for accent backgrounds
    case 'accent':
      // Use theme primary color or fall back to CSS variable
      return { color: theme ? getPrimaryColor(theme) : 'var(--zenthea-teal)' };
    default:
      return {};
  }
}

/**
 * Get padding classes based on padding prop
 */
function getPaddingClasses(padding: BlockSectionProps['padding']): string {
  switch (padding) {
    case 'none':
      return '';
    case 'sm':
      return 'py-8 md:py-12';
    case 'md':
      return 'py-12 md:py-16';
    case 'lg':
      return 'py-16 md:py-20';
    case 'xl':
      return 'py-20 md:py-24';
    default:
      return ''; // No default padding - let blocks decide
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * BlockSection Component
 * 
 * Wraps block content with consistent styling based on appearance configuration.
 * 
 * Usage:
 * ```tsx
 * <BlockSection
 *   appearance={block.appearance}
 *   theme={theme}
 *   blockType="hero"
 *   blockId={block.id}
 * >
 *   <YourBlockContent />
 * </BlockSection>
 * ```
 */
export function BlockSection({
  children,
  appearance,
  theme,
  blockType,
  blockId,
  id,
  className,
  isPreview = false,
  as: Element = 'section',
  padding,
  style,
}: BlockSectionProps) {
  // Merge with defaults
  const mergedAppearance = {
    ...DEFAULT_BLOCK_APPEARANCE,
    ...appearance,
  };

  // Compute styles
  const backgroundStyle = getBackgroundStyle(
    mergedAppearance.backgroundToken,
    mergedAppearance.backgroundCustom,
    theme
  );
  
  const textStyle = getTextStyle(
    mergedAppearance.textToken,
    mergedAppearance.textCustom,
    theme,
    mergedAppearance.backgroundToken,
    mergedAppearance.backgroundCustom
  );

  // Combine styles
  const combinedStyle: React.CSSProperties = {
    ...backgroundStyle,
    ...textStyle,
    ...style, // Block-specific styles override appearance styles
  };

  // Has custom styles applied?
  const hasCustomAppearance = 
    mergedAppearance.backgroundToken !== 'default' ||
    mergedAppearance.textToken !== 'default' ||
    Boolean(mergedAppearance.backgroundCustom) ||
    Boolean(mergedAppearance.textCustom);

  // Combining with layout settings
  const maxWidthClasses = {
    narrow: 'max-w-4xl mx-auto',
    normal: 'max-w-6xl mx-auto',
    wide: 'max-w-7xl mx-auto',
    full: 'max-w-none',
  };

  const paddingTopClasses = {
    none: 'pt-0',
    small: 'pt-8 md:pt-12',
    medium: 'pt-12 md:pt-20',
    large: 'pt-20 md:pt-32',
  };

  const paddingBottomClasses = {
    none: 'pb-0',
    small: 'pb-8 md:pb-12',
    medium: 'pb-12 md:pb-20',
    large: 'pb-20 md:pb-32',
  };

  return (
    <Element
      id={id}
      className={cn(
        // Base classes
        'relative w-full overflow-hidden',
        // Top Border
        mergedAppearance.borderTop && 'border-t border-border-primary/50',
        // Bottom Border
        mergedAppearance.borderBottom && 'border-b border-border-primary/50',
        // Padding based on appearance settings
        paddingTopClasses[mergedAppearance.paddingTop || 'medium'],
        paddingBottomClasses[mergedAppearance.paddingBottom || 'medium'],
        // Preview mode indicator
        isPreview && hasCustomAppearance && 'ring-1 ring-interactive-primary/20',
        // Custom className
        className
      )}
      style={combinedStyle}
      data-block-type={blockType}
      data-block-id={blockId}
      data-has-custom-appearance={hasCustomAppearance ? 'true' : undefined}
    >
      <div className={cn(
        'w-full px-4 sm:px-6 lg:px-8',
        maxWidthClasses[mergedAppearance.maxWidth || 'normal']
      )}>
        {children}
      </div>
    </Element>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default BlockSection;

/**
 * Resolve a background token to its CSS value
 * Exported for use in components that need manual color resolution (e.g., buttons)
 */
export function resolveBackgroundToken(
  token: BackgroundToken,
  customColor: string | undefined,
  theme?: Partial<ThemeConfig>
): string | undefined {
  const style = getBackgroundStyle(token, customColor, theme);
  return style.backgroundColor as string | undefined;
}

/**
 * Resolve a text token to its CSS value
 * Exported for use in components that need manual color resolution (e.g., buttons)
 */
export function resolveTextToken(
  token: TextToken,
  customColor: string | undefined,
  theme?: Partial<ThemeConfig>,
  backgroundToken?: BackgroundToken,
  backgroundCustom?: string
): string | undefined {
  const style = getTextStyle(token, customColor, theme, backgroundToken, backgroundCustom);
  return style.color as string | undefined;
}

/**
 * Hook to get resolved appearance styles
 * Useful for blocks that need to apply appearance to specific elements
 */
export function useAppearanceStyles(
  appearance?: BlockAppearance,
  theme?: Partial<ThemeConfig>
): {
  backgroundColor: string | undefined;
  textColor: string | undefined;
  hasCustomAppearance: boolean;
} {
  const mergedAppearance = {
    ...DEFAULT_BLOCK_APPEARANCE,
    ...appearance,
  };

  const backgroundStyle = getBackgroundStyle(
    mergedAppearance.backgroundToken,
    mergedAppearance.backgroundCustom,
    theme
  );

  const textStyle = getTextStyle(
    mergedAppearance.textToken,
    mergedAppearance.textCustom,
    theme,
    mergedAppearance.backgroundToken,
    mergedAppearance.backgroundCustom
  );

  return {
    backgroundColor: backgroundStyle.backgroundColor as string | undefined,
    textColor: textStyle.color as string | undefined,
    hasCustomAppearance:
      mergedAppearance.backgroundToken !== 'default' ||
      mergedAppearance.textToken !== 'default' ||
      Boolean(mergedAppearance.backgroundCustom) ||
      Boolean(mergedAppearance.textCustom),
  };
}


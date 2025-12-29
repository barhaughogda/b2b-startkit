import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  BlockSection, 
  useAppearanceStyles,
  resolveBackgroundToken,
  resolveTextToken,
} from '@/components/website-blocks/BlockSection';
import type { BlockAppearance, ThemeConfig } from '@/lib/website-builder/schema';

/**
 * Unit tests for BlockSection token mapping
 * 
 * These tests verify that background and text tokens are correctly mapped
 * to the Zenthea design system CSS variables.
 */

describe('BlockSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Background Token Mapping', () => {
    it('should apply primary background token using design system variable', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'primary',
        textToken: 'default',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.style.backgroundColor).toBe('var(--color-background-elevated)');
    });

    it('should apply secondary background token using design system variable', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'secondary',
        textToken: 'default',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.style.backgroundColor).toBe('var(--color-background-secondary)');
    });

    it('should apply surface background token using design system variable', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'surface',
        textToken: 'default',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.style.backgroundColor).toBe('var(--color-surface-elevated)');
    });

    it('should apply accent background token using zenthea-teal variable when no theme', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'accent',
        textToken: 'default',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.style.backgroundColor).toBe('var(--zenthea-teal)');
    });

    it('should apply transparent background token', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'transparent',
        textToken: 'default',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.style.backgroundColor).toBe('transparent');
    });

    it('should apply custom background color over token', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'primary',
        backgroundCustom: '#ff5500',
        textToken: 'default',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.style.backgroundColor).toBe('#ff5500');
    });

    it('should not apply background style for default token', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'default',
        textToken: 'default',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      // Default token means no backgroundColor is set
      expect(section?.style.backgroundColor).toBe('');
    });
  });

  describe('Text Token Mapping', () => {
    it('should apply primary text token using design system variable', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'default',
        textToken: 'primary',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.style.color).toBe('var(--color-text-primary)');
    });

    it('should apply secondary text token using design system variable', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'default',
        textToken: 'secondary',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.style.color).toBe('var(--color-text-secondary)');
    });

    it('should apply tertiary text token using design system variable', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'default',
        textToken: 'tertiary',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.style.color).toBe('var(--color-text-tertiary)');
    });

    it('should apply accent text token using zenthea-teal variable when no theme', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'default',
        textToken: 'accent',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.style.color).toBe('var(--zenthea-teal)');
    });

    it('should apply custom text color over token', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'default',
        textToken: 'primary',
        textCustom: '#123456',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.style.color).toBe('#123456');
    });

    it('should auto-detect contrast for on-accent token with dark background', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'accent',
        backgroundCustom: '#000000', // Very dark background
        textToken: 'on-accent',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      // On dark background, on-accent should resolve to white
      expect(section?.style.color).toBe('#ffffff');
    });
  });

  describe('Data Attributes', () => {
    it('should set data-block-type attribute', () => {
      const { container } = render(
        <BlockSection blockType="hero">
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.getAttribute('data-block-type')).toBe('hero');
    });

    it('should set data-block-id attribute', () => {
      const { container } = render(
        <BlockSection blockId="block-123">
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.getAttribute('data-block-id')).toBe('block-123');
    });

    it('should set data-has-custom-appearance when appearance is customized', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'accent',
        textToken: 'on-accent',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.getAttribute('data-has-custom-appearance')).toBe('true');
    });

    it('should not set data-has-custom-appearance for default appearance', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'default',
        textToken: 'default',
      };

      const { container } = render(
        <BlockSection appearance={appearance}>
          <div>Test content</div>
        </BlockSection>
      );

      const section = container.querySelector('section');
      expect(section?.getAttribute('data-has-custom-appearance')).toBeNull();
    });
  });

  describe('Semantic HTML', () => {
    it('should render as section by default', () => {
      const { container } = render(
        <BlockSection>
          <div>Test content</div>
        </BlockSection>
      );

      expect(container.querySelector('section')).toBeTruthy();
    });

    it('should render as div when specified', () => {
      const { container } = render(
        <BlockSection as="div">
          <div>Test content</div>
        </BlockSection>
      );

      expect(container.querySelector('div > div')).toBeTruthy();
      expect(container.querySelector('section')).toBeFalsy();
    });

    it('should render as article when specified', () => {
      const { container } = render(
        <BlockSection as="article">
          <div>Test content</div>
        </BlockSection>
      );

      expect(container.querySelector('article')).toBeTruthy();
    });
  });
});

describe('resolveBackgroundToken', () => {
  it('should resolve primary token to design system variable', () => {
    const result = resolveBackgroundToken('primary', undefined, undefined);
    expect(result).toBe('var(--color-background-elevated)');
  });

  it('should resolve secondary token to design system variable', () => {
    const result = resolveBackgroundToken('secondary', undefined, undefined);
    expect(result).toBe('var(--color-background-secondary)');
  });

  it('should return custom color when provided', () => {
    const result = resolveBackgroundToken('primary', '#ff0000', undefined);
    expect(result).toBe('#ff0000');
  });

  it('should return undefined for default token', () => {
    const result = resolveBackgroundToken('default', undefined, undefined);
    expect(result).toBeUndefined();
  });
});

describe('resolveTextToken', () => {
  it('should resolve primary token to design system variable', () => {
    const result = resolveTextToken('primary', undefined, undefined);
    expect(result).toBe('var(--color-text-primary)');
  });

  it('should resolve secondary token to design system variable', () => {
    const result = resolveTextToken('secondary', undefined, undefined);
    expect(result).toBe('var(--color-text-secondary)');
  });

  it('should return custom color when provided', () => {
    const result = resolveTextToken('primary', '#ff0000', undefined);
    expect(result).toBe('#ff0000');
  });

  it('should return undefined for default token', () => {
    const result = resolveTextToken('default', undefined, undefined);
    expect(result).toBeUndefined();
  });
});

describe('useAppearanceStyles hook', () => {
  // Create a test component to exercise the hook
  function TestComponent({ appearance, theme }: { appearance?: BlockAppearance; theme?: Partial<ThemeConfig> }) {
    const styles = useAppearanceStyles(appearance, theme);
    return (
      <div data-testid="styles-container">
        <span data-testid="bg-color">{styles.backgroundColor || 'undefined'}</span>
        <span data-testid="text-color">{styles.textColor || 'undefined'}</span>
        <span data-testid="has-custom">{String(styles.hasCustomAppearance)}</span>
      </div>
    );
  }

  it('should return undefined colors for default appearance', () => {
    render(
      <TestComponent
        appearance={{
          backgroundToken: 'default',
          textToken: 'default',
        }}
      />
    );

    expect(screen.getByTestId('bg-color').textContent).toBe('undefined');
    expect(screen.getByTestId('text-color').textContent).toBe('undefined');
    expect(screen.getByTestId('has-custom').textContent).toBe('false');
  });

  it('should return resolved colors for non-default tokens', () => {
    render(
      <TestComponent
        appearance={{
          backgroundToken: 'accent',
          textToken: 'on-accent',
        }}
      />
    );

    expect(screen.getByTestId('bg-color').textContent).toBe('var(--zenthea-teal)');
    expect(screen.getByTestId('has-custom').textContent).toBe('true');
  });

  it('should prioritize custom colors over tokens', () => {
    render(
      <TestComponent
        appearance={{
          backgroundToken: 'accent',
          backgroundCustom: '#custom-bg',
          textToken: 'primary',
          textCustom: '#custom-text',
        }}
      />
    );

    expect(screen.getByTestId('bg-color').textContent).toBe('#custom-bg');
    expect(screen.getByTestId('text-color').textContent).toBe('#custom-text');
  });
});


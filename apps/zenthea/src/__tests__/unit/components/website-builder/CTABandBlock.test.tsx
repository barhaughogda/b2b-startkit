import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CTABandBlock from '@/components/website-blocks/CTABandBlock';
import type { CTABandBlockProps, ThemeConfig, BlockAppearance } from '@/lib/website-builder/schema';

/**
 * Unit tests for CTABandBlock appearance and button color application
 * 
 * These tests verify that:
 * 1. Text colors from appearance are properly applied to headline/subheadline
 * 2. Button colors can be customized via primaryButtonAppearance/secondaryButtonAppearance
 * 3. Smart defaults are applied when appearance is not set
 */

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('CTABandBlock', () => {
  const defaultProps: CTABandBlockProps = {
    headline: 'Ready to Get Started?',
    subheadline: 'Book your appointment today',
    primaryCtaText: 'Book Now',
    primaryCtaLink: '/book',
    secondaryCtaText: 'Learn More',
    secondaryCtaLink: '/about',
  };

  const defaultTheme: Partial<ThemeConfig> = {
    primaryColor: '#008080', // Teal
    secondaryColor: '#5F284A', // Purple
    // Theme-utils uses these property names
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Default Appearance (Accent Background)', () => {
    it('should render headline and subheadline', () => {
      render(
        <CTABandBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument();
      expect(screen.getByText('Book your appointment today')).toBeInTheDocument();
    });

    it('should apply accent background as default (via BlockSection)', () => {
      const { container } = render(
        <CTABandBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      // The BlockSection should have a background applied
      const section = container.querySelector('section');
      expect(section).toBeTruthy();
      // Default appearance for CTA Band is accent background
      expect(section?.getAttribute('data-has-custom-appearance')).toBe('true');
    });

    it('should render primary button with smart default colors', () => {
      render(
        <CTABandBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const primaryButton = screen.getByRole('button', { name: /book now/i });
      expect(primaryButton).toBeInTheDocument();
      // Default on dark (accent) background: white background
      expect(primaryButton.style.backgroundColor).toBe('#ffffff');
    });

    it('should render secondary button with smart default colors', () => {
      render(
        <CTABandBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const secondaryButton = screen.getByRole('button', { name: /learn more/i });
      expect(secondaryButton).toBeInTheDocument();
      // Default: transparent background with border matching text
      expect(secondaryButton.style.backgroundColor).toBe('transparent');
    });
  });

  describe('Text Color Application from Appearance', () => {
    it('should apply custom text color to headline', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'accent',
        textToken: 'default',
        textCustom: '#ff5500',
      };

      const { container } = render(
        <CTABandBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
          appearance={appearance}
        />
      );

      const headline = container.querySelector('h2');
      // Custom colors are applied as-is (hex format)
      expect(headline?.style.color).toBe('#ff5500');
    });

    it('should apply text token to headline when no custom color', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'primary',
        textToken: 'primary', // Should use design system text-primary
      };

      const { container } = render(
        <CTABandBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
          appearance={appearance}
        />
      );

      const headline = container.querySelector('h2');
      // Primary text token should use design system variable
      expect(headline?.style.color).toBe('var(--color-text-primary)');
    });

    it('should apply accent text token to headline', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'primary',
        textToken: 'accent', // Should use theme primary color
      };

      const { container } = render(
        <CTABandBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
          appearance={appearance}
        />
      );

      const headline = container.querySelector('h2');
      // Accent text with theme should use the theme primary color (hex format)
      expect(headline?.style.color).toBe('#008080');
    });
  });

  describe('Primary Button Appearance Overrides', () => {
    it('should apply custom primary button background color', () => {
      const propsWithBtnAppearance: CTABandBlockProps = {
        ...defaultProps,
        primaryButtonAppearance: {
          backgroundCustom: '#ff0000',
        },
      };

      render(
        <CTABandBlock
          props={propsWithBtnAppearance}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const primaryButton = screen.getByRole('button', { name: /book now/i });
      expect(primaryButton.style.backgroundColor).toBe('#ff0000');
    });

    it('should apply custom primary button text color', () => {
      const propsWithBtnAppearance: CTABandBlockProps = {
        ...defaultProps,
        primaryButtonAppearance: {
          textCustom: '#00ff00',
        },
      };

      render(
        <CTABandBlock
          props={propsWithBtnAppearance}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const primaryButton = screen.getByRole('button', { name: /book now/i });
      expect(primaryButton.style.color).toBe('#00ff00');
    });

    it('should apply accent background token to primary button', () => {
      const propsWithBtnAppearance: CTABandBlockProps = {
        ...defaultProps,
        primaryButtonAppearance: {
          backgroundToken: 'accent', // Should use theme primary color
        },
      };

      render(
        <CTABandBlock
          props={propsWithBtnAppearance}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const primaryButton = screen.getByRole('button', { name: /book now/i });
      // Accent token with theme should resolve to theme primary color (hex format)
      expect(primaryButton.style.backgroundColor).toBe('#008080');
    });
  });

  describe('Secondary Button Appearance Overrides', () => {
    it('should apply custom secondary button background color', () => {
      const propsWithBtnAppearance: CTABandBlockProps = {
        ...defaultProps,
        secondaryButtonAppearance: {
          backgroundCustom: '#0000ff',
        },
      };

      render(
        <CTABandBlock
          props={propsWithBtnAppearance}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const secondaryButton = screen.getByRole('button', { name: /learn more/i });
      expect(secondaryButton.style.backgroundColor).toBe('#0000ff');
    });

    it('should apply custom secondary button text/border color', () => {
      const propsWithBtnAppearance: CTABandBlockProps = {
        ...defaultProps,
        secondaryButtonAppearance: {
          textCustom: '#ffff00',
        },
      };

      render(
        <CTABandBlock
          props={propsWithBtnAppearance}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const secondaryButton = screen.getByRole('button', { name: /learn more/i });
      expect(secondaryButton.style.color).toBe('#ffff00');
      expect(secondaryButton.style.borderColor).toBe('#ffff00');
    });
  });

  describe('Light Background Behavior', () => {
    it('should use accent button on light background by default', () => {
      const appearance: BlockAppearance = {
        backgroundToken: 'primary', // Light background
        textToken: 'primary',
      };

      render(
        <CTABandBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
          appearance={appearance}
        />
      );

      const primaryButton = screen.getByRole('button', { name: /book now/i });
      // On light background, primary button should use theme color background (hex format)
      expect(primaryButton.style.backgroundColor).toBe('#008080');
    });
  });

  describe('Link Rendering (Non-Preview)', () => {
    it('should render primary button as link in non-preview mode', () => {
      const { container } = render(
        <CTABandBlock
          props={defaultProps}
          isPreview={false}
          theme={defaultTheme}
        />
      );

      const link = container.querySelector('a[href="/book"]');
      expect(link).toBeInTheDocument();
    });

    it('should render secondary button as link in non-preview mode', () => {
      const { container } = render(
        <CTABandBlock
          props={defaultProps}
          isPreview={false}
          theme={defaultTheme}
        />
      );

      const link = container.querySelector('a[href="/about"]');
      expect(link).toBeInTheDocument();
    });

    it('should use bookUrl as fallback for primary button link', () => {
      const propsWithoutLink: CTABandBlockProps = {
        ...defaultProps,
        primaryCtaLink: undefined,
      };

      const { container } = render(
        <CTABandBlock
          props={propsWithoutLink}
          isPreview={false}
          theme={defaultTheme}
          bookUrl="/clinic/book"
        />
      );

      const link = container.querySelector('a[href="/clinic/book"]');
      expect(link).toBeInTheDocument();
    });
  });

  describe('Optional Elements', () => {
    it('should not render subheadline when not provided', () => {
      const propsWithoutSubheadline: CTABandBlockProps = {
        ...defaultProps,
        subheadline: undefined,
      };

      render(
        <CTABandBlock
          props={propsWithoutSubheadline}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      expect(screen.queryByText('Book your appointment today')).not.toBeInTheDocument();
    });

    it('should not render secondary button when text not provided', () => {
      const propsWithoutSecondary: CTABandBlockProps = {
        ...defaultProps,
        secondaryCtaText: undefined,
      };

      render(
        <CTABandBlock
          props={propsWithoutSecondary}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      expect(screen.queryByRole('button', { name: /learn more/i })).not.toBeInTheDocument();
    });
  });

  describe('Theme Font Application', () => {
    it('should apply theme heading font to headline', () => {
      const { container } = render(
        <CTABandBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const headline = container.querySelector('h2');
      expect(headline?.style.fontFamily).toBe('var(--theme-font-heading)');
    });

    it('should apply theme body font to subheadline', () => {
      const { container } = render(
        <CTABandBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const subheadline = container.querySelector('p');
      expect(subheadline?.style.fontFamily).toBe('var(--theme-font-body)');
    });
  });
});


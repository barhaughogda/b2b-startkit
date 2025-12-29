import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ContactBlock from '@/components/website-blocks/ContactBlock';
import type { ContactBlockProps, ThemeConfig } from '@/lib/website-builder/schema';

/**
 * Unit tests for ContactBlock Google Maps embed functionality
 * 
 * These tests verify that:
 * 1. When showMap is true and address exists, an iframe is rendered
 * 2. When showMap is false, no iframe is rendered
 * 3. The iframe URL is correctly constructed with the encoded address
 */

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => null),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ContactBlock', () => {
  const defaultProps: ContactBlockProps = {
    title: 'Contact Us',
    subtitle: 'Get in touch with our team',
    showPhone: true,
    showEmail: true,
    showAddress: true,
    showHours: true,
    showMap: false,
    layout: 'card-grid',
  };

  const defaultTheme: Partial<ThemeConfig> = {
    primaryColor: '#008080',
    secondaryColor: '#5F284A',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Map Embed Rendering', () => {
    it('should NOT render map iframe when showMap is false', () => {
      const { container } = render(
        <ContactBlock
          props={{ ...defaultProps, showMap: false }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeNull();
    });

    it('should render map iframe when showMap is true and address exists (preview mode)', () => {
      const { container } = render(
        <ContactBlock
          props={{ ...defaultProps, showMap: true }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).not.toBeNull();
    });

    it('should have correct iframe attributes', () => {
      const { container } = render(
        <ContactBlock
          props={{ ...defaultProps, showMap: true }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute('loading')).toBe('lazy');
      expect(iframe?.getAttribute('referrerpolicy')).toBe('no-referrer-when-downgrade');
      expect(iframe?.className).toContain('w-full');
      expect(iframe?.className).toContain('h-full');
    });

    it('should have accessible title attribute on iframe', () => {
      const { container } = render(
        <ContactBlock
          props={{ ...defaultProps, showMap: true }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute('title')).toContain('location map');
    });
  });

  describe('Map Embed URL Construction', () => {
    it('should generate correct Google Maps embed URL with encoded address', () => {
      const { container } = render(
        <ContactBlock
          props={{ ...defaultProps, showMap: true }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).not.toBeNull();
      
      const src = iframe?.getAttribute('src');
      expect(src).not.toBeNull();
      
      // Should use Google Maps embed URL format
      expect(src).toContain('https://www.google.com/maps');
      expect(src).toContain('output=embed');
      
      // Should contain encoded placeholder address parts
      // Placeholder address: "123 Healthcare Ave, Medical City, CA 90210"
      expect(src).toContain(encodeURIComponent('123 Healthcare Ave'));
    });

    it('should use output=embed parameter for no-API-key embedding', () => {
      const { container } = render(
        <ContactBlock
          props={{ ...defaultProps, showMap: true }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const iframe = container.querySelector('iframe');
      const src = iframe?.getAttribute('src');
      
      expect(src).toContain('output=embed');
    });
  });

  describe('Map Container Styling', () => {
    it('should wrap iframe in aspect-video container', () => {
      const { container } = render(
        <ContactBlock
          props={{ ...defaultProps, showMap: true }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const iframe = container.querySelector('iframe');
      const parent = iframe?.parentElement;
      
      expect(parent?.className).toContain('aspect-video');
    });

    it('should apply bg-surface-secondary to map container', () => {
      const { container } = render(
        <ContactBlock
          props={{ ...defaultProps, showMap: true }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const iframe = container.querySelector('iframe');
      const parent = iframe?.parentElement;
      
      expect(parent?.className).toContain('bg-surface-secondary');
    });
  });

  describe('Basic Rendering', () => {
    it('should render title and subtitle', () => {
      render(
        <ContactBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      expect(screen.getByText('Contact Us')).toBeInTheDocument();
      expect(screen.getByText('Get in touch with our team')).toBeInTheDocument();
    });

    it('should render contact cards in preview mode', () => {
      render(
        <ContactBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      // Should show placeholder contact info in preview
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Address')).toBeInTheDocument();
      expect(screen.getByText('Hours')).toBeInTheDocument();
    });

    it('should not render phone card when showPhone is false', () => {
      render(
        <ContactBlock
          props={{ ...defaultProps, showPhone: false }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      expect(screen.queryByText('Phone')).not.toBeInTheDocument();
    });

    it('should not render email card when showEmail is false', () => {
      render(
        <ContactBlock
          props={{ ...defaultProps, showEmail: false }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      expect(screen.queryByText('Email')).not.toBeInTheDocument();
    });

    it('should not render address card when showAddress is false', () => {
      render(
        <ContactBlock
          props={{ ...defaultProps, showAddress: false }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      expect(screen.queryByText('Address')).not.toBeInTheDocument();
    });

    it('should not render hours card when showHours is false', () => {
      render(
        <ContactBlock
          props={{ ...defaultProps, showHours: false }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      expect(screen.queryByText('Hours')).not.toBeInTheDocument();
    });
  });

  describe('Theme Application', () => {
    it('should apply theme heading font to title', () => {
      const { container } = render(
        <ContactBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      const headline = container.querySelector('h2');
      expect(headline?.style.fontFamily).toBe('var(--theme-font-heading)');
    });

    it('should apply theme body font to subtitle', () => {
      const { container } = render(
        <ContactBlock
          props={defaultProps}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      // Find the subtitle paragraph (not the label paragraphs in cards)
      const subtitle = Array.from(container.querySelectorAll('p')).find(
        p => p.textContent === 'Get in touch with our team'
      );
      expect(subtitle?.style.fontFamily).toBe('var(--theme-font-body)');
    });
  });

  describe('Layout Variations', () => {
    it('should apply card-grid layout classes', () => {
      const { container } = render(
        <ContactBlock
          props={{ ...defaultProps, layout: 'card-grid' }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      // Find the grid container (has grid classes)
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).not.toBeNull();
    });

    it('should apply horizontal layout classes', () => {
      const { container } = render(
        <ContactBlock
          props={{ ...defaultProps, layout: 'horizontal' }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      // Find the flex container
      const flexContainer = container.querySelector('.flex.flex-wrap');
      expect(flexContainer).not.toBeNull();
    });

    it('should apply vertical layout classes', () => {
      const { container } = render(
        <ContactBlock
          props={{ ...defaultProps, layout: 'vertical' }}
          isPreview={true}
          theme={defaultTheme}
        />
      );

      // Find the space-y container
      const verticalContainer = container.querySelector('.space-y-3');
      expect(verticalContainer).not.toBeNull();
    });
  });
});


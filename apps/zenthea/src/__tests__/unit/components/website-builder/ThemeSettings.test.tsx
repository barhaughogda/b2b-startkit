import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock fetch for upload
global.fetch = vi.fn();

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock LogoCropDialog
vi.mock('@/components/website-builder/LogoCropDialog', () => ({
  LogoCropDialog: () => null,
}));

// Import after mocks
import { ThemeSettings } from '@/components/website-builder/ThemeSettings';
import { DEFAULT_THEME } from '@/lib/website-builder/schema';

describe('ThemeSettings', () => {
  const defaultProps = {
    theme: DEFAULT_THEME,
    onThemeChange: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Website Logo Section', () => {
    it('should render Website Logo section', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Website Logo')).toBeInTheDocument();
    });

    it('should render description text for Website Logo', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(
        screen.getByText(/Upload a rectangular logo.*4:1 aspect ratio.*for your website header and footer/i)
      ).toBeInTheDocument();
    });

    it('should show upload prompt when no logo is set', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Click to upload logo')).toBeInTheDocument();
    });

    it('should display logo preview when headerConfig has logoUrl', () => {
      const headerConfig = {
        variant: 'centered' as const,
        logoUrl: 'https://example.com/custom-logo.png',
      };

      render(<ThemeSettings {...defaultProps} headerConfig={headerConfig} />);

      const img = screen.getByRole('img', { name: /website logo preview/i });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/custom-logo.png');
    });

    it('should call onHeaderConfigChange when logo changes', () => {
      const onHeaderConfigChange = vi.fn();
      const headerConfig = {
        variant: 'centered' as const,
        logoUrl: 'https://example.com/old-logo.png',
      };

      render(
        <ThemeSettings
          {...defaultProps}
          headerConfig={headerConfig}
          onHeaderConfigChange={onHeaderConfigChange}
        />
      );

      // Find and click the remove button
      const buttons = screen.getAllByRole('button');
      const removeButton = buttons.find(
        btn => !btn.textContent?.includes('Replace') && !btn.textContent?.includes('Reset')
      );

      if (removeButton) {
        fireEvent.click(removeButton);
        expect(onHeaderConfigChange).toHaveBeenCalledWith({ logoUrl: undefined });
      }
    });
  });

  describe('Colors Section', () => {
    it('should render Colors section', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Colors')).toBeInTheDocument();
    });

    it('should render Primary Color picker', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Primary Color')).toBeInTheDocument();
    });

    it('should render Secondary Color picker', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Secondary Color')).toBeInTheDocument();
    });

    it('should render Accent Color picker', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Accent Color')).toBeInTheDocument();
    });

    it('should render Background Color picker', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Background Color')).toBeInTheDocument();
    });
  });

  describe('Typography Section', () => {
    it('should render Typography section', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Typography')).toBeInTheDocument();
    });

    it('should render Font Pair selector', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Font Pair')).toBeInTheDocument();
    });

    it('should render Heading Size selector', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Heading Size')).toBeInTheDocument();
    });
  });

  describe('Spacing & Corners Section', () => {
    it('should render Spacing & Corners section', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Spacing & Corners')).toBeInTheDocument();
    });

    it('should render Section Spacing selector', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Section Spacing')).toBeInTheDocument();
    });

    it('should render Corner Radius selector', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByText('Corner Radius')).toBeInTheDocument();
    });
  });

  describe('Section order', () => {
    it('should render Website Logo section before Colors section', () => {
      render(<ThemeSettings {...defaultProps} />);

      const container = screen.getByText('Theme Settings').closest('div')?.parentElement;
      const sections = container?.querySelectorAll('[class*="CardTitle"]');
      
      // Get the text content of the first two Card titles
      const sectionTitles = Array.from(sections || []).map(s => s.textContent);
      
      // Website Logo should come before Colors
      const logoIndex = sectionTitles.findIndex(t => t?.includes('Website Logo'));
      const colorsIndex = sectionTitles.findIndex(t => t?.includes('Colors'));
      
      expect(logoIndex).toBeLessThan(colorsIndex);
    });
  });

  describe('Reset functionality', () => {
    it('should render Reset button', () => {
      render(<ThemeSettings {...defaultProps} />);

      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    it('should call onThemeChange with DEFAULT_THEME when Reset is clicked', () => {
      const onThemeChange = vi.fn();
      render(<ThemeSettings {...defaultProps} onThemeChange={onThemeChange} />);

      fireEvent.click(screen.getByRole('button', { name: /reset/i }));

      expect(onThemeChange).toHaveBeenCalledWith(DEFAULT_THEME);
    });
  });

  describe('Disabled state', () => {
    it('should disable Reset button when disabled', () => {
      render(<ThemeSettings {...defaultProps} disabled={true} />);

      expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
    });
  });
});


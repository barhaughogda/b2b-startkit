import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProviderNavigationFooter } from '@/components/navigation/ProviderNavigationFooter';

describe('ProviderNavigationFooter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Footer Structure', () => {
    it('should render as a fixed footer at the bottom of the screen', () => {
      render(<ProviderNavigationFooter />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0', 'z-[70]');
    });

    it('should have proper background and styling for floating effect', () => {
      render(<ProviderNavigationFooter />);

      const footer = screen.getByRole('contentinfo');
      // Check for actual classes that the component renders
      expect(footer).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0', 'z-[70]', 'flex', 'h-16', 'items-center', 'bg-transparent');
    });
  });

  describe('Theme and Language Settings', () => {
    it('should contain theme toggle in the footer', () => {
      render(<ProviderNavigationFooter />);

      const themeToggle = screen.getByLabelText(/switch to dark theme/i);
      expect(themeToggle).toBeInTheDocument();
    });

    it('should NOT contain language selector in the footer', () => {
      render(<ProviderNavigationFooter />);

      // Language selector should be removed from footer
      const languageSelector = screen.queryByLabelText(/select language/i);
      expect(languageSelector).not.toBeInTheDocument();
    });

    it('should position only theme toggle in the bottom left corner', () => {
      render(<ProviderNavigationFooter />);

      const footer = screen.getByRole('contentinfo');
      const settingsContainer = footer.querySelector('[data-testid="settings-container"]');
      expect(settingsContainer).toHaveClass('flex', 'items-center', 'gap-2', 'px-4');
      
      // Should only contain theme toggle, not language selector
      const themeToggle = screen.getByLabelText(/switch to dark theme/i);
      expect(themeToggle).toBeInTheDocument();
    });
  });

  describe('Footer Layout', () => {
    it('should have proper height and padding', () => {
      render(<ProviderNavigationFooter />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('h-16', 'flex', 'items-center');
    });

    it('should be visible on all pages', () => {
      render(<ProviderNavigationFooter />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('fixed');
    });
  });

  describe('Theme Toggle Styling', () => {
    it('should have theme toggle with same styling as search button', () => {
      render(<ProviderNavigationFooter />);

      const themeToggle = screen.getByLabelText(/switch to dark theme/i);
      expect(themeToggle).toBeInTheDocument();
      
      // Should have same styling as search button: h-10 w-10 rounded-full hover:bg-surface-interactive transition-colors
      expect(themeToggle).toHaveClass('h-10', 'w-10', 'rounded-full', 'hover:bg-surface-interactive', 'transition-colors');
    });
  });
});

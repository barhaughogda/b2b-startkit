import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PageNavVisibilitySettings } from '@/components/website-builder/PageNavVisibilitySettings';
import type { PageConfig } from '@/lib/website-builder/schema';

describe('PageNavVisibilitySettings', () => {
  // Sample pages for testing
  const createMockPages = (): PageConfig[] => [
    {
      id: 'home',
      type: 'home',
      title: 'Home',
      slug: '',
      enabled: true,
      showInHeader: false,
      showInFooter: false,
      blocks: [],
      order: 0,
    },
    {
      id: 'services',
      type: 'services',
      title: 'Services',
      slug: 'services',
      enabled: true,
      showInHeader: true,
      showInFooter: true,
      blocks: [],
      order: 1,
    },
    {
      id: 'team',
      type: 'team',
      title: 'Our Team',
      slug: 'team',
      enabled: true,
      showInHeader: true,
      showInFooter: true,
      blocks: [],
      order: 2,
    },
    {
      id: 'contact',
      type: 'contact',
      title: 'Contact',
      slug: 'contact',
      enabled: false, // Disabled page
      showInHeader: true,
      showInFooter: true,
      blocks: [],
      order: 3,
    },
    {
      id: 'custom-1',
      type: 'custom',
      title: 'About Us',
      slug: 'about',
      enabled: true,
      showInHeader: true,
      showInFooter: false,
      blocks: [],
      order: 10,
    },
    {
      id: 'terms',
      type: 'terms',
      title: 'Terms of Service',
      slug: 'terms',
      enabled: true,
      showInHeader: false,
      showInFooter: true,
      blocks: [],
      order: 100,
    },
    {
      id: 'privacy',
      type: 'privacy',
      title: 'Privacy Policy',
      slug: 'privacy',
      enabled: true,
      showInHeader: false,
      showInFooter: true,
      blocks: [],
      order: 101,
    },
  ];

  const defaultProps = {
    pages: createMockPages(),
    mode: 'header' as const,
    onPagesChange: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header mode', () => {
    it('should render with header mode title and description', () => {
      render(<PageNavVisibilitySettings {...defaultProps} mode="header" />);

      expect(screen.getByText('Header Navigation')).toBeInTheDocument();
      expect(screen.getByText(/choose which pages appear in your site header/i)).toBeInTheDocument();
    });

    it('should show all pages with toggles', () => {
      render(<PageNavVisibilitySettings {...defaultProps} mode="header" />);

      // Check that page titles are visible (using getAllByText for elements that appear multiple times)
      expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('Our Team')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('About Us')).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });

    it('should call onPagesChange with updated showInHeader when toggle is clicked', () => {
      const onPagesChange = vi.fn();
      render(
        <PageNavVisibilitySettings
          {...defaultProps}
          onPagesChange={onPagesChange}
          mode="header"
        />
      );

      // Find the Services toggle (it's currently checked)
      const switches = screen.getAllByRole('switch');
      // Services is the second page in standard pages section
      const servicesSwitch = switches.find(
        (s) => s.getAttribute('aria-label') === 'Show Services in header'
      );
      
      expect(servicesSwitch).toBeInTheDocument();
      if (servicesSwitch) {
        fireEvent.click(servicesSwitch);
      }

      expect(onPagesChange).toHaveBeenCalledTimes(1);
      const updatedPages = onPagesChange.mock.calls[0][0];
      const updatedServices = updatedPages.find((p: PageConfig) => p.id === 'services');
      expect(updatedServices.showInHeader).toBe(false);
    });

    it('should disable toggles for disabled pages', () => {
      render(<PageNavVisibilitySettings {...defaultProps} mode="header" />);

      // Contact page is disabled, its toggle should be disabled
      const contactSwitch = screen.getByRole('switch', {
        name: 'Show Contact in header',
      });
      expect(contactSwitch).toBeDisabled();
    });

    it('should disable toggles for legal pages in header mode', () => {
      render(<PageNavVisibilitySettings {...defaultProps} mode="header" />);

      // Legal pages can't be shown in header
      const termsSwitch = screen.getByRole('switch', {
        name: 'Show Terms of Service in header',
      });
      const privacySwitch = screen.getByRole('switch', {
        name: 'Show Privacy Policy in header',
      });

      expect(termsSwitch).toBeDisabled();
      expect(privacySwitch).toBeDisabled();
    });

    it('should show explanatory text for legal pages', () => {
      render(<PageNavVisibilitySettings {...defaultProps} mode="header" />);

      expect(screen.getAllByText('Legal pages only appear in footer')).toHaveLength(2);
    });

    it('should show explanatory text for disabled pages', () => {
      render(<PageNavVisibilitySettings {...defaultProps} mode="header" />);

      expect(screen.getByText('Page is disabled in Site Settings')).toBeInTheDocument();
    });
  });

  describe('Footer mode', () => {
    it('should render with footer mode title and description', () => {
      render(<PageNavVisibilitySettings {...defaultProps} mode="footer" />);

      expect(screen.getByText('Footer Navigation')).toBeInTheDocument();
      expect(screen.getByText(/choose which pages appear in your site footer/i)).toBeInTheDocument();
    });

    it('should call onPagesChange with updated showInFooter when toggle is clicked', () => {
      const onPagesChange = vi.fn();
      render(
        <PageNavVisibilitySettings
          {...defaultProps}
          onPagesChange={onPagesChange}
          mode="footer"
        />
      );

      // Find the Services toggle
      const servicesSwitch = screen.getByRole('switch', {
        name: 'Show Services in footer',
      });

      fireEvent.click(servicesSwitch);

      expect(onPagesChange).toHaveBeenCalledTimes(1);
      const updatedPages = onPagesChange.mock.calls[0][0];
      const updatedServices = updatedPages.find((p: PageConfig) => p.id === 'services');
      expect(updatedServices.showInFooter).toBe(false);
    });

    it('should NOT disable legal pages in footer mode (they can appear in footer)', () => {
      render(<PageNavVisibilitySettings {...defaultProps} mode="footer" />);

      const termsSwitch = screen.getByRole('switch', {
        name: 'Show Terms of Service in footer',
      });
      const privacySwitch = screen.getByRole('switch', {
        name: 'Show Privacy Policy in footer',
      });

      // Legal pages are enabled for footer
      expect(termsSwitch).not.toBeDisabled();
      expect(privacySwitch).not.toBeDisabled();
    });

    it('should still disable toggles for disabled pages in footer mode', () => {
      render(<PageNavVisibilitySettings {...defaultProps} mode="footer" />);

      const contactSwitch = screen.getByRole('switch', {
        name: 'Show Contact in footer',
      });
      expect(contactSwitch).toBeDisabled();
    });
  });

  describe('Page grouping', () => {
    it('should group pages by type with section headers', () => {
      render(<PageNavVisibilitySettings {...defaultProps} />);

      // Home appears both as section header and page title
      expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Standard Pages')).toBeInTheDocument();
      expect(screen.getByText('Custom Pages')).toBeInTheDocument();
      expect(screen.getByText('Legal Pages')).toBeInTheDocument();
    });

    it('should show Custom badge for custom pages', () => {
      render(<PageNavVisibilitySettings {...defaultProps} />);

      const customBadges = screen.getAllByText('Custom');
      expect(customBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('should show Legal badge for legal pages', () => {
      render(<PageNavVisibilitySettings {...defaultProps} />);

      const legalBadges = screen.getAllByText('Legal');
      expect(legalBadges).toHaveLength(2);
    });
  });

  describe('Disabled state', () => {
    it('should disable all toggles when disabled prop is true', () => {
      render(<PageNavVisibilitySettings {...defaultProps} disabled={true} />);

      const switches = screen.getAllByRole('switch');
      switches.forEach((sw) => {
        expect(sw).toBeDisabled();
      });
    });
  });

  describe('Empty state', () => {
    it('should not render Custom Pages section when no custom pages exist', () => {
      const pagesWithoutCustom = defaultProps.pages.filter(
        (p) => p.type !== 'custom'
      );
      render(
        <PageNavVisibilitySettings
          {...defaultProps}
          pages={pagesWithoutCustom}
        />
      );

      // The Custom Pages heading should not exist
      // Note: We check for exactly "Custom Pages" as the section header
      const headings = screen.getAllByRole('heading', { level: 4 });
      const customPagesHeading = headings.find(
        (h) => h.textContent === 'Custom Pages'
      );
      expect(customPagesHeading).toBeUndefined();
    });
  });
});


import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock child components
vi.mock('@/components/website-builder/headers', () => ({
  HeaderRenderer: ({ config }: { config: { logoUrl?: string } }) => (
    <header data-testid="header-renderer" data-logo-url={config.logoUrl || ''}>
      Header with logo: {config.logoUrl || 'no logo'}
    </header>
  ),
}));

vi.mock('@/components/website-builder/footers', () => ({
  FooterRenderer: ({ logoUrl }: { logoUrl?: string }) => (
    <footer data-testid="footer-renderer" data-logo-url={logoUrl || ''}>
      Footer with logo: {logoUrl || 'no logo'}
    </footer>
  ),
}));

vi.mock('@/components/website-blocks', () => ({
  BlocksRenderer: () => <main data-testid="blocks-renderer">Blocks</main>,
}));

vi.mock('@/components/website-builder/MobileBookingCTA', () => ({
  MobileBookingCTA: () => null,
}));

vi.mock('@/components/website-builder/SkipLinks', () => ({
  SkipLinks: () => null,
}));

vi.mock('@/lib/website-builder/footer-utils', () => ({
  resolveFooterWithPages: (footer: object) => footer,
}));

vi.mock('@/lib/website-builder/theme-utils', () => ({
  getThemeStyles: () => ({}),
  getFontUrl: () => 'https://fonts.googleapis.com/css2?family=Inter',
}));

// Import after mocks
import { TemplateRenderer } from '@/components/website-templates/TemplateRenderer';
import { DEFAULT_THEME } from '@/lib/website-builder/schema';

describe('TemplateRenderer - Logo Precedence', () => {
  const baseProps = {
    templateId: 'classic-stacked' as const,
    header: {
      variant: 'sticky-simple' as const,
      navItems: [],
    },
    footer: {
      variant: 'minimal' as const,
    },
    theme: DEFAULT_THEME,
    blocks: [],
    tenantName: 'Test Clinic',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Logo URL precedence', () => {
    it('should use header.logoUrl when both header.logoUrl and logoUrl prop are provided', () => {
      const headerLogoUrl = 'https://example.com/header-logo.png';
      const brandingLogoUrl = 'https://example.com/branding-logo.png';

      render(
        <TemplateRenderer
          {...baseProps}
          header={{
            ...baseProps.header,
            logoUrl: headerLogoUrl,
          }}
          logoUrl={brandingLogoUrl}
        />
      );

      const header = screen.getByTestId('header-renderer');
      const footer = screen.getByTestId('footer-renderer');

      // Header should use header.logoUrl (the website builder logo)
      expect(header).toHaveAttribute('data-logo-url', headerLogoUrl);
      // Footer should also use header.logoUrl (the website builder logo)
      expect(footer).toHaveAttribute('data-logo-url', headerLogoUrl);
    });

    it('should use logoUrl prop (tenant branding) when header.logoUrl is not set', () => {
      const brandingLogoUrl = 'https://example.com/branding-logo.png';

      render(
        <TemplateRenderer
          {...baseProps}
          header={{
            ...baseProps.header,
            logoUrl: undefined, // No website builder logo set
          }}
          logoUrl={brandingLogoUrl}
        />
      );

      const header = screen.getByTestId('header-renderer');
      const footer = screen.getByTestId('footer-renderer');

      // Both should fall back to tenant branding logo
      expect(header).toHaveAttribute('data-logo-url', brandingLogoUrl);
      expect(footer).toHaveAttribute('data-logo-url', brandingLogoUrl);
    });

    it('should pass empty string when neither logo is set', () => {
      render(
        <TemplateRenderer
          {...baseProps}
          header={{
            ...baseProps.header,
            logoUrl: undefined,
          }}
          logoUrl={undefined}
        />
      );

      const header = screen.getByTestId('header-renderer');
      const footer = screen.getByTestId('footer-renderer');

      expect(header).toHaveAttribute('data-logo-url', '');
      expect(footer).toHaveAttribute('data-logo-url', '');
    });

    it('should use header.logoUrl even when it is an empty string and logoUrl prop is set', () => {
      // Empty string is falsy, so it should fall back to logoUrl prop
      const brandingLogoUrl = 'https://example.com/branding-logo.png';

      render(
        <TemplateRenderer
          {...baseProps}
          header={{
            ...baseProps.header,
            logoUrl: '', // Explicitly empty
          }}
          logoUrl={brandingLogoUrl}
        />
      );

      const header = screen.getByTestId('header-renderer');
      const footer = screen.getByTestId('footer-renderer');

      // Empty string is falsy, so should fall back to branding logo
      expect(header).toHaveAttribute('data-logo-url', brandingLogoUrl);
      expect(footer).toHaveAttribute('data-logo-url', brandingLogoUrl);
    });
  });

  describe('Consistent logo between header and footer', () => {
    it('should pass the same effective logo URL to both header and footer', () => {
      const headerLogoUrl = 'https://example.com/website-logo.png';

      render(
        <TemplateRenderer
          {...baseProps}
          header={{
            ...baseProps.header,
            logoUrl: headerLogoUrl,
          }}
          logoUrl="https://example.com/branding-fallback.png"
        />
      );

      const header = screen.getByTestId('header-renderer');
      const footer = screen.getByTestId('footer-renderer');

      // Both should have the same logo URL
      const headerLogo = header.getAttribute('data-logo-url');
      const footerLogo = footer.getAttribute('data-logo-url');

      expect(headerLogo).toBe(footerLogo);
      expect(headerLogo).toBe(headerLogoUrl);
    });
  });
});


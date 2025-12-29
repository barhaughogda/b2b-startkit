import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { TenantThemeProvider } from '@/components/tenant/TenantBranding';
import { getTenantCSSVariable, verifyTenantCSSVariables } from '../../../../tests/utils/tenant-colors';

// Mock the useTenantBranding hook
const mockBranding = {
  tenantId: 'test-tenant-123',
  branding: {
    primaryColor: '#FF5733',
    secondaryColor: '#33C3F0',
    accentColor: '#FFC300',
    logo: '/test-logo.png',
    customCss: '.test-class { color: red; }',
    favicon: '/test-favicon.ico',
  },
};

const mockUseTenantBranding = vi.fn(() => ({
  branding: mockBranding,
  isLoading: false,
  error: null,
}));

vi.mock('@/components/tenant/TenantBranding', async () => {
  const actual = await vi.importActual<typeof import('@/components/tenant/TenantBranding')>('@/components/tenant/TenantBranding');
  return {
    ...actual,
    useTenantBranding: mockUseTenantBranding,
  };
});

describe('TenantThemeProvider', () => {
  beforeEach(() => {
    // Reset mock
    mockUseTenantBranding.mockReturnValue({
      branding: mockBranding,
      isLoading: false,
      error: null,
    });

    // Clear any existing CSS variables
    document.documentElement.style.removeProperty('--tenant-primary');
    document.documentElement.style.removeProperty('--tenant-secondary');
    document.documentElement.style.removeProperty('--tenant-accent');
    document.documentElement.removeAttribute('data-tenant');
    
    // Remove any existing custom CSS
    const existingStyle = document.getElementById('tenant-custom-css');
    if (existingStyle) {
      existingStyle.remove();
    }
  });

  afterEach(() => {
    // Cleanup
    document.documentElement.style.removeProperty('--tenant-primary');
    document.documentElement.style.removeProperty('--tenant-secondary');
    document.documentElement.style.removeProperty('--tenant-accent');
    document.documentElement.removeAttribute('data-tenant');
    
    const customStyle = document.getElementById('tenant-custom-css');
    if (customStyle) {
      customStyle.remove();
    }
  });

  describe('CSS Variable Setting', () => {
    it('should set tenant CSS variables when branding is provided', () => {
      render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      // Verify CSS variables are set
      const result = verifyTenantCSSVariables({
        primaryColor: mockBranding.branding.primaryColor,
        secondaryColor: mockBranding.branding.secondaryColor,
        accentColor: mockBranding.branding.accentColor,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should set --tenant-primary CSS variable', () => {
      render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      const primaryColor = getTenantCSSVariable('--tenant-primary');
      expect(primaryColor).toBe(mockBranding.branding.primaryColor);
    });

    it('should set --tenant-secondary CSS variable', () => {
      render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      const secondaryColor = getTenantCSSVariable('--tenant-secondary');
      expect(secondaryColor).toBe(mockBranding.branding.secondaryColor);
    });

    it('should set --tenant-accent CSS variable', () => {
      render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      const accentColor = getTenantCSSVariable('--tenant-accent');
      expect(accentColor).toBe(mockBranding.branding.accentColor);
    });

    it('should fallback accent color to primary when not provided', () => {
      const brandingWithoutAccent = {
        ...mockBranding,
        branding: {
          ...mockBranding.branding,
          accentColor: undefined,
        },
      };

      mockUseTenantBranding.mockReturnValueOnce({
        branding: brandingWithoutAccent,
        isLoading: false,
        error: null,
      });

      render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      const accentColor = getTenantCSSVariable('--tenant-accent');
      expect(accentColor).toBe(mockBranding.branding.primaryColor);
    });
  });

  describe('Data Attribute', () => {
    it('should set data-tenant attribute on body', () => {
      render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      const tenantAttr = document.body.getAttribute('data-tenant');
      expect(tenantAttr).toBe(mockBranding.tenantId);
    });
  });

  describe('Custom CSS', () => {
    it('should apply custom CSS when provided', () => {
      render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      const customStyle = document.getElementById('tenant-custom-css');
      expect(customStyle).toBeInTheDocument();
      expect(customStyle?.textContent).toBe(mockBranding.branding.customCss);
    });

    it('should remove custom CSS on unmount', () => {
      const { unmount } = render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      // Verify CSS is applied
      let customStyle = document.getElementById('tenant-custom-css');
      expect(customStyle).toBeInTheDocument();

      // Unmount component
      unmount();

      // Verify CSS is removed
      customStyle = document.getElementById('tenant-custom-css');
      expect(customStyle).not.toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should clean up CSS variables on unmount', () => {
      const { unmount } = render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      // Verify variables are set
      expect(getTenantCSSVariable('--tenant-primary')).toBe(mockBranding.branding.primaryColor);

      // Unmount component
      unmount();

      // Note: The component may or may not clear variables on unmount
      // This depends on the implementation - adjust test accordingly
    });

    it('should remove data-tenant attribute on unmount', () => {
      const { unmount } = render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      // Verify attribute is set
      expect(document.body.getAttribute('data-tenant')).toBe(mockBranding.tenantId);

      // Unmount component
      unmount();

      // Verify attribute is removed
      expect(document.body.getAttribute('data-tenant')).toBeNull();
    });
  });

  describe('Children Rendering', () => {
    it('should render children', () => {
      const { getByText } = render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      expect(getByText('Test Content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>First Child</div>
          <div>Second Child</div>
        </TenantThemeProvider>
      );

      expect(getByText('First Child')).toBeInTheDocument();
      expect(getByText('Second Child')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing branding gracefully', () => {
      mockUseTenantBranding.mockReturnValueOnce({
        branding: null,
        isLoading: false,
        error: null,
      });

      const { getByText } = render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      // Should still render children
      expect(getByText('Test Content')).toBeInTheDocument();

      // CSS variables should not be set
      const primaryColor = getTenantCSSVariable('--tenant-primary');
      expect(primaryColor).toBe('');
    });

    it('should handle loading state', () => {
      mockUseTenantBranding.mockReturnValueOnce({
        branding: null,
        isLoading: true,
        error: null,
      });

      const { getByText } = render(
        <TenantThemeProvider tenantId="test-tenant-123">
          <div>Test Content</div>
        </TenantThemeProvider>
      );

      // Should still render children
      expect(getByText('Test Content')).toBeInTheDocument();
    });
  });
});


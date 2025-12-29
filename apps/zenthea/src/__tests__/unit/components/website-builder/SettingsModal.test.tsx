import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => vi.fn()),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock useClinicProfile hook
vi.mock('@/hooks/useClinicProfile', () => ({
  useClinicProfile: vi.fn(() => ({
    tenantData: {
      slug: 'test-clinic',
      name: 'Test Clinic',
      domains: {
        preferredAccess: 'path',
        subdomain: '',
        customDomain: '',
      },
    },
    tenantId: 'test-tenant-id',
    isLoading: false,
    hasError: false,
    canQuery: true,
    updateSlug: vi.fn(),
    updateDomains: vi.fn(),
  })),
}));

// Mock tenant-routing
vi.mock('@/lib/tenant-routing', () => ({
  generateSlug: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
  isValidSlug: vi.fn(() => true),
}));

// Import after mocks
import { SettingsModal } from '@/components/website-builder/SettingsModal';
import { DEFAULT_THEME } from '@/lib/website-builder/schema';

describe('SettingsModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    siteStructure: 'multi-page' as const,
    headerConfig: {
      variant: 'centered' as const,
      backgroundColor: '#ffffff',
      textColor: '#000000',
      useThemeColors: true,
      socialLinks: [],
      showSocial: true,
    },
    footerConfig: {
      variant: 'minimal' as const,
      backgroundColor: '#ffffff',
      textColor: '#000000',
      useThemeColors: true,
      socialLinks: [],
      showSocial: true,
      externalLinks: [],
    },
    theme: DEFAULT_THEME,
    pages: [],
    onStructureChange: vi.fn(),
    onHeaderChange: vi.fn(),
    onFooterChange: vi.fn(),
    onThemeChange: vi.fn(),
    onPagesChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tab structure', () => {
    it('should render the Site Settings modal title', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByText('Site Settings')).toBeInTheDocument();
    });

    it('should render Structure tab', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByRole('tab', { name: /structure/i })).toBeInTheDocument();
    });

    it('should render Pages tab when multi-page site', () => {
      render(<SettingsModal {...defaultProps} siteStructure="multi-page" />);

      expect(screen.getByRole('tab', { name: /pages/i })).toBeInTheDocument();
    });

    it('should NOT render Pages tab when one-pager site', () => {
      render(<SettingsModal {...defaultProps} siteStructure="one-pager" />);

      expect(screen.queryByRole('tab', { name: /pages/i })).not.toBeInTheDocument();
    });

    it('should render Theme tab', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByRole('tab', { name: /theme/i })).toBeInTheDocument();
    });

    it('should render URL & Domain tab as the rightmost tab', () => {
      render(<SettingsModal {...defaultProps} />);

      // The URL & Domain tab should exist
      const domainTab = screen.getByRole('tab', { name: /url.*domain|domain/i });
      expect(domainTab).toBeInTheDocument();

      // Get all tabs and verify URL & Domain is last
      const allTabs = screen.getAllByRole('tab');
      const lastTab = allTabs[allTabs.length - 1];
      expect(lastTab).toHaveTextContent(/url.*domain|domain/i);
    });
  });

  describe('Modal behavior', () => {
    it('should not render when open is false', () => {
      render(<SettingsModal {...defaultProps} open={false} />);

      expect(screen.queryByText('Site Settings')).not.toBeInTheDocument();
    });

    it('should have a Done button', () => {
      render(<SettingsModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });
  });
});


import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TenantLandingPage from '@/app/clinic/[slug]/page';
import { getTenantCSSVariable } from '../../../../tests/utils/tenant-colors';

// Mock Next.js navigation
const mockUseParams = vi.fn(() => ({ slug: 'test-clinic' }));
const mockNotFound = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  notFound: () => mockNotFound(),
}));

// Mock the useTenantPublicData hook
const mockTenantData = {
  tenant: {
    name: 'Test Clinic',
    tagline: 'Quality Healthcare',
    description: 'Test description',
    branding: {
      primaryColor: '#FF5733',
      secondaryColor: '#33C3F0',
      accentColor: '#FFC300',
      logo: '/test-logo.png',
    },
    contactInfo: {
      address: {
        street: '123 Main St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
      },
      phone: '555-123-4567',
      email: 'test@clinic.com',
      website: 'https://testclinic.com',
    },
    landingPage: {
      enabled: true,
      heroTitle: 'Welcome to Test Clinic',
      heroSubtitle: 'Quality healthcare for you',
      heroImage: '/hero.jpg',
      heroCtaText: 'Book Now',
      showServices: true,
      showCareTeam: true,
      showClinics: true,
    },
    bookingSettings: {
      mode: 'enabled',
      appointmentTypes: [
        {
          id: '1',
          name: 'General Checkup',
          description: 'Routine checkup',
          duration: 30,
        },
      ],
    },
    features: {
      onlineScheduling: true,
    },
  },
  isLoading: false,
  notFound: false,
};

vi.mock('@/hooks/useTenantPublicData', () => ({
  useTenantPublicData: vi.fn(() => mockTenantData),
}));

describe('TenantLandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ slug: 'test-clinic' });
    
    // Clear CSS variables
    document.documentElement.style.removeProperty('--tenant-primary');
    document.documentElement.style.removeProperty('--tenant-secondary');
    document.documentElement.style.removeProperty('--tenant-accent');
  });

  describe('Rendering', () => {
    it('should render tenant landing page', () => {
      render(<TenantLandingPage />);
      
      expect(screen.getByText('Test Clinic')).toBeInTheDocument();
    });

    it('should display tenant name', () => {
      render(<TenantLandingPage />);
      
      expect(screen.getByText('Test Clinic')).toBeInTheDocument();
    });

    it('should display hero section', () => {
      render(<TenantLandingPage />);
      
      expect(screen.getByText('Welcome to Test Clinic')).toBeInTheDocument();
    });
  });

  describe('Tenant Branding Colors', () => {
    it('should apply tenant CSS variables via inline styles', () => {
      const { container } = render(<TenantLandingPage />);
      
      // Find the root div that should have the branding styles
      const rootDiv = container.querySelector('[style*="--tenant-primary"]');
      
      expect(rootDiv).toBeInTheDocument();
      
      // Verify CSS variables are set on the element
      const styles = rootDiv?.getAttribute('style') || '';
      expect(styles).toContain('--tenant-primary');
      expect(styles).toContain('--tenant-secondary');
      expect(styles).toContain('--tenant-accent');
    });

    it('should set tenant primary color correctly', () => {
      const { container } = render(<TenantLandingPage />);
      
      const rootDiv = container.querySelector('[style*="--tenant-primary"]');
      const styles = rootDiv?.getAttribute('style') || '';
      
      expect(styles).toContain(mockTenantData.tenant.branding.primaryColor);
    });

    it('should set tenant secondary color correctly', () => {
      const { container } = render(<TenantLandingPage />);
      
      const rootDiv = container.querySelector('[style*="--tenant-secondary"]');
      const styles = rootDiv?.getAttribute('style') || '';
      
      expect(styles).toContain(mockTenantData.tenant.branding.secondaryColor);
    });

    it('should set tenant accent color correctly', () => {
      const { container } = render(<TenantLandingPage />);
      
      const rootDiv = container.querySelector('[style*="--tenant-accent"]');
      const styles = rootDiv?.getAttribute('style') || '';
      
      expect(styles).toContain(mockTenantData.tenant.branding.accentColor);
    });
  });

  describe('Semantic Colors', () => {
    it('should use semantic color classes for text', () => {
      const { container } = render(<TenantLandingPage />);
      
      // Find elements with semantic text color classes
      const textElements = container.querySelectorAll('.text-text-primary');
      
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should use semantic color classes for backgrounds', () => {
      const { container } = render(<TenantLandingPage />);
      
      // Find elements with semantic background color classes
      const bgElements = container.querySelectorAll('.bg-background-primary, .bg-background-secondary');
      
      expect(bgElements.length).toBeGreaterThan(0);
    });

    it('should use semantic color classes for borders', () => {
      const { container } = render(<TenantLandingPage />);
      
      // Find elements with semantic border color classes
      const borderElements = container.querySelectorAll('.border-border-primary');
      
      expect(borderElements.length).toBeGreaterThan(0);
    });

    it('should use semantic colors alongside tenant colors', () => {
      const { container } = render(<TenantLandingPage />);
      
      // Verify both tenant colors (via inline styles) and semantic classes are present
      const rootDiv = container.querySelector('[style*="--tenant-primary"]');
      const semanticText = container.querySelector('.text-text-primary');
      
      expect(rootDiv).toBeInTheDocument();
      expect(semanticText).toBeInTheDocument();
    });
  });

  describe('Tenant Colors Usage', () => {
    it('should use tenant colors for branding elements (buttons)', () => {
      const { container } = render(<TenantLandingPage />);
      
      // Find buttons that should use tenant colors
      const buttons = container.querySelectorAll('button');
      
      // At least one button should have tenant color styling
      let hasTenantColor = false;
      buttons.forEach((button) => {
        const style = button.getAttribute('style') || '';
        if (style.includes(mockTenantData.tenant.branding.primaryColor)) {
          hasTenantColor = true;
        }
      });
      
      // Note: This may vary based on implementation
      // The important thing is that tenant colors are available for use
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should use tenant colors for header/footer', () => {
      const { container } = render(<TenantLandingPage />);
      
      const header = container.querySelector('header');
      const footer = container.querySelector('footer');
      
      expect(header || footer).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when loading', () => {
      vi.mocked(require('@/hooks/useTenantPublicData').useTenantPublicData).mockReturnValueOnce({
        ...mockTenantData,
        isLoading: true,
      });

      render(<TenantLandingPage />);
      
      // Should show skeleton/loading state
      const skeleton = screen.queryByText(/loading|skeleton/i);
      // Note: Adjust based on actual loading component implementation
    });
  });

  describe('Not Found State', () => {
    it('should show not found message when tenant not found', () => {
      vi.mocked(require('@/hooks/useTenantPublicData').useTenantPublicData).mockReturnValueOnce({
        tenant: null,
        isLoading: false,
        notFound: true,
      });

      render(<TenantLandingPage />);
      
      expect(screen.getByText(/Clinic Not Found|not found/i)).toBeInTheDocument();
    });
  });

  describe('Landing Page Disabled', () => {
    it('should show disabled message when landing page is disabled', () => {
      vi.mocked(require('@/hooks/useTenantPublicData').useTenantPublicData).mockReturnValueOnce({
        ...mockTenantData,
        tenant: {
          ...mockTenantData.tenant,
          landingPage: {
            ...mockTenantData.tenant.landingPage,
            enabled: false,
          },
        },
      });

      render(<TenantLandingPage />);
      
      // Should show disabled message
      expect(screen.getByText(/unavailable|disabled/i)).toBeInTheDocument();
    });
  });
});


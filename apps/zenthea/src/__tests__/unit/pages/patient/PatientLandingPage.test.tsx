import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PatientLandingPage from '@/app/patient/page';
import { verifySemanticColorsNotOverridden } from '../../../../tests/utils/tenant-colors';

// Mock TenantBranding component
vi.mock('@/components/patient/TenantBranding', () => ({
  TenantBranding: ({ tenantId, size, className }: { tenantId: string; size: string; className?: string }) => (
    <div data-testid="tenant-branding" data-tenant-id={tenantId} data-size={size} className={className}>
      Tenant Branding
    </div>
  ),
}));

describe('PatientLandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear any tenant CSS variables that might be set
    document.documentElement.style.removeProperty('--tenant-primary');
    document.documentElement.style.removeProperty('--tenant-secondary');
    document.documentElement.style.removeProperty('--tenant-accent');
  });

  it('should render the landing page', () => {
    render(<PatientLandingPage />);
    expect(screen.getByText(/Your Health/i)).toBeInTheDocument();
  });

  it('should display header with tenant branding', () => {
    render(<PatientLandingPage />);
    const brandingElements = screen.getAllByTestId('tenant-branding');
    expect(brandingElements.length).toBeGreaterThan(0);
  });

  it('should display hero section', () => {
    render(<PatientLandingPage />);
    expect(screen.getByText(/Your Health/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Control/i)).toBeInTheDocument();
    expect(screen.getByText(/Access your medical records/i)).toBeInTheDocument();
  });

  it('should display CTA buttons in hero section', () => {
    render(<PatientLandingPage />);
    const signInButton = screen.getByRole('link', { name: /sign in to portal/i });
    const requestAccessButton = screen.getByRole('link', { name: /request access/i });
    
    expect(signInButton).toBeInTheDocument();
    expect(signInButton).toHaveAttribute('href', '/patient/login');
    expect(requestAccessButton).toBeInTheDocument();
    expect(requestAccessButton).toHaveAttribute('href', '/patient/register');
  });

  it('should display features section', () => {
    render(<PatientLandingPage />);
    expect(screen.getByText(/Everything You Need for Your Healthcare/i)).toBeInTheDocument();
  });

  it('should display all feature cards', () => {
    render(<PatientLandingPage />);
    expect(screen.getByText('Health Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Medical Records')).toBeInTheDocument();
    expect(screen.getByText('Appointment Management')).toBeInTheDocument();
    expect(screen.getByText('Secure Messaging')).toBeInTheDocument();
    expect(screen.getByText('Profile Management')).toBeInTheDocument();
    expect(screen.getByText('Privacy & Security')).toBeInTheDocument();
  });

  it('should display security section', () => {
    render(<PatientLandingPage />);
    expect(screen.getByText(/Your Privacy is Our Priority/i)).toBeInTheDocument();
    expect(screen.getByText(/HIPAA Compliant/i)).toBeInTheDocument();
    expect(screen.getByText(/256-bit Encryption/i)).toBeInTheDocument();
    expect(screen.getByText(/Secure Authentication/i)).toBeInTheDocument();
  });

  it('should display footer', () => {
    render(<PatientLandingPage />);
    expect(screen.getByText(/© 2024 Medical Practice/i)).toBeInTheDocument();
  });

  it('should display navigation links in header', () => {
    render(<PatientLandingPage />);
    const signInLink = screen.getByRole('link', { name: /sign in/i });
    const getStartedLink = screen.getByRole('link', { name: /get started/i });
    
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/patient/login');
    expect(getStartedLink).toBeInTheDocument();
    expect(getStartedLink).toHaveAttribute('href', '/patient/register');
  });

  describe('Semantic Colors', () => {
    it('should use semantic color classes for text elements', () => {
      const { container } = render(<PatientLandingPage />);
      
      // Find elements with semantic text color classes
      const textElements = container.querySelectorAll('.text-text-primary, .text-text-secondary');
      
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should use semantic color classes for backgrounds', () => {
      const { container } = render(<PatientLandingPage />);
      
      // Find elements with semantic background color classes
      const bgElements = container.querySelectorAll('.bg-background-primary, .bg-background-secondary');
      
      expect(bgElements.length).toBeGreaterThan(0);
    });

    it('should preserve semantic colors even if tenant colors are present', () => {
      // Set tenant colors to simulate tenant context
      document.documentElement.style.setProperty('--tenant-primary', '#FF5733');
      document.documentElement.style.setProperty('--tenant-secondary', '#33C3F0');
      
      const { container } = render(<PatientLandingPage />);
      
      // Find a semantic text element
      const textElement = container.querySelector('.text-text-primary') as HTMLElement;
      
      if (textElement) {
        const result = verifySemanticColorsNotOverridden(
          textElement,
          '#FF5733' // Tenant primary color - should NOT be used for semantic elements
        );
        
        // Semantic colors should not be overridden by tenant colors
        expect(result.valid).toBe(true);
      }
    });
  });
});


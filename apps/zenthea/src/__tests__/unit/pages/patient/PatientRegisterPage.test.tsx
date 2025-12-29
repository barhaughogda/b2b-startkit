import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PatientRegisterPage from '@/app/patient/register/page';
import { verifySemanticColorsNotOverridden } from '../../../../tests/utils/tenant-colors';

// Mock TenantBranding component
vi.mock('@/components/patient/TenantBranding', () => ({
  TenantBranding: ({ tenantId, size, className }: { tenantId: string; size: string; className?: string }) => (
    <div data-testid="tenant-branding" data-tenant-id={tenantId} data-size={size} className={className}>
      Tenant Branding
    </div>
  ),
}));

// Mock PatientRegistrationForm component
vi.mock('@/components/patient/PatientRegistrationForm', () => ({
  PatientRegistrationForm: ({ tenantId, redirectTo }: { tenantId: string; redirectTo: string }) => (
    <div data-testid="patient-registration-form" data-tenant-id={tenantId} data-redirect-to={redirectTo}>
      Patient Registration Form
    </div>
  ),
}));

describe('PatientRegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear any tenant CSS variables that might be set
    document.documentElement.style.removeProperty('--tenant-primary');
    document.documentElement.style.removeProperty('--tenant-secondary');
    document.documentElement.style.removeProperty('--tenant-accent');
  });

  it('should render the registration page', () => {
    render(<PatientRegisterPage />);
    expect(screen.getByText('Patient Portal Registration')).toBeInTheDocument();
  });

  it('should display tenant branding', () => {
    render(<PatientRegisterPage />);
    const branding = screen.getByTestId('tenant-branding');
    expect(branding).toBeInTheDocument();
    expect(branding).toHaveAttribute('data-tenant-id', 'demo-tenant');
    expect(branding).toHaveAttribute('data-size', 'lg');
  });

  it('should display page title and description', () => {
    render(<PatientRegisterPage />);
    expect(screen.getByText('Patient Portal Registration')).toBeInTheDocument();
    expect(screen.getByText(/Create your account to access your medical records/i)).toBeInTheDocument();
  });

  it('should render PatientRegistrationForm', () => {
    render(<PatientRegisterPage />);
    const registrationForm = screen.getByTestId('patient-registration-form');
    expect(registrationForm).toBeInTheDocument();
    expect(registrationForm).toHaveAttribute('data-tenant-id', 'demo-tenant');
    expect(registrationForm).toHaveAttribute('data-redirect-to', '/patient/login?message=registration-success');
  });

  it('should display sign in link', () => {
    render(<PatientRegisterPage />);
    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/patient/login');
  });

  it('should display support link', () => {
    render(<PatientRegisterPage />);
    const supportLink = screen.getByRole('link', { name: /contact support/i });
    expect(supportLink).toBeInTheDocument();
    expect(supportLink).toHaveAttribute('href', '/patient/support');
  });

  it('should display navigation links', () => {
    render(<PatientRegisterPage />);
    expect(screen.getByText(/Already have an account/i)).toBeInTheDocument();
    expect(screen.getByText(/Having trouble/i)).toBeInTheDocument();
  });

  describe('Semantic Colors', () => {
    it('should use semantic color classes for text elements', () => {
      const { container } = render(<PatientRegisterPage />);
      
      // Find elements with semantic text color classes
      const textElements = container.querySelectorAll('.text-text-primary, .text-text-secondary');
      
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should preserve semantic colors even if tenant colors are present', () => {
      // Set tenant colors to simulate tenant context
      document.documentElement.style.setProperty('--tenant-primary', '#FF5733');
      document.documentElement.style.setProperty('--tenant-secondary', '#33C3F0');
      
      const { container } = render(<PatientRegisterPage />);
      
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


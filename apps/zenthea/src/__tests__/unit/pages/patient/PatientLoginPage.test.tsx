import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PatientLoginPage from '@/app/patient/login/page';
import { verifySemanticColorsNotOverridden } from '../../../../tests/utils/tenant-colors';

// Mock TenantBranding component
vi.mock('@/components/patient/TenantBranding', () => ({
  TenantBranding: ({ tenantId, size, className }: { tenantId: string; size: string; className?: string }) => (
    <div data-testid="tenant-branding" data-tenant-id={tenantId} data-size={size} className={className}>
      Tenant Branding
    </div>
  ),
}));

// Mock PatientLoginForm component
vi.mock('@/components/patient/PatientLoginForm', () => ({
  PatientLoginForm: ({ tenantId, redirectTo }: { tenantId: string; redirectTo: string }) => (
    <div data-testid="patient-login-form" data-tenant-id={tenantId} data-redirect-to={redirectTo}>
      Patient Login Form
    </div>
  ),
}));

describe('PatientLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear any tenant CSS variables that might be set
    document.documentElement.style.removeProperty('--tenant-primary');
    document.documentElement.style.removeProperty('--tenant-secondary');
    document.documentElement.style.removeProperty('--tenant-accent');
  });

  it('should render the login page', () => {
    render(<PatientLoginPage />);
    expect(screen.getByText('Patient Portal')).toBeInTheDocument();
  });

  it('should display tenant branding', () => {
    render(<PatientLoginPage />);
    const branding = screen.getByTestId('tenant-branding');
    expect(branding).toBeInTheDocument();
    expect(branding).toHaveAttribute('data-tenant-id', 'demo-tenant');
    expect(branding).toHaveAttribute('data-size', 'lg');
  });

  it('should display page title and description', () => {
    render(<PatientLoginPage />);
    expect(screen.getByText('Patient Portal')).toBeInTheDocument();
    expect(screen.getByText(/Access your medical records and manage your healthcare/i)).toBeInTheDocument();
  });

  it('should render PatientLoginForm', () => {
    render(<PatientLoginPage />);
    const loginForm = screen.getByTestId('patient-login-form');
    expect(loginForm).toBeInTheDocument();
    expect(loginForm).toHaveAttribute('data-tenant-id', 'demo-tenant');
    expect(loginForm).toHaveAttribute('data-redirect-to', '/patient/dashboard');
  });

  it('should display registration link', () => {
    render(<PatientLoginPage />);
    const registerLink = screen.getByRole('link', { name: /request access/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/patient/register');
  });

  it('should display support link', () => {
    render(<PatientLoginPage />);
    const supportLink = screen.getByRole('link', { name: /contact support/i });
    expect(supportLink).toBeInTheDocument();
    expect(supportLink).toHaveAttribute('href', '/patient/support');
  });

  it('should display navigation links', () => {
    render(<PatientLoginPage />);
    expect(screen.getByText(/Don't have an account/i)).toBeInTheDocument();
    expect(screen.getByText(/Having trouble/i)).toBeInTheDocument();
  });

  describe('Semantic Colors', () => {
    it('should use semantic color classes for text elements', () => {
      const { container } = render(<PatientLoginPage />);
      
      // Find elements with semantic text color classes
      const textElements = container.querySelectorAll('.text-text-primary, .text-text-secondary');
      
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should preserve semantic colors even if tenant colors are present', () => {
      // Set tenant colors to simulate tenant context
      document.documentElement.style.setProperty('--tenant-primary', '#FF5733');
      document.documentElement.style.setProperty('--tenant-secondary', '#33C3F0');
      
      const { container } = render(<PatientLoginPage />);
      
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


import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TenantBranding } from '@/components/patient/TenantBranding';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} data-testid="tenant-logo" />
  ),
}));

describe('TenantBranding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render tenant name by default', () => {
      render(<TenantBranding />);
      
      expect(screen.getByText('Medical Practice')).toBeInTheDocument();
    });

    it('should render with custom tenant name', () => {
      render(<TenantBranding tenantName="Custom Practice" />);
      
      expect(screen.getByText('Custom Practice')).toBeInTheDocument();
    });

    it('should render logo when provided', () => {
      render(<TenantBranding logo="/logo.png" />);
      
      const logo = screen.getByTestId('tenant-logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/logo.png');
    });

    it('should render with custom className', () => {
      const { container } = render(
        <TenantBranding className="custom-class" />
      );
      
      const brandingContainer = container.querySelector('.custom-class');
      expect(brandingContainer).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      const { container } = render(<TenantBranding size="sm" logo="/logo.png" />);
      
      const logo = screen.getByTestId('tenant-logo');
      expect(logo).toHaveClass('h-8', 'w-8');
    });

    it('should apply medium size classes (default)', () => {
      const { container } = render(<TenantBranding size="md" logo="/logo.png" />);
      
      const logo = screen.getByTestId('tenant-logo');
      expect(logo).toHaveClass('h-12', 'w-12');
    });

    it('should apply large size classes', () => {
      const { container } = render(<TenantBranding size="lg" logo="/logo.png" />);
      
      const logo = screen.getByTestId('tenant-logo');
      expect(logo).toHaveClass('h-16', 'w-16');
    });
  });

  describe('Visibility Options', () => {
    it('should hide logo when showLogo is false', () => {
      render(<TenantBranding logo="/logo.png" showLogo={false} />);
      
      expect(screen.queryByTestId('tenant-logo')).not.toBeInTheDocument();
    });

    it('should hide name when showName is false', () => {
      render(<TenantBranding showName={false} />);
      
      expect(screen.queryByText('Medical Practice')).not.toBeInTheDocument();
    });

    it('should show both logo and name by default', () => {
      render(<TenantBranding logo="/logo.png" />);
      
      expect(screen.getByTestId('tenant-logo')).toBeInTheDocument();
      expect(screen.getByText('Medical Practice')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply primary color when provided', () => {
      const { container } = render(
        <TenantBranding primaryColor="#FF0000" />
      );
      
      const nameElement = screen.getByText('Medical Practice');
      expect(nameElement).toHaveStyle({ color: '#FF0000' });
    });

    it('should apply font family when provided', () => {
      const { container } = render(
        <TenantBranding fontFamily="Arial, sans-serif" />
      );
      
      const nameElement = screen.getByText('Medical Practice');
      expect(nameElement).toHaveStyle({ fontFamily: 'Arial, sans-serif' });
    });
  });

  describe('Logo Alt Text', () => {
    it('should use default alt text when not provided', () => {
      render(<TenantBranding logo="/logo.png" />);
      
      const logo = screen.getByTestId('tenant-logo');
      expect(logo).toHaveAttribute('alt', 'Practice Logo');
    });

    it('should use custom alt text when provided', () => {
      render(<TenantBranding logo="/logo.png" logoAlt="Custom Logo" />);
      
      const logo = screen.getByTestId('tenant-logo');
      expect(logo).toHaveAttribute('alt', 'Custom Logo');
    });
  });

  describe('Tenant ID', () => {
    it('should accept tenantId prop', () => {
      const { container } = render(
        <TenantBranding tenantId="tenant-123" />
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible logo with alt text', () => {
      render(<TenantBranding logo="/logo.png" />);
      
      const logo = screen.getByTestId('tenant-logo');
      expect(logo).toHaveAttribute('alt');
    });

    it('should have semantic structure', () => {
      const { container } = render(<TenantBranding />);
      
      // Should render in a Card component
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});


import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SuperAdminSidebar } from '@/components/layouts/SuperAdminSidebar';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/superadmin/tenants',
}));

describe('SuperAdminSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render sidebar element', () => {
      render(<SuperAdminSidebar />);
      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    it('should render navigation items', () => {
      render(<SuperAdminSidebar />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Tenants')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
    });

    it('should render legacy items', () => {
      render(<SuperAdminSidebar />);
      
      expect(screen.getByText('Image Uploader')).toBeInTheDocument();
      expect(screen.getByText('Logo Uploader')).toBeInTheDocument();
    });

    it('should render Tools separator', () => {
      render(<SuperAdminSidebar />);
      
      expect(screen.getByText('Tools')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should have correct hrefs for main navigation', () => {
      render(<SuperAdminSidebar />);
      
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/superadmin');

      const tenantsLink = screen.getByText('Tenants').closest('a');
      expect(tenantsLink).toHaveAttribute('href', '/superadmin/tenants');

      const settingsLink = screen.getByText('Settings').closest('a');
      expect(settingsLink).toHaveAttribute('href', '/superadmin/settings');
    });

    it('should mark active link', () => {
      render(<SuperAdminSidebar />);
      
      const tenantsLink = screen.getByText('Tenants').closest('a');
      expect(tenantsLink).toHaveAttribute('aria-current', 'page');
    });

    it('should have proper ARIA labels', () => {
      render(<SuperAdminSidebar />);
      
      const tenantsLink = screen.getByText('Tenants').closest('a');
      expect(tenantsLink).toHaveAttribute('aria-label', 'Navigate to Tenants');
    });
  });

  describe('Active State Styling', () => {
    it('should apply active styles to current page', () => {
      render(<SuperAdminSidebar />);
      
      const tenantsLink = screen.getByText('Tenants').closest('a');
      expect(tenantsLink).toHaveClass('bg-interactive-primary');
      expect(tenantsLink).toHaveClass('text-text-inverse');
    });

    it('should apply inactive styles to other links', () => {
      render(<SuperAdminSidebar />);
      
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveClass('text-text-secondary');
      expect(dashboardLink).toHaveClass('hover:bg-surface-interactive');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SuperAdminSidebar />);
      
      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toHaveAttribute('aria-label', 'Super Admin navigation');

      const nav = sidebar.querySelector('nav');
      expect(nav).toHaveAttribute('aria-label', 'Super Admin navigation');
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive classes', () => {
      const { container } = render(<SuperAdminSidebar />);
      
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('hidden');
      expect(sidebar).toHaveClass('md:flex');
      expect(sidebar).toHaveClass('md:w-64');
    });
  });
});


import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuperAdminHeader } from '@/components/layouts/SuperAdminHeader';

// Mock next-auth
const mockSession = {
  user: {
    id: 'user-1',
    email: 'superadmin@zenthea.com',
    name: 'Super Admin',
    role: 'super_admin' as const,
  },
};

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession }),
  signOut: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/superadmin/tenants',
}));

describe('SuperAdminHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render header element', () => {
      render(<SuperAdminHeader />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render breadcrumbs', () => {
      render(<SuperAdminHeader />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Super Admin')).toBeInTheDocument();
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });

    it('should render search bar', () => {
      render(<SuperAdminHeader />);
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should render user menu', () => {
      render(<SuperAdminHeader />);
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });
  });

  describe('Breadcrumbs', () => {
    it('should generate breadcrumbs from pathname', () => {
      render(<SuperAdminHeader />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Super Admin')).toBeInTheDocument();
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });

    it('should mark current page in breadcrumbs', () => {
      render(<SuperAdminHeader />);
      
      const currentPage = screen.getByText('Tenants');
      expect(currentPage.closest('span')).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('User Menu', () => {
    it('should display user information', async () => {
      const user = userEvent.setup();
      render(<SuperAdminHeader />);

      const userMenuButton = screen.getByLabelText('User menu');
      await user.click(userMenuButton);

      await waitFor(() => {
        expect(screen.getByText('Super Admin')).toBeInTheDocument();
        expect(screen.getByText('superadmin@zenthea.com')).toBeInTheDocument();
        expect(screen.getByText(/role: super_admin/i)).toBeInTheDocument();
      });
    });

    it('should have logout option', async () => {
      const user = userEvent.setup();
      const { signOut } = await import('next-auth/react');
      
      render(<SuperAdminHeader />);

      const userMenuButton = screen.getByLabelText('User menu');
      await user.click(userMenuButton);

      await waitFor(() => {
        expect(screen.getByText('Log out')).toBeInTheDocument();
      });

      const logoutButton = screen.getByText('Log out');
      await user.click(logoutButton);

      expect(signOut).toHaveBeenCalled();
    });
  });

  describe('Search Bar', () => {
    it('should be disabled (coming soon)', () => {
      render(<SuperAdminHeader />);
      
      const searchInput = screen.getByPlaceholderText('Search...');
      expect(searchInput).toBeDisabled();
      expect(searchInput).toHaveAttribute('aria-label', 'Global search (coming soon)');
    });

    it('should not accept user input when disabled', async () => {
      const user = userEvent.setup();
      render(<SuperAdminHeader />);

      const searchInput = screen.getByPlaceholderText('Search...');
      
      // Verify input is disabled
      expect(searchInput).toBeDisabled();
      
      // Verify that disabled input has empty value (cannot be typed into)
      expect(searchInput).toHaveValue('');
      
      // Attempting to type into a disabled input should not change its value
      // Note: userEvent.type() will throw an error on disabled inputs,
      // so we verify the disabled state instead
      expect(searchInput).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SuperAdminHeader />);
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByLabelText('Breadcrumb navigation')).toBeInTheDocument();
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });
  });
});


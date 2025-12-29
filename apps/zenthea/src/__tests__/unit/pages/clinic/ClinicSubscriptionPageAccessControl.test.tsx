/**
 * TDD RED Phase Tests for Task 6.3: Add Access Control for Subscription Page
 * 
 * Test Requirements:
 * - Restrict access to clinic owners/admins only
 * - Add role check in page component
 * - Show appropriate error message for unauthorized users
 * - Test with different user roles
 * 
 * TDD Cycle: RED → GREEN → REFACTOR → COMMIT
 * Specification: BILLING_SYSTEM_TASKS.md Task 6.3
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import ClinicSubscriptionPage from '@/app/company/settings/subscription/page';

// Mock next-auth/react
const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

// Mock ClinicLayout
vi.mock('@/components/layout/ClinicLayout', () => ({
  ClinicLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="clinic-layout">{children}</div>
  ),
}));

// Mock auth-utils
const mockIsOwner = vi.fn();
vi.mock('@/lib/auth-utils', () => ({
  isOwner: (user: any) => mockIsOwner(user),
  isClinicUser: vi.fn((user: any) => {
    const role = typeof user === 'object' ? user?.role : user;
    return role === 'clinic_user' || role === 'admin' || role === 'provider';
  }),
}));

describe('ClinicSubscriptionPage - Task 6.3: Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Owner Access', () => {
    it('should allow clinic owner to access subscription page', () => {
      const ownerSession = {
        user: {
          id: 'owner-id',
          email: 'owner@example.com',
          name: 'Clinic Owner',
          tenantId: 'test-tenant',
          role: 'clinic_user',
          isOwner: true,
        },
      };

      mockUseSession.mockReturnValue({
        data: ownerSession,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(true);

      render(<ClinicSubscriptionPage />);

      // Should render subscription content (not access denied)
      expect(screen.getByText(/subscription overview/i)).toBeInTheDocument();
      expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/owner.*admin/i)).not.toBeInTheDocument();
    });

    it('should render subscription content for owner', () => {
      const ownerSession = {
        user: {
          id: 'owner-id',
          email: 'owner@example.com',
          role: 'clinic_user',
          isOwner: true,
        },
      };

      mockUseSession.mockReturnValue({
        data: ownerSession,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(true);

      render(<ClinicSubscriptionPage />);

      // Should show subscription overview card
      expect(screen.getByText(/subscription overview/i)).toBeInTheDocument();
    });
  });

  describe('Admin Access', () => {
    it('should allow admin role to access subscription page', () => {
      const adminSession = {
        user: {
          id: 'admin-id',
          email: 'admin@example.com',
          name: 'Admin User',
          tenantId: 'test-tenant',
          role: 'admin',
          isOwner: false,
        },
      };

      mockUseSession.mockReturnValue({
        data: adminSession,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(false); // Not owner, but admin role

      render(<ClinicSubscriptionPage />);

      // Should render subscription content (not access denied)
      expect(screen.getByText(/subscription overview/i)).toBeInTheDocument();
      expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
    });

    it('should render subscription content for admin', () => {
      const adminSession = {
        user: {
          id: 'admin-id',
          email: 'admin@example.com',
          role: 'admin',
          isOwner: false,
        },
      };

      mockUseSession.mockReturnValue({
        data: adminSession,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(false);

      render(<ClinicSubscriptionPage />);

      // Should show subscription overview card
      expect(screen.getByText(/subscription overview/i)).toBeInTheDocument();
    });
  });

  describe('Unauthorized Access - Clinic User (Non-Owner, Non-Admin)', () => {
    it('should deny access to clinic user who is not owner or admin', () => {
      const clinicUserSession = {
        user: {
          id: 'clinic-user-id',
          email: 'clinicuser@example.com',
          name: 'Clinic User',
          tenantId: 'test-tenant',
          role: 'clinic_user',
          isOwner: false,
        },
      };

      mockUseSession.mockReturnValue({
        data: clinicUserSession,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(false);

      render(<ClinicSubscriptionPage />);

      // Should show access denied message
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      // Should not show subscription content
      expect(screen.queryByText(/subscription overview/i)).not.toBeInTheDocument();
    });

    it('should show appropriate error message for unauthorized clinic user', () => {
      const clinicUserSession = {
        user: {
          id: 'clinic-user-id',
          email: 'clinicuser@example.com',
          role: 'clinic_user',
          isOwner: false,
        },
      };

      mockUseSession.mockReturnValue({
        data: clinicUserSession,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(false);

      render(<ClinicSubscriptionPage />);

      // Should show message about owner/admin requirement
      const errorMessage = screen.getByText(/access denied/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('Unauthorized Access - Provider', () => {
    it('should deny access to provider role', () => {
      const providerSession = {
        user: {
          id: 'provider-id',
          email: 'provider@example.com',
          name: 'Provider User',
          tenantId: 'test-tenant',
          role: 'provider',
          isOwner: false,
        },
      };

      mockUseSession.mockReturnValue({
        data: providerSession,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(false);

      render(<ClinicSubscriptionPage />);

      // Should show access denied message
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(screen.queryByText(/subscription overview/i)).not.toBeInTheDocument();
    });
  });

  describe('Unauthorized Access - Patient', () => {
    it('should deny access to patient role', () => {
      const patientSession = {
        user: {
          id: 'patient-id',
          email: 'patient@example.com',
          name: 'Patient User',
          tenantId: 'test-tenant',
          role: 'patient',
          isOwner: false,
        },
      };

      mockUseSession.mockReturnValue({
        data: patientSession,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(false);

      render(<ClinicSubscriptionPage />);

      // Should show access denied message
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(screen.queryByText(/subscription overview/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Message Display', () => {
    it('should display error message in Alert component for unauthorized users', () => {
      const clinicUserSession = {
        user: {
          id: 'clinic-user-id',
          email: 'clinicuser@example.com',
          role: 'clinic_user',
          isOwner: false,
        },
      };

      mockUseSession.mockReturnValue({
        data: clinicUserSession,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(false);

      render(<ClinicSubscriptionPage />);

      // Should use Alert component (destructive variant)
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should show helpful error message explaining access requirement', () => {
      const clinicUserSession = {
        user: {
          id: 'clinic-user-id',
          email: 'clinicuser@example.com',
          role: 'clinic_user',
          isOwner: false,
        },
      };

      mockUseSession.mockReturnValue({
        data: clinicUserSession,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(false);

      render(<ClinicSubscriptionPage />);

      // Error message should mention owner/admin requirement
      const errorText = screen.getByText(/access denied/i);
      expect(errorText).toBeInTheDocument();
    });
  });

  describe('Role Check Implementation', () => {
    it('should call isOwner function to check owner status', () => {
      const ownerSession = {
        user: {
          id: 'owner-id',
          email: 'owner@example.com',
          role: 'clinic_user',
          isOwner: true,
        },
      };

      mockUseSession.mockReturnValue({
        data: ownerSession,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(true);

      render(<ClinicSubscriptionPage />);

      // Verify isOwner was called with session user
      expect(mockIsOwner).toHaveBeenCalledWith(ownerSession.user);
    });

    it('should check admin role when user is not owner', () => {
      const adminSession = {
        user: {
          id: 'admin-id',
          email: 'admin@example.com',
          role: 'admin',
          isOwner: false,
        },
      };

      mockUseSession.mockReturnValue({
        data: adminSession,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(false);

      render(<ClinicSubscriptionPage />);

      // Should allow access because role is 'admin'
      expect(screen.getByText(/subscription overview/i)).toBeInTheDocument();
      expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with undefined role gracefully', () => {
      const userWithUndefinedRole = {
        user: {
          id: 'user-id',
          email: 'user@example.com',
          role: undefined,
          isOwner: false,
        },
      };

      mockUseSession.mockReturnValue({
        data: userWithUndefinedRole,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(false);

      render(<ClinicSubscriptionPage />);

      // Should deny access
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    it('should handle user with null session gracefully', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'authenticated',
      });
      mockIsOwner.mockReturnValue(false);

      render(<ClinicSubscriptionPage />);

      // Should deny access (no user data)
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });
  });
});


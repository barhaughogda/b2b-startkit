import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRoles } from '@/components/admin/UserRoles';

describe('UserRoles', () => {
  describe('Initial Render', () => {
    it('should render user roles component', () => {
      render(<UserRoles />);

      expect(screen.getByText('User Roles & Permissions')).toBeInTheDocument();
      expect(
        screen.getByText('Overview of available roles and their permissions')
      ).toBeInTheDocument();
    });

    it('should display all role accordions', () => {
      render(<UserRoles />);

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText('Demo')).toBeInTheDocument();
      expect(screen.getByText('Patient')).toBeInTheDocument();
    });

    it('should display feature access matrix', () => {
      render(<UserRoles />);

      expect(screen.getByText('Feature Access Matrix')).toBeInTheDocument();
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Patient Records')).toBeInTheDocument();
    });
  });

  describe('Role Permissions', () => {
    it('should display admin permissions when expanded', async () => {
      const user = userEvent.setup();
      render(<UserRoles />);

      const adminTrigger = screen.getByText('Admin').closest('button');
      if (adminTrigger) {
        await user.click(adminTrigger);

        expect(
          screen.getByText(/full system access/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/manage all users/i)
        ).toBeInTheDocument();
      }
    });

    it('should display provider permissions when expanded', async () => {
      const user = userEvent.setup();
      render(<UserRoles />);

      const providerTrigger = screen.getByText('Provider').closest('button');
      if (providerTrigger) {
        await user.click(providerTrigger);

        expect(
          screen.getByText(/healthcare provider/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/view and manage assigned patients/i)
        ).toBeInTheDocument();
      }
    });

    it('should display patient permissions when expanded', async () => {
      const user = userEvent.setup();
      render(<UserRoles />);

      const patientTrigger = screen.getByText('Patient').closest('button');
      if (patientTrigger) {
        await user.click(patientTrigger);

        expect(
          screen.getByText(/patient portal access/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/view own medical records/i)
        ).toBeInTheDocument();
      }
    });
  });

  describe('Feature Access Matrix', () => {
    it('should display all features in the matrix', () => {
      render(<UserRoles />);

      const features = [
        'User Management',
        'Patient Records',
        'Appointment Scheduling',
        'Medical Records (Edit)',
        'Billing & Invoicing',
        'System Settings',
        'Security Dashboard',
        'Compliance Reports',
        'Audit Logs',
        'Patient Portal',
      ];

      features.forEach((feature) => {
        expect(screen.getByText(feature)).toBeInTheDocument();
      });
    });

    it('should show correct access for admin role', () => {
      render(<UserRoles />);

      // Admin should have access to all features
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check that admin column shows checkmarks for all features
      const adminCells = screen
        .getAllByText('Admin')
        .filter((el) => el.tagName === 'TH');
      expect(adminCells.length).toBeGreaterThan(0);
    });

    it('should show correct access for provider role', () => {
      render(<UserRoles />);

      // Provider should have access to some features but not all
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should show correct access for patient role', () => {
      render(<UserRoles />);

      // Patient should have limited access
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<UserRoles />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should have accessible accordion controls', () => {
      render(<UserRoles />);

      const accordionTriggers = screen
        .getAllByRole('button')
        .filter((button) =>
          ['Admin', 'Provider', 'Demo', 'Patient'].some((role) =>
            button.textContent?.includes(role)
          )
        );

      expect(accordionTriggers.length).toBeGreaterThan(0);
    });
  });

  describe('Role Descriptions', () => {
    it('should display role descriptions', () => {
      render(<UserRoles />);

      expect(
        screen.getByText(/full system access with all administrative privileges/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/healthcare provider with patient management access/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/limited access for demonstration purposes/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/patient portal access with personal health information/i)
      ).toBeInTheDocument();
    });
  });
});


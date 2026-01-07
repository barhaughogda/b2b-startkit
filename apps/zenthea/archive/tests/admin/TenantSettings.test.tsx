import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantSettings } from '@/components/admin/TenantSettings';

// Mock fetch
global.fetch = vi.fn();

const mockTenantSettings = {
  branding: {
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    accentColor: '#10b981',
  },
  features: {
    onlineScheduling: true,
    telehealth: false,
    prescriptionRefills: true,
    labResults: true,
    messaging: true,
    billing: false,
    patientPortal: true,
    mobileApp: false,
  },
  subscription: {
    plan: 'demo' as const,
    status: 'active' as const,
    maxUsers: 10,
    maxPatients: 100,
  },
  contactInfo: {
    phone: '555-1234',
    email: 'contact@example.com',
    website: 'https://example.com',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
    },
  },
};

describe('TenantSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTenantSettings,
      }),
    });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      render(<TenantSettings />);
      expect(screen.getByText('Tenant Settings')).toBeInTheDocument();
    });

    it('should load and display settings', async () => {
      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('#2563eb')).toBeInTheDocument();
        expect(screen.getByDisplayValue('contact@example.com')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/tenant-settings');
    });

    it('should display error when API fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Failed to load' }),
      });

      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tabs Navigation', () => {
    it('should switch between tabs', async () => {
      const user = userEvent.setup();
      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByText('Branding')).toBeInTheDocument();
      });

      const featuresTab = screen.getByText('Features');
      await user.click(featuresTab);

      expect(screen.getByText('Feature Flags')).toBeInTheDocument();

      const contactTab = screen.getByText('Contact');
      await user.click(contactTab);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  describe('Branding Settings', () => {
    it('should update primary color', async () => {
      const user = userEvent.setup();
      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('#2563eb')).toBeInTheDocument();
      });

      const primaryColorInput = screen.getByLabelText(/primary color/i);
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#FF0000');

      expect(primaryColorInput).toHaveValue('#FF0000');
    });

    it('should update secondary color', async () => {
      const user = userEvent.setup();
      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('#1e40af')).toBeInTheDocument();
      });

      const secondaryColorInput = screen.getByLabelText(/secondary color/i);
      await user.clear(secondaryColorInput);
      await user.type(secondaryColorInput, '#00FF00');

      expect(secondaryColorInput).toHaveValue('#00FF00');
    });

    it('should update custom domain', async () => {
      const user = userEvent.setup();
      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom domain/i)).toBeInTheDocument();
      });

      const domainInput = screen.getByLabelText(/custom domain/i);
      await user.type(domainInput, 'clinic.example.com');

      expect(domainInput).toHaveValue('clinic.example.com');
    });
  });

  describe('Features Settings', () => {
    it('should toggle feature flags', async () => {
      const user = userEvent.setup();
      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByText('Features')).toBeInTheDocument();
      });

      const featuresTab = screen.getByText('Features');
      await user.click(featuresTab);

      await waitFor(() => {
        const telehealthSwitch = screen.getByLabelText('Toggle telehealth feature');
        expect(telehealthSwitch).toBeInTheDocument();
      });

      const telehealthSwitch = screen.getByLabelText('Toggle telehealth feature');
      await user.click(telehealthSwitch);

      await waitFor(() => {
        expect(telehealthSwitch).toBeChecked();
      });
    });
  });

  describe('Contact Information', () => {
    it('should update email address', async () => {
      const user = userEvent.setup();
      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByText('Contact')).toBeInTheDocument();
      });

      const contactTab = screen.getByText('Contact');
      await user.click(contactTab);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/^email/i);
        expect(emailInput).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/^email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'newemail@example.com');

      expect(emailInput).toHaveValue('newemail@example.com');
    });

    it('should update address fields', async () => {
      const user = userEvent.setup();
      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByText('Contact')).toBeInTheDocument();
      });

      const contactTab = screen.getByText('Contact');
      await user.click(contactTab);

      await waitFor(() => {
        const streetInput = screen.getByLabelText(/street address/i);
        expect(streetInput).toBeInTheDocument();
      });

      const streetInput = screen.getByLabelText(/street address/i);
      await user.clear(streetInput);
      await user.type(streetInput, '456 Oak Ave');

      expect(streetInput).toHaveValue('456 Oak Ave');
    });
  });

  describe('Save Functionality', () => {
    it('should save settings successfully', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTenantSettings }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const primaryColorInput = screen.getByLabelText(/primary color/i);
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#FF0000');

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/tenant-settings',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show validation errors for invalid email', async () => {
      const user = userEvent.setup();
      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByText('Contact')).toBeInTheDocument();
      });

      const contactTab = screen.getByText('Contact');
      await user.click(contactTab);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/^email/i);
        expect(emailInput).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/^email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid.*email/i)).toBeInTheDocument();
      });
    });

    it('should show validation errors for invalid color format', async () => {
      const user = userEvent.setup();
      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText(/primary color/i)).toBeInTheDocument();
      });

      const primaryColorInput = screen.getByLabelText(/primary color/i);
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, 'invalid-color');

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/primary color must be a valid hex/i)).toBeInTheDocument();
      });
    });

    it('should not send subscription data (read-only)', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTenantSettings }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const primaryColorInput = screen.getByLabelText(/primary color/i);
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#FF0000');

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
        const body = JSON.parse(fetchCall[1].body);
        expect(body.subscription).toBeUndefined();
      });
    });
  });

  describe('Subscription Display', () => {
    it('should display subscription information as read-only', async () => {
      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByText('Subscription Information')).toBeInTheDocument();
        expect(screen.getByText('demo')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should reset changes when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<TenantSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('#2563eb')).toBeInTheDocument();
      });

      const primaryColorInput = screen.getByLabelText(/primary color/i);
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#FF0000');

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('#2563eb')).toBeInTheDocument();
      });
    });
  });
});


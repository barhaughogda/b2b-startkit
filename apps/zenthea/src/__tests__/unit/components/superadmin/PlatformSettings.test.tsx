import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlatformSettings } from '@/components/superadmin/PlatformSettings';

// Mock fetch
global.fetch = vi.fn();

const mockPlatformSettings = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: true,
  requireMFA: true,
  sessionTimeout: 30,
  accountLockoutMaxAttempts: 5,
  accountLockoutDuration: 15,
  apiKeys: [],
  webhooks: [],
  defaultTenantSettings: {
    branding: {
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
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
  },
};

describe('PlatformSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPlatformSettings,
      }),
    });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      render(<PlatformSettings />);
      expect(screen.getByText('Platform Settings')).toBeInTheDocument();
    });

    it('should load and display settings', async () => {
      render(<PlatformSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('8')).toBeInTheDocument();
        expect(screen.getByDisplayValue('30')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/superadmin/platform-settings');
    });

    it('should display error when API fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Failed to load' }),
      });

      render(<PlatformSettings />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tabs Navigation', () => {
    it('should switch between tabs', async () => {
      const user = userEvent.setup();
      render(<PlatformSettings />);

      await waitFor(() => {
        expect(screen.getByText('Security Policies')).toBeInTheDocument();
      });

      const integrationsTab = screen.getByText('Integrations');
      await user.click(integrationsTab);

      expect(screen.getByText('Platform API Keys')).toBeInTheDocument();

      const defaultsTab = screen.getByText('Defaults');
      await user.click(defaultsTab);

      expect(screen.getByText('Default Branding')).toBeInTheDocument();
    });
  });

  describe('Security Policies', () => {
    it('should update password minimum length', async () => {
      const user = userEvent.setup();
      render(<PlatformSettings />);

      await waitFor(() => {
        const passwordLengthInput = screen.getByLabelText(/minimum password length/i);
        expect(passwordLengthInput).toBeInTheDocument();
      });

      const passwordLengthInput = screen.getByLabelText(/minimum password length/i);
      await user.clear(passwordLengthInput);
      await user.type(passwordLengthInput, '12');

      expect(passwordLengthInput).toHaveValue(12);
    });

    it('should toggle password requirements', async () => {
      const user = userEvent.setup();
      render(<PlatformSettings />);

      await waitFor(() => {
        const uppercaseSwitch = screen.getByLabelText('Require Uppercase Letters');
        expect(uppercaseSwitch).toBeInTheDocument();
      });

      const uppercaseSwitch = screen.getByLabelText('Require Uppercase Letters');
      await user.click(uppercaseSwitch);

      await waitFor(() => {
        expect(uppercaseSwitch).not.toBeChecked();
      });
    });

    it('should toggle MFA requirement', async () => {
      const user = userEvent.setup();
      render(<PlatformSettings />);

      await waitFor(() => {
        const mfaSwitch = screen.getByLabelText('Require Multi-Factor Authentication');
        expect(mfaSwitch).toBeInTheDocument();
      });

      const mfaSwitch = screen.getByLabelText('Require Multi-Factor Authentication');
      expect(mfaSwitch).toBeChecked();

      await user.click(mfaSwitch);

      await waitFor(() => {
        expect(mfaSwitch).not.toBeChecked();
      });
    });

    it('should update session timeout', async () => {
      const user = userEvent.setup();
      render(<PlatformSettings />);

      await waitFor(() => {
        const sessionTimeoutInput = screen.getByLabelText(/default session timeout/i);
        expect(sessionTimeoutInput).toBeInTheDocument();
      });

      const sessionTimeoutInput = screen.getByLabelText(/default session timeout/i);
      await user.clear(sessionTimeoutInput);
      await user.type(sessionTimeoutInput, '60');

      expect(sessionTimeoutInput).toHaveValue(60);
    });

    it('should update account lockout settings', async () => {
      const user = userEvent.setup();
      render(<PlatformSettings />);

      await waitFor(() => {
        const maxAttemptsInput = screen.getByLabelText(/max failed attempts/i);
        expect(maxAttemptsInput).toBeInTheDocument();
      });

      const maxAttemptsInput = screen.getByLabelText(/max failed attempts/i);
      await user.clear(maxAttemptsInput);
      await user.type(maxAttemptsInput, '7');

      expect(maxAttemptsInput).toHaveValue(7);
    });
  });

  describe('Default Tenant Settings', () => {
    it('should update default primary color', async () => {
      const user = userEvent.setup();
      render(<PlatformSettings />);

      await waitFor(() => {
        expect(screen.getByText('Defaults')).toBeInTheDocument();
      });

      const defaultsTab = screen.getByText('Defaults');
      await user.click(defaultsTab);

      await waitFor(() => {
        const primaryColorInput = screen.getByLabelText('Primary Color');
        expect(primaryColorInput).toBeInTheDocument();
      });

      const primaryColorInput = screen.getByLabelText('Primary Color');
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#FF0000');

      expect(primaryColorInput).toHaveValue('#FF0000');
    });

    it('should toggle default features', async () => {
      const user = userEvent.setup();
      render(<PlatformSettings />);

      await waitFor(() => {
        expect(screen.getByText('Defaults')).toBeInTheDocument();
      });

      const defaultsTab = screen.getByText('Defaults');
      await user.click(defaultsTab);

      await waitFor(() => {
        const telehealthSwitch = screen.getByLabelText(/telehealth/i);
        expect(telehealthSwitch).toBeInTheDocument();
      });

      const telehealthSwitch = screen.getByLabelText(/telehealth/i);
      await user.click(telehealthSwitch);

      await waitFor(() => {
        expect(telehealthSwitch).toBeChecked();
      });
    });
  });

  describe('Save Functionality', () => {
    it('should save settings successfully', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockPlatformSettings }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      render(<PlatformSettings />);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const passwordLengthInput = screen.getByLabelText(/minimum password length/i);
      await user.clear(passwordLengthInput);
      await user.type(passwordLengthInput, '12');

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/superadmin/platform-settings',
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

    it('should show validation errors', async () => {
      const user = userEvent.setup();
      render(<PlatformSettings />);

      await waitFor(() => {
        const passwordLengthInput = screen.getByLabelText(/minimum password length/i);
        expect(passwordLengthInput).toBeInTheDocument();
      });

      const passwordLengthInput = screen.getByLabelText(/minimum password length/i);
      await user.clear(passwordLengthInput);
      await user.type(passwordLengthInput, '5'); // Invalid: < 8

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/password minimum length must be between/i)).toBeInTheDocument();
      });
    });

    it('should handle save errors', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockPlatformSettings }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, error: 'Failed to save' }),
        });

      render(<PlatformSettings />);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const passwordLengthInput = screen.getByLabelText(/minimum password length/i);
      await user.clear(passwordLengthInput);
      await user.type(passwordLengthInput, '12');

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should reset changes when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<PlatformSettings />);

      await waitFor(() => {
        const passwordLengthInput = screen.getByLabelText(/minimum password length/i);
        expect(passwordLengthInput).toBeInTheDocument();
      });

      const passwordLengthInput = screen.getByLabelText(/minimum password length/i);
      await user.clear(passwordLengthInput);
      await user.type(passwordLengthInput, '12');

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(passwordLengthInput).toHaveValue(8);
      });
    });
  });
});


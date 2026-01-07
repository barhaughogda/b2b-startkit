import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SystemSettings } from '@/components/admin/SystemSettings';

// Mock fetch
global.fetch = vi.fn();

const mockSystemSettings = {
  timezone: 'America/New_York',
  dateFormat: 'MM/dd/yyyy',
  timeFormat: '12h' as const,
  currency: 'USD',
  language: 'en',
  sessionTimeout: 30,
  requireMFA: true,
  maxConcurrentSessions: 3,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: true,
  accountLockoutMaxAttempts: 5,
  accountLockoutDuration: 15,
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: false,
  emailFromAddress: 'noreply@zenthea.com',
  smsProvider: 'twilio',
  apiKeys: [],
  webhooks: [],
};

describe('SystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSystemSettings,
      }),
    });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      render(<SystemSettings />);
      expect(screen.getByText('System Settings')).toBeInTheDocument();
    });

    it('should load and display settings', async () => {
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
        expect(screen.getByDisplayValue('8')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/system-settings');
    });

    it('should display error when API fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Failed to load' }),
      });

      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tabs Navigation', () => {
    it('should switch between tabs', async () => {
      const user = userEvent.setup();
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText('General')).toBeInTheDocument();
      });

      const securityTab = screen.getByText('Security');
      await user.click(securityTab);

      expect(screen.getByText('Password Policy')).toBeInTheDocument();

      const notificationsTab = screen.getByText('Notifications');
      await user.click(notificationsTab);

      expect(screen.getByText('Notification Channels')).toBeInTheDocument();

      const integrationsTab = screen.getByText('Integrations');
      await user.click(integrationsTab);

      expect(screen.getByText('API Keys')).toBeInTheDocument();
    });
  });

  describe('General Settings', () => {
    it('should update timezone', async () => {
      const user = userEvent.setup();
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
      });

      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.click(timezoneSelect);
      await user.click(screen.getByText('America/Chicago'));

      await waitFor(() => {
        expect(screen.getByDisplayValue('America/Chicago')).toBeInTheDocument();
      });
    });

    it('should update date format', async () => {
      const user = userEvent.setup();
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('MM/dd/yyyy')).toBeInTheDocument();
      });

      const dateFormatSelect = screen.getByLabelText(/date format/i);
      await user.click(dateFormatSelect);
      await user.click(screen.getByText('yyyy-MM-dd'));

      await waitFor(() => {
        expect(screen.getByDisplayValue('yyyy-MM-dd')).toBeInTheDocument();
      });
    });
  });

  describe('Security Settings', () => {
    it('should update password minimum length', async () => {
      const user = userEvent.setup();
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      const securityTab = screen.getByText('Security');
      await user.click(securityTab);

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
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      const securityTab = screen.getByText('Security');
      await user.click(securityTab);

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
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      const securityTab = screen.getByText('Security');
      await user.click(securityTab);

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

    it('should update account lockout settings', async () => {
      const user = userEvent.setup();
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      const securityTab = screen.getByText('Security');
      await user.click(securityTab);

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

  describe('Notification Settings', () => {
    it('should toggle notification channels', async () => {
      const user = userEvent.setup();
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });

      const notificationsTab = screen.getByText('Notifications');
      await user.click(notificationsTab);

      await waitFor(() => {
        const smsSwitch = screen.getByLabelText('SMS Notifications');
        expect(smsSwitch).toBeInTheDocument();
      });

      const smsSwitch = screen.getByLabelText('SMS Notifications');
      await user.click(smsSwitch);

      await waitFor(() => {
        expect(smsSwitch).toBeChecked();
      });
    });

    it('should update email from address', async () => {
      const user = userEvent.setup();
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });

      const notificationsTab = screen.getByText('Notifications');
      await user.click(notificationsTab);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email from address/i);
        expect(emailInput).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email from address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'support@zenthea.com');

      expect(emailInput).toHaveValue('support@zenthea.com');
    });
  });

  describe('Integrations Settings', () => {
    it('should display empty state when no API keys', async () => {
      const user = userEvent.setup();
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText('Integrations')).toBeInTheDocument();
      });

      const integrationsTab = screen.getByText('Integrations');
      await user.click(integrationsTab);

      await waitFor(() => {
        expect(screen.getByText('No API keys configured')).toBeInTheDocument();
      });
    });

    it('should display empty state when no webhooks', async () => {
      const user = userEvent.setup();
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText('Integrations')).toBeInTheDocument();
      });

      const integrationsTab = screen.getByText('Integrations');
      await user.click(integrationsTab);

      await waitFor(() => {
        expect(screen.getByText('No webhooks configured')).toBeInTheDocument();
      });
    });
  });

  describe('Save Functionality', () => {
    it('should save settings successfully', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockSystemSettings }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.click(timezoneSelect);
      await user.click(screen.getByText('America/Chicago'));

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/system-settings',
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

    it('should show validation errors for invalid password length', async () => {
      const user = userEvent.setup();
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      const securityTab = screen.getByText('Security');
      await user.click(securityTab);

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
          json: async () => ({ success: true, data: mockSystemSettings }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, error: 'Failed to save' }),
        });

      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.click(timezoneSelect);
      await user.click(screen.getByText('America/Chicago'));

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
      render(<SystemSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
      });

      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.click(timezoneSelect);
      await user.click(screen.getByText('America/Chicago'));

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
      });
    });
  });
});


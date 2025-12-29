import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticePreferences } from '@/components/admin/PracticePreferences';

// Mock fetch
global.fetch = vi.fn();

const mockSettings = {
  timezone: 'America/New_York',
  dateFormat: 'MM/dd/yyyy',
  timeFormat: '12h' as const,
  currency: 'USD',
  language: 'en',
  sessionTimeout: 30,
  maxConcurrentSessions: 3,
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: false,
  emailFromAddress: 'noreply@zenthea.com',
  smsProvider: 'twilio',
};

describe('PracticePreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSettings,
      }),
    });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      render(<PracticePreferences />);
      expect(screen.getByText('Practice Preferences')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should load and display settings', async () => {
      render(<PracticePreferences />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
        expect(screen.getByDisplayValue('MM/dd/yyyy')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/system-settings');
    });

    it('should display error when API fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Failed to load settings' }),
      });

      render(<PracticePreferences />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tabs Navigation', () => {
    it('should switch between tabs', async () => {
      const user = userEvent.setup();
      render(<PracticePreferences />);

      await waitFor(() => {
        expect(screen.getByText('General')).toBeInTheDocument();
      });

      const sessionsTab = screen.getByText('Sessions');
      await user.click(sessionsTab);

      expect(screen.getByText('Session Management')).toBeInTheDocument();
      expect(screen.getByLabelText(/session timeout/i)).toBeInTheDocument();

      const notificationsTab = screen.getByText('Notifications');
      await user.click(notificationsTab);

      expect(screen.getByText('Notification Channels')).toBeInTheDocument();
    });
  });

  describe('Form Inputs', () => {
    it('should update timezone when changed', async () => {
      const user = userEvent.setup();
      render(<PracticePreferences />);

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

    it('should update date format when changed', async () => {
      const user = userEvent.setup();
      render(<PracticePreferences />);

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

    it('should update session timeout when changed', async () => {
      const user = userEvent.setup();
      render(<PracticePreferences />);

      await waitFor(() => {
        expect(screen.getByText('Sessions')).toBeInTheDocument();
      });

      const sessionsTab = screen.getByText('Sessions');
      await user.click(sessionsTab);

      await waitFor(() => {
        const timeoutInput = screen.getByLabelText(/session timeout/i);
        expect(timeoutInput).toBeInTheDocument();
      });

      const timeoutInput = screen.getByLabelText(/session timeout/i);
      await user.clear(timeoutInput);
      await user.type(timeoutInput, '60');

      expect(timeoutInput).toHaveValue(60);
    });

    it('should toggle notification switches', async () => {
      const user = userEvent.setup();
      render(<PracticePreferences />);

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
  });

  describe('Save Functionality', () => {
    it('should save settings successfully', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockSettings }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      render(<PracticePreferences />);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).toBeDisabled(); // No changes yet

      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.click(timezoneSelect);
      await user.click(screen.getByText('America/Chicago'));

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });

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

    it('should show validation errors', async () => {
      const user = userEvent.setup();
      render(<PracticePreferences />);

      await waitFor(() => {
        expect(screen.getByText('Sessions')).toBeInTheDocument();
      });

      const sessionsTab = screen.getByText('Sessions');
      await user.click(sessionsTab);

      await waitFor(() => {
        const timeoutInput = screen.getByLabelText(/session timeout/i);
        expect(timeoutInput).toBeInTheDocument();
      });

      const timeoutInput = screen.getByLabelText(/session timeout/i);
      await user.clear(timeoutInput);
      await user.type(timeoutInput, '1000'); // Invalid: > 480

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/session timeout must be between/i)).toBeInTheDocument();
      });
    });

    it('should handle save errors', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockSettings }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, error: 'Failed to save' }),
        });

      render(<PracticePreferences />);

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
      render(<PracticePreferences />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
      });

      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.click(timezoneSelect);
      await user.click(screen.getByText('America/Chicago'));

      await waitFor(() => {
        expect(screen.getByDisplayValue('America/Chicago')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
      });
    });
  });

  describe('Change Detection', () => {
    it('should disable save button when no changes', async () => {
      render(<PracticePreferences />);

      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes');
        expect(saveButton).toBeDisabled();
      });
    });

    it('should enable save button when changes are made', async () => {
      const user = userEvent.setup();
      render(<PracticePreferences />);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.click(timezoneSelect);
      await user.click(screen.getByText('America/Chicago'));

      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes');
        expect(saveButton).not.toBeDisabled();
      });
    });
  });
});


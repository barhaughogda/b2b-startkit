import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSession } from 'next-auth/react';
import { useAction } from 'convex/react';
import PatientSettingsPage from '@/app/patient/settings/page';

// Mock next-auth
const mockSession = {
  user: {
    id: 'user-123',
    email: 'patient@demo.com',
    name: 'Test Patient',
    role: 'patient' as const,
    tenantId: 'demo-tenant',
  },
  expires: '2024-12-31',
};

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock Convex
const mockChangePassword = vi.fn();
vi.mock('convex/react', () => ({
  useAction: vi.fn(),
}));

// Mock theme context
const mockSetTheme = vi.fn();
vi.mock('@/lib/theme-context', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: mockSetTheme,
  }),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Notification API
const mockNotificationPermission = 'default';
const mockRequestPermission = vi.fn().mockResolvedValue('granted');

Object.defineProperty(window, 'Notification', {
  writable: true,
  value: {
    permission: mockNotificationPermission,
    requestPermission: mockRequestPermission,
  },
});

describe('PatientSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSession as any).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });
    (useAction as any).mockReturnValue(mockChangePassword);
    localStorageMock.getItem.mockReturnValue(null);
    mockChangePassword.mockResolvedValue({
      success: true,
      message: 'Password changed successfully',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Password Change Flow', () => {
    it('should render password change form when "Change Password" button is clicked', async () => {
      const user = userEvent.setup();
      render(<PatientSettingsPage />);

      const changePasswordButton = screen.getByRole('button', {
        name: /change password/i,
      });
      await user.click(changePasswordButton);

      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    });

    it('should validate that all password fields are filled', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      render(<PatientSettingsPage />);

      const changePasswordButton = screen.getByRole('button', {
        name: /change password/i,
      });
      await user.click(changePasswordButton);

      const updateButton = screen.getByRole('button', {
        name: /update password/i,
      });
      await user.click(updateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Please fill in all password fields'
        );
      });
    });

    it('should validate that new passwords match', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      render(<PatientSettingsPage />);

      const changePasswordButton = screen.getByRole('button', {
        name: /change password/i,
      });
      await user.click(changePasswordButton);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'oldPassword123!');
      await user.type(newPasswordInput, 'NewPassword123!');
      await user.type(confirmPasswordInput, 'DifferentPassword123!');

      const updateButton = screen.getByRole('button', {
        name: /update password/i,
      });
      await user.click(updateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'New passwords do not match'
        );
      });
    });

    it('should validate password length (minimum 8 characters)', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      render(<PatientSettingsPage />);

      const changePasswordButton = screen.getByRole('button', {
        name: /change password/i,
      });
      await user.click(changePasswordButton);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'oldPassword123!');
      await user.type(newPasswordInput, 'Short1!');
      await user.type(confirmPasswordInput, 'Short1!');

      const updateButton = screen.getByRole('button', {
        name: /update password/i,
      });
      await user.click(updateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Password must be at least 8 characters long'
        );
      });
    });

    it('should validate password complexity requirements', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      render(<PatientSettingsPage />);

      const changePasswordButton = screen.getByRole('button', {
        name: /change password/i,
      });
      await user.click(changePasswordButton);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'oldPassword123!');
      await user.type(newPasswordInput, 'simplepassword'); // Missing uppercase, number, special char
      await user.type(confirmPasswordInput, 'simplepassword');

      const updateButton = screen.getByRole('button', {
        name: /update password/i,
      });
      await user.click(updateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('uppercase letter, one lowercase letter')
        );
      });
    });

    it('should successfully change password with valid input', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      render(<PatientSettingsPage />);

      const changePasswordButton = screen.getByRole('button', {
        name: /change password/i,
      });
      await user.click(changePasswordButton);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'oldPassword123!');
      await user.type(newPasswordInput, 'NewPassword123!');
      await user.type(confirmPasswordInput, 'NewPassword123!');

      const updateButton = screen.getByRole('button', {
        name: /update password/i,
      });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith({
          userId: 'user-123',
          currentPassword: 'oldPassword123!',
          newPassword: 'NewPassword123!',
        });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Password changed successfully'
        );
      });
    });

    it('should handle rate limiting error', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockChangePassword.mockRejectedValue(
        new Error('Too many password change attempts. Please try again in 15 minute(s).')
      );

      render(<PatientSettingsPage />);

      const changePasswordButton = screen.getByRole('button', {
        name: /change password/i,
      });
      await user.click(changePasswordButton);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'oldPassword123!');
      await user.type(newPasswordInput, 'NewPassword123!');
      await user.type(confirmPasswordInput, 'NewPassword123!');

      const updateButton = screen.getByRole('button', {
        name: /update password/i,
      });
      await user.click(updateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Too many password change attempts. Please try again in 15 minute(s).'
        );
      });
    });

    it('should handle incorrect current password error', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockChangePassword.mockRejectedValue(
        new Error('Current password is incorrect')
      );

      render(<PatientSettingsPage />);

      const changePasswordButton = screen.getByRole('button', {
        name: /change password/i,
      });
      await user.click(changePasswordButton);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'wrongPassword123!');
      await user.type(newPasswordInput, 'NewPassword123!');
      await user.type(confirmPasswordInput, 'NewPassword123!');

      const updateButton = screen.getByRole('button', {
        name: /update password/i,
      });
      await user.click(updateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Current password is incorrect'
        );
      });
    });

    it('should clear password fields and hide form on cancel', async () => {
      const user = userEvent.setup();
      render(<PatientSettingsPage />);

      const changePasswordButton = screen.getByRole('button', {
        name: /change password/i,
      });
      await user.click(changePasswordButton);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      await user.type(currentPasswordInput, 'test');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
    });
  });

  describe('Notification Preferences', () => {
    it('should load email notification preference from localStorage', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'zenthea-email-notifications') return 'true';
        return null;
      });

      render(<PatientSettingsPage />);

      const emailSwitch = screen.getByLabelText(/email notifications/i);
      expect(emailSwitch).toBeChecked();
    });

    it('should toggle email notifications and save to localStorage', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      render(<PatientSettingsPage />);

      const emailSwitch = screen.getByLabelText(/email notifications/i);
      await user.click(emailSwitch);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'zenthea-email-notifications',
          'false'
        );
      });

      expect(toast.success).toHaveBeenCalledWith(
        'Email notifications disabled'
      );
    });

    it('should toggle push notifications and save to localStorage', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      render(<PatientSettingsPage />);

      const pushSwitch = screen.getByLabelText(/push notifications/i);
      await user.click(pushSwitch);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'zenthea-push-notifications',
          'true'
        );
      });

      expect(toast.success).toHaveBeenCalledWith(
        'Push notifications enabled'
      );
    });

    it('should handle browser notification permission request', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      Object.defineProperty(window, 'Notification', {
        writable: true,
        value: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
      });

      render(<PatientSettingsPage />);

      const browserSwitch = screen.getByLabelText(/browser notifications/i);
      await user.click(browserSwitch);

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Browser notifications enabled'
        );
      });
    });

    it('should handle browser notification permission denied', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockRequestPermission.mockResolvedValueOnce('denied');

      Object.defineProperty(window, 'Notification', {
        writable: true,
        value: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
      });

      render(<PatientSettingsPage />);

      const browserSwitch = screen.getByLabelText(/browser notifications/i);
      await user.click(browserSwitch);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Browser notifications permission denied'
        );
      });
    });

    it('should show warning when browser notifications are blocked', () => {
      Object.defineProperty(window, 'Notification', {
        writable: true,
        value: {
          permission: 'denied',
          requestPermission: mockRequestPermission,
        },
      });

      render(<PatientSettingsPage />);

      expect(
        screen.getByText(/browser notifications are blocked/i)
      ).toBeInTheDocument();
    });
  });

  describe('Theme and Language Preferences', () => {
    it('should change theme preference', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      render(<PatientSettingsPage />);

      const themeSelect = screen.getByLabelText(/theme/i);
      await user.click(themeSelect);

      const darkOption = screen.getByText(/dark/i);
      await user.click(darkOption);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      expect(toast.success).toHaveBeenCalledWith('Theme set to dark');
    });

    it('should change language preference and save to localStorage', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      render(<PatientSettingsPage />);

      const languageSelect = screen.getByLabelText(/language/i);
      await user.click(languageSelect);

      const spanishOption = screen.getByText(/español/i);
      await user.click(spanishOption);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'zenthea-language',
          'es'
        );
      });

      expect(toast.success).toHaveBeenCalledWith(
        'Language preference saved'
      );
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state when session is loading', () => {
      (useSession as any).mockReturnValue({
        data: null,
        status: 'loading',
      });

      render(<PatientSettingsPage />);

      expect(screen.getByText(/loading settings/i)).toBeInTheDocument();
    });

    it('should show access denied when user is not authenticated', () => {
      (useSession as any).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(<PatientSettingsPage />);

      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(
        screen.getByText(/please sign in to access your settings/i)
      ).toBeInTheDocument();
    });

    it('should show access denied when user is not a patient', () => {
      (useSession as any).mockReturnValue({
        data: {
          ...mockSession,
          user: { ...mockSession.user, role: 'provider' },
        },
        status: 'authenticated',
      });

      render(<PatientSettingsPage />);

      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });
  });
});


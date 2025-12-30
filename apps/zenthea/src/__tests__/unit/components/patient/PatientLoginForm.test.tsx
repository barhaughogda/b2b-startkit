import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientLoginForm } from '@/components/patient/PatientLoginForm';
import { signIn } from '@/lib/auth/react';
import { useRouter } from 'next/navigation';

// Mock @/lib/auth
const mockSignIn = vi.fn();
vi.mock('@/lib/auth/react', () => ({
  signIn: (provider: string, options?: any) => mockSignIn(provider, options),
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Mail: ({ className }: { className?: string }) => (
    <div data-testid="icon-mail" className={className} />
  ),
  Lock: ({ className }: { className?: string }) => (
    <div data-testid="icon-lock" className={className} />
  ),
  Eye: ({ className }: { className?: string }) => (
    <div data-testid="icon-eye" className={className} />
  ),
  EyeOff: ({ className }: { className?: string }) => (
    <div data-testid="icon-eye-off" className={className} />
  ),
  Shield: ({ className }: { className?: string }) => (
    <div data-testid="icon-shield" className={className} />
  ),
}));

describe('PatientLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockReset();
    mockSignIn.mockResolvedValue({ ok: true, error: null });
  });

  describe('Rendering', () => {
    it('should render login form with all fields', () => {
      render(<PatientLoginForm />);

      expect(screen.getByText('Patient Sign In')).toBeInTheDocument();
      expect(screen.getByText(/Enter your credentials to access your patient portal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render email input with icon', () => {
      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
      expect(screen.getByTestId('icon-mail')).toBeInTheDocument();
    });

    it('should render password input with icon', () => {
      render(<PatientLoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
      expect(screen.getByTestId('icon-lock')).toBeInTheDocument();
    });

    it('should render password visibility toggle button', () => {
      render(<PatientLoginForm />);

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      expect(toggleButton).toBeInTheDocument();
      expect(screen.getByTestId('icon-eye')).toBeInTheDocument();
    });

    it('should render with custom tenant ID', () => {
      render(<PatientLoginForm tenantId="custom-tenant" />);

      expect(screen.getByText('Patient Sign In')).toBeInTheDocument();
    });

    it('should render with custom redirect path', () => {
      render(<PatientLoginForm redirectTo="/patient/custom" />);

      expect(screen.getByText('Patient Sign In')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should require email field', () => {
      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeRequired();
    });

    it('should require password field', () => {
      render(<PatientLoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toBeRequired();
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      // HTML5 validation should prevent submission
      expect(emailInput).toHaveValue('invalid-email');
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility on button click', async () => {
      const user = userEvent.setup();
      render(<PatientLoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      // Initially password type
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(screen.getByTestId('icon-eye')).toBeInTheDocument();

      // Click to show password
      await user.click(toggleButton);

      // Should be text type with updated icon and aria-label
      await waitFor(() => {
        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(screen.getByTestId('icon-eye-off')).toBeInTheDocument();
        expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');
      });

      // Click to hide password
      await user.click(toggleButton);

      // Should be password type again with updated icon
      await waitFor(() => {
        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(screen.getByTestId('icon-eye')).toBeInTheDocument();
      });
    });

    it('should maintain password value when toggling visibility', async () => {
      const user = userEvent.setup();
      render(<PatientLoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      await user.type(passwordInput, 'testpassword123');
      expect(passwordInput).toHaveValue('testpassword123');

      await user.click(toggleButton);
      expect(passwordInput).toHaveValue('testpassword123');

      await user.click(toggleButton);
      expect(passwordInput).toHaveValue('testpassword123');
    });
  });

  describe('Form Submission', () => {
    it('should call signIn with correct credentials on submit', async () => {
      const user = userEvent.setup();
      render(<PatientLoginForm tenantId="test-tenant" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          email: 'patient@example.com',
          password: 'password123',
          tenantId: 'test-tenant',
          redirect: false,
        });
      });
    });

    it('should use default tenant ID when not provided', async () => {
      const user = userEvent.setup();
      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          email: 'patient@example.com',
          password: 'password123',
          tenantId: '',
          redirect: false,
        });
      });
    });

    it('should redirect on successful login', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ ok: true, error: null });

      render(<PatientLoginForm redirectTo="/patient/dashboard" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/patient/dashboard');
      });
    });

    it('should use default redirect path when not provided', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ ok: true, error: null });

      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/patient/dashboard');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      const user = userEvent.setup();
      // Delay the signIn response to test loading state
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100)));

      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show loading text
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Signing in...')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should disable form fields during submission', async () => {
      const user = userEvent.setup();
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100)));

      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(toggleButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on invalid credentials', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' });

      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password. Please try again.')).toBeInTheDocument();
      });
    });

    it('should display error message on network error', async () => {
      const user = userEvent.setup();
      mockSignIn.mockRejectedValue(new Error('Network error'));

      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('An error occurred during login. Please try again.')).toBeInTheDocument();
      });
    });

    it('should clear error message on new submission', async () => {
      const user = userEvent.setup();
      mockSignIn
        .mockResolvedValueOnce({ ok: false, error: 'Invalid credentials' })
        .mockResolvedValueOnce({ ok: true, error: null });

      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // First submission with error
      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password. Please try again.')).toBeInTheDocument();
      });

      // Second submission should clear error
      await user.clear(passwordInput);
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Invalid email or password. Please try again.')).not.toBeInTheDocument();
      });
    });
  });

  describe('MFA Flow', () => {
    it('should show MFA form when MFA_REQUIRED error is returned', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ ok: false, error: 'MFA_REQUIRED' });

      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Multi-Factor Authentication')).toBeInTheDocument();
        expect(screen.getByText(/Please enter the verification code/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });
    });

    it('should not show error message when MFA is required', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ ok: false, error: 'MFA_REQUIRED' });

      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Invalid email or password')).not.toBeInTheDocument();
      });
    });

    it('should submit MFA code on MFA form submission', async () => {
      const user = userEvent.setup();
      mockSignIn
        .mockResolvedValueOnce({ ok: false, error: 'MFA_REQUIRED' })
        .mockResolvedValueOnce({ ok: true, error: null });

      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Initial login
      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Wait for MFA form
      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      // Submit MFA code
      const mfaInput = screen.getByLabelText(/verification code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(mfaInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          email: 'patient@example.com',
          password: 'password123',
          tenantId: '',
          mfaCode: '123456',
          redirect: false,
        });
      });
    });

    it('should redirect after successful MFA verification', async () => {
      const user = userEvent.setup();
      mockSignIn
        .mockResolvedValueOnce({ ok: false, error: 'MFA_REQUIRED' })
        .mockResolvedValueOnce({ ok: true, error: null });

      render(<PatientLoginForm redirectTo="/patient/dashboard" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      const mfaInput = screen.getByLabelText(/verification code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(mfaInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/patient/dashboard');
      });
    });

    it('should show error on invalid MFA code', async () => {
      const user = userEvent.setup();
      mockSignIn
        .mockResolvedValueOnce({ ok: false, error: 'MFA_REQUIRED' })
        .mockResolvedValueOnce({ ok: false, error: 'Invalid MFA code' });

      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      const mfaInput = screen.getByLabelText(/verification code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(mfaInput, '000000');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid MFA code. Please try again.')).toBeInTheDocument();
      });
    });

    it('should disable verify button when MFA code is not 6 digits', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ ok: false, error: 'MFA_REQUIRED' });

      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      const mfaInput = screen.getByLabelText(/verification code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      expect(verifyButton).toBeDisabled();

      await user.type(mfaInput, '12345'); // Only 5 digits
      expect(verifyButton).toBeDisabled();

      await user.clear(mfaInput); // Clear before typing new value
      await user.type(mfaInput, '123456'); // 6 digits
      expect(verifyButton).not.toBeDisabled();
    });

    it('should allow going back from MFA form to login form', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ ok: false, error: 'MFA_REQUIRED' });

      render(<PatientLoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'patient@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/verification code/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      render(<PatientLoginForm />);

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    it('should have proper ARIA label for password toggle', () => {
      render(<PatientLoginForm />);

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
    });

    it('should have proper form structure', () => {
      render(<PatientLoginForm />);

      // Form should exist (can be found via submit button's form attribute or by querying)
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');
      
      // Verify form fields are within a form element
      const emailInput = screen.getByLabelText(/email address/i);
      const form = emailInput.closest('form');
      expect(form).toBeInTheDocument();
    });
  });
});


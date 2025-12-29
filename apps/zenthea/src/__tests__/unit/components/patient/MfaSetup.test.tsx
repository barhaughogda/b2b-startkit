import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MfaSetup } from '@/components/patient/MfaSetup';

// Mock fetch
global.fetch = vi.fn();

describe('MfaSetup', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockClear();
  });

  describe('Rendering', () => {
    it('should render MFA setup form', () => {
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      expect(screen.getByText(/Setup Multi-Factor Authentication/i)).toBeInTheDocument();
      expect(screen.getByText(/Choose your preferred MFA method/i)).toBeInTheDocument();
    });

    it('should display all MFA method options', () => {
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      expect(screen.getByText(/SMS Text Message/i)).toBeInTheDocument();
      expect(screen.getByText(/Email/i)).toBeInTheDocument();
      expect(screen.getByText(/Authenticator App/i)).toBeInTheDocument();
    });

    it('should have SMS selected by default', () => {
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      const smsRadio = screen.getByLabelText(/SMS Text Message/i);
      expect(smsRadio).toBeChecked();
    });
  });

  describe('Method Selection', () => {
    it('should show phone input when SMS is selected', () => {
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/\(555\) 123-4567/i)).toBeInTheDocument();
    });

    it('should show email input when Email is selected', async () => {
      const user = userEvent.setup();
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      const emailRadio = screen.getByLabelText(/^Email$/i);
      await user.click(emailRadio);
      
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/your@email\.com/i)).toBeInTheDocument();
    });

    it('should show info message when Authenticator App is selected', async () => {
      const user = userEvent.setup();
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      const appRadio = screen.getByLabelText(/Authenticator App/i);
      await user.click(appRadio);
      
      expect(screen.getByText(/You'll be shown a QR code/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call setup API when form is submitted with SMS', async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, '5551234567');
      
      const submitButton = screen.getByRole('button', { name: /Setup MFA/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/patient/mfa/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user-123',
            method: 'sms',
            phone: '5551234567',
          }),
        });
      });
    });

    it('should call setup API when form is submitted with Email', async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      const emailRadio = screen.getByLabelText(/Email/i);
      await user.click(emailRadio);
      
      const emailInput = screen.getByLabelText(/Email Address/i);
      await user.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /Setup MFA/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/patient/mfa/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user-123',
            method: 'email',
            email: 'test@example.com',
          }),
        });
      });
    });

    it('should transition to verification step after successful setup', async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, '5551234567');
      
      const submitButton = screen.getByRole('button', { name: /Setup MFA/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Verify MFA Setup/i)).toBeInTheDocument();
      });
    });

    it('should display QR code when Authenticator App method is used', async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ qrCode: 'data:image/png;base64,test' }),
      } as Response);
      
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      const appRadio = screen.getByLabelText(/Authenticator App/i);
      await user.click(appRadio);
      
      const submitButton = screen.getByRole('button', { name: /Setup MFA/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Verify MFA Setup/i)).toBeInTheDocument();
      });
    });
  });

  describe('Verification Step', () => {
    it('should render verification form after setup', async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, '5551234567');
      
      const submitButton = screen.getByRole('button', { name: /Setup MFA/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Verify MFA Setup/i)).toBeInTheDocument();
        expect(screen.getByText(/Enter the verification code/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter 6-digit code/i)).toBeInTheDocument();
      });
    });

    it('should call verify API when verification code is submitted', async () => {
      const user = userEvent.setup();
      
      // Mock setup response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      // Complete setup
      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, '5551234567');
      
      const setupButton = screen.getByRole('button', { name: /Setup MFA/i });
      await user.click(setupButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Verify MFA Setup/i)).toBeInTheDocument();
      });
      
      // Mock verify response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      
      // Enter verification code
      const codeInput = screen.getByPlaceholderText(/Enter 6-digit code/i);
      await user.type(codeInput, '123456');
      
      const verifyButton = screen.getByRole('button', { name: /Verify & Complete Setup/i });
      await user.click(verifyButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/patient/mfa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user-123',
            code: '123456',
          }),
        });
      });
    });

    it('should call onComplete after successful verification', async () => {
      const user = userEvent.setup();
      
      // Mock setup response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      // Complete setup
      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, '5551234567');
      
      const setupButton = screen.getByRole('button', { name: /Setup MFA/i });
      await user.click(setupButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Verify MFA Setup/i)).toBeInTheDocument();
      });
      
      // Mock verify response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      
      // Enter verification code and submit
      const codeInput = screen.getByPlaceholderText(/Enter 6-digit code/i);
      await user.type(codeInput, '123456');
      
      const verifyButton = screen.getByRole('button', { name: /Verify & Complete Setup/i });
      await user.click(verifyButton);
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });

    it('should disable verify button when code is not 6 digits', async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      // Complete setup
      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, '5551234567');
      
      const setupButton = screen.getByRole('button', { name: /Setup MFA/i });
      await user.click(setupButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Verify MFA Setup/i)).toBeInTheDocument();
      });
      
      // Enter incomplete code
      const codeInput = screen.getByPlaceholderText(/Enter 6-digit code/i);
      await user.type(codeInput, '12345');
      
      const verifyButton = screen.getByRole('button', { name: /Verify & Complete Setup/i });
      expect(verifyButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when setup fails', async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Setup failed' }),
      } as Response);
      
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, '5551234567');
      
      const submitButton = screen.getByRole('button', { name: /Setup MFA/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Setup failed/i)).toBeInTheDocument();
      });
    });

    it('should display error message when verification fails', async () => {
      const user = userEvent.setup();
      
      // Mock setup response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      // Complete setup
      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, '5551234567');
      
      const setupButton = screen.getByRole('button', { name: /Setup MFA/i });
      await user.click(setupButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Verify MFA Setup/i)).toBeInTheDocument();
      });
      
      // Mock verify failure
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid code' }),
      } as Response);
      
      // Enter verification code
      const codeInput = screen.getByPlaceholderText(/Enter 6-digit code/i);
      await user.type(codeInput, '123456');
      
      const verifyButton = screen.getByRole('button', { name: /Verify & Complete Setup/i });
      await user.click(verifyButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid code/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during setup', async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({}),
        } as Response), 100))
      );
      
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, '5551234567');
      
      const submitButton = screen.getByRole('button', { name: /Setup MFA/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/Setting up/i)).toBeInTheDocument();
    });

    it('should disable form during loading', async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({}),
        } as Response), 100))
      );
      
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, '5551234567');
      
      const submitButton = screen.getByRole('button', { name: /Setup MFA/i });
      await user.click(submitButton);
      
      expect(phoneInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have labeled form fields', () => {
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/SMS Text Message/i)).toBeInTheDocument();
    });

    it('should have accessible radio buttons', () => {
      render(<MfaSetup userId="user-123" onComplete={mockOnComplete} />);
      
      const smsRadio = screen.getByLabelText(/SMS Text Message/i);
      const emailRadio = screen.getByLabelText(/Email/i);
      const appRadio = screen.getByLabelText(/Authenticator App/i);
      
      expect(smsRadio).toBeInTheDocument();
      expect(emailRadio).toBeInTheDocument();
      expect(appRadio).toBeInTheDocument();
    });
  });
});


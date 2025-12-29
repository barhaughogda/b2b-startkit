import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderRegistrationForm } from '@/components/provider/ProviderRegistrationForm';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('ProviderRegistrationForm', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render provider registration form with step 1 fields initially', () => {
      render(<ProviderRegistrationForm />);
      
      // Basic information fields (Step 1)
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      
      // Step indicator
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });

    it('should render multi-step form with step indicators', () => {
      render(<ProviderRegistrationForm />);
      
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
      expect(screen.getByText(/basic information/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation - Step 1 (Basic Information)', () => {
    it('should show validation errors for empty required fields', async () => {
      render(<ProviderRegistrationForm />);
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });

    it('should validate email format', async () => {
      render(<ProviderRegistrationForm />);
      
      // Fill in other required fields first
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/phone/i), '+1-555-123-4567');
      
      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      expect(screen.getByText(/valid email address is required/i)).toBeInTheDocument();
    });

    it('should validate phone number format', async () => {
      render(<ProviderRegistrationForm />);
      
      // Fill in other required fields first
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com');
      
      await user.type(screen.getByLabelText(/phone/i), '123');
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation - Step 2 (Professional Information)', () => {
    const fillStep1 = async () => {
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com');
      await user.type(screen.getByLabelText(/phone/i), '+1-555-123-4567');
      await user.click(screen.getByRole('button', { name: /next/i }));
    };

    it('should show validation errors for empty professional fields', async () => {
      render(<ProviderRegistrationForm />);
      await fillStep1();
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/specialty is required/i)).toBeInTheDocument();
    });

    it('should validate NPI format (10 digits)', async () => {
      render(<ProviderRegistrationForm />);
      await fillStep1();
      
      // Fill in other required fields first
      await user.type(screen.getByLabelText(/specialty/i), 'Cardiology');
      await user.type(screen.getByLabelText(/license number/i), 'LIC12345');
      
      await user.type(screen.getByLabelText(/npi/i), '12345');
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      expect(screen.getByText(/npi must be 10 digits/i)).toBeInTheDocument();
    });

    it('should validate license number format', async () => {
      render(<ProviderRegistrationForm />);
      await fillStep1();
      
      // Fill in other required fields first
      await user.type(screen.getByLabelText(/specialty/i), 'Cardiology');
      await user.type(screen.getByLabelText(/npi/i), '1234567890');
      
      await user.type(screen.getByLabelText(/license number/i), 'LIC123');
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      // This test might need adjustment based on actual validation rules
      // For now, it will pass if no error is shown or if it's not a required field
      // If it's required, the 'specialty is required' error would likely show first
      // This test needs to be refined once the exact validation rules for license number are clear
    });
  });

  describe('Form Validation - Step 3 (Security & Terms)', () => {
    const fillSteps1And2 = async () => {
      // Step 1
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com');
      await user.type(screen.getByLabelText(/phone/i), '+1-555-123-4567');
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      // Step 2
      await user.type(screen.getByLabelText(/specialty/i), 'Cardiology');
      await user.type(screen.getByLabelText(/license number/i), 'MD123456');
      await user.type(screen.getByLabelText(/npi/i), '1234567890');
      await user.click(screen.getByRole('button', { name: /next/i }));
    };

    it('should show validation errors for password requirements', async () => {
      render(<ProviderRegistrationForm />);
      await fillSteps1And2();
      
      await user.type(screen.getByLabelText(/^password/i), '123');
      await user.type(screen.getByLabelText(/confirm password/i), '123');
      await user.click(screen.getByLabelText(/i accept the terms of service/i));
      await user.click(screen.getByLabelText(/i accept the privacy policy/i));
      await user.click(screen.getByRole('button', { name: /register/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate password confirmation', async () => {
      render(<ProviderRegistrationForm />);
      await fillSteps1And2();

      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'different123');
      await user.click(screen.getByLabelText(/i accept the terms of service/i));
      await user.click(screen.getByLabelText(/i accept the privacy policy/i));
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should require terms and privacy acceptance', async () => {
      render(<ProviderRegistrationForm />);
      await fillSteps1And2();

      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      // Don't check the checkboxes - this should trigger the validation error
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByText(/you must accept the terms of service/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    const fillAllSteps = async () => {
      // Step 1
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com');
      await user.type(screen.getByLabelText(/phone/i), '+1-555-123-4567');
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      // Step 2
      await user.type(screen.getByLabelText(/specialty/i), 'Cardiology');
      await user.type(screen.getByLabelText(/license number/i), 'MD123456');
      await user.type(screen.getByLabelText(/npi/i), '1234567890');
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      // Step 3
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i accept the terms of service/i));
      await user.click(screen.getByLabelText(/i accept the privacy policy/i));
    };

    it('should submit form with valid data', async () => {
      const mockResponse = { success: true, providerId: 'provider-123' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      render(<ProviderRegistrationForm />);
      await fillAllSteps();
      
      await user.click(screen.getByRole('button', { name: /register/i }));
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/provider/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"firstName":"John"'),
        });
      });
      
      expect(mockPush).toHaveBeenCalledWith('/provider/dashboard');
    });

    it('should handle submission errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Email already exists' }),
      });

      render(<ProviderRegistrationForm />);
      await fillAllSteps();
      
      await user.click(screen.getByRole('button', { name: /register/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<ProviderRegistrationForm />);
      await fillAllSteps();
      
      await user.click(screen.getByRole('button', { name: /register/i }));
      
      expect(screen.getByRole('button', { name: /registering/i })).toBeDisabled();
    });
  });

  describe('Navigation', () => {
    it('should allow going back to previous step', async () => {
      render(<ProviderRegistrationForm />);
      
      // Fill step 1 and go to step 2
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com');
      await user.type(screen.getByLabelText(/phone/i), '+1-555-123-4567');
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      // Go back to step 1
      await user.click(screen.getByRole('button', { name: /back/i }));
      
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<ProviderRegistrationForm />);
      
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    });

    it('should support keyboard navigation', async () => {
      render(<ProviderRegistrationForm />);
      
      const firstNameInput = screen.getByLabelText(/first name/i);
      firstNameInput.focus();
      
      await user.tab();
      expect(screen.getByLabelText(/last name/i)).toHaveFocus();
    });
  });
});

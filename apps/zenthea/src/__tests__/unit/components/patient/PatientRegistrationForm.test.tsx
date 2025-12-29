import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientRegistrationForm } from '@/components/patient/PatientRegistrationForm';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('PatientRegistrationForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  describe('Form Rendering', () => {
    it('should render registration form with step 1 fields initially', () => {
      render(<PatientRegistrationForm />);
      
      expect(screen.getByText('Create Patient Account')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 2: Personal Information')).toBeInTheDocument();
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Date of Birth')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    });

    it('should render step 2 fields after completing step 1', async () => {
      render(<PatientRegistrationForm />);
      
      // Fill step 1 form
      await user.type(screen.getByLabelText('First Name'), 'John');
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john.doe@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.type(screen.getByLabelText('Date of Birth'), '1990-01-01');
      
      // Click continue
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      
      // Should show step 2
      expect(screen.getByText('Step 2 of 2: Security & Terms')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /terms of service/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /privacy policy/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields in step 1', async () => {
      render(<PatientRegistrationForm />);
      
      // Try to continue without filling fields
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      
      // Wait for the error message to appear
      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<PatientRegistrationForm />);
      
      await user.type(screen.getByLabelText('First Name'), 'John');
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      await user.type(screen.getByLabelText('Email Address'), 'invalid-email');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.type(screen.getByLabelText('Date of Birth'), '1990-01-01');
      
      console.log('About to click Continue button...');
      const button = screen.getByRole('button', { name: 'Continue' });
      console.log('Button found:', button);
      await user.click(button);
      console.log('Button clicked');
      
      // Debug: Check the error state
      const debugEl = screen.getByTestId('error-state-debug');
      console.log('Error state from debug element:', debugEl.textContent);
      
      await waitFor(() => {
        expect(screen.getByText('Valid email address is required')).toBeInTheDocument();
      });
    });

    it('should validate age requirement (18 or older)', async () => {
      render(<PatientRegistrationForm />);
      
      await user.type(screen.getByLabelText('First Name'), 'John');
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john.doe@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.type(screen.getByLabelText('Date of Birth'), '2010-01-01'); // Under 18
      
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      
      expect(screen.getByText('You must be 18 or older to register')).toBeInTheDocument();
    });

    it('should validate password requirements in step 2', async () => {
      render(<PatientRegistrationForm />);
      
      // Complete step 1
      await user.type(screen.getByLabelText('First Name'), 'John');
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john.doe@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.type(screen.getByLabelText('Date of Birth'), '1990-01-01');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      
      // Try to submit with short password
      await user.type(screen.getByLabelText('Password'), '123');
      await user.type(screen.getByLabelText('Confirm Password'), '123');
      await user.click(screen.getByRole('checkbox', { name: /terms of service/i }));
      await user.click(screen.getByRole('checkbox', { name: /privacy policy/i }));
      await user.click(screen.getByRole('button', { name: 'Create Account' }));
      
      expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 8 characters long');
    });

    it('should validate password confirmation match', async () => {
      render(<PatientRegistrationForm />);
      
      // Complete step 1
      await user.type(screen.getByLabelText('First Name'), 'John');
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john.doe@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.type(screen.getByLabelText('Date of Birth'), '1990-01-01');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      
      // Mismatched passwords
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'different123');
      await user.click(screen.getByRole('checkbox', { name: /terms of service/i }));
      await user.click(screen.getByRole('checkbox', { name: /privacy policy/i }));
      await user.click(screen.getByRole('button', { name: 'Create Account' }));
      
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('should validate terms and privacy acceptance', async () => {
      render(<PatientRegistrationForm />);
      
      // Complete step 1
      await user.type(screen.getByLabelText('First Name'), 'John');
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john.doe@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.type(screen.getByLabelText('Date of Birth'), '1990-01-01');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      
      // Fill passwords but don't accept terms
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));
      
      expect(screen.getByText('You must accept the terms of service')).toBeInTheDocument();
    });
  });

  describe('Form Navigation', () => {
    it('should allow going back from step 2 to step 1', async () => {
      render(<PatientRegistrationForm />);
      
      // Complete step 1
      await user.type(screen.getByLabelText('First Name'), 'John');
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john.doe@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.type(screen.getByLabelText('Date of Birth'), '1990-01-01');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      
      // Go back
      await user.click(screen.getByRole('button', { name: 'Back' }));
      
      expect(screen.getByText('Step 1 of 2: Personal Information')).toBeInTheDocument();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      render(<PatientRegistrationForm />);
      
      // Complete step 1
      await user.type(screen.getByLabelText('First Name'), 'John');
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john.doe@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.type(screen.getByLabelText('Date of Birth'), '1990-01-01');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      const toggleButton = screen.getByRole('button', { name: 'Show password' }); // Eye icon button
      
      expect(passwordInput.type).toBe('password');
      
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');
      
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('API Integration', () => {
    it('should call registration API on successful form submission', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      global.fetch = mockFetch;
      
      render(<PatientRegistrationForm tenantId="test-tenant" />);
      
      // Complete step 1
      await user.type(screen.getByLabelText('First Name'), 'John');
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john.doe@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.type(screen.getByLabelText('Date of Birth'), '1990-01-01');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      
      // Complete step 2
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('checkbox', { name: /terms of service/i }));
      await user.click(screen.getByRole('checkbox', { name: /privacy policy/i }));
      await user.click(screen.getByRole('button', { name: 'Create Account' }));
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/patient/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '(555) 123-4567',
            dateOfBirth: '1990-01-01',
            password: 'password123',
            confirmPassword: 'password123',
            acceptTerms: true,
            acceptPrivacy: true,
            tenantId: 'test-tenant',
          }),
        });
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Email already exists' }),
      });
      global.fetch = mockFetch;
      
      render(<PatientRegistrationForm />);
      
      // Complete both steps
      await user.type(screen.getByLabelText('First Name'), 'John');
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john.doe@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.type(screen.getByLabelText('Date of Birth'), '1990-01-01');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('checkbox', { name: /terms of service/i }));
      await user.click(screen.getByRole('checkbox', { name: /privacy policy/i }));
      await user.click(screen.getByRole('button', { name: 'Create Account' }));
      
      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
    });

    it('should redirect to dashboard on successful registration', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      global.fetch = mockFetch;
      
      render(<PatientRegistrationForm redirectTo="/patient/dashboard" />);
      
      // Complete both steps
      await user.type(screen.getByLabelText('First Name'), 'John');
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john.doe@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.type(screen.getByLabelText('Date of Birth'), '1990-01-01');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('checkbox', { name: /terms of service/i }));
      await user.click(screen.getByRole('checkbox', { name: /privacy policy/i }));
      await user.click(screen.getByRole('button', { name: 'Create Account' }));
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/patient/dashboard');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      const mockFetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 100))
      );
      global.fetch = mockFetch;
      
      render(<PatientRegistrationForm />);
      
      // Complete both steps
      await user.type(screen.getByLabelText('First Name'), 'John');
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john.doe@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.type(screen.getByLabelText('Date of Birth'), '1990-01-01');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('checkbox', { name: /terms of service/i }));
      await user.click(screen.getByRole('checkbox', { name: /privacy policy/i }));
      await user.click(screen.getByRole('button', { name: 'Create Account' }));
      
      expect(screen.getByText('Creating Account...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<PatientRegistrationForm />);
      
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Date of Birth')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<PatientRegistrationForm />);
      
      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      
      firstNameInput.focus();
      expect(document.activeElement).toBe(firstNameInput);
      
      await user.tab();
      expect(document.activeElement).toBe(lastNameInput);
    });
  });
});

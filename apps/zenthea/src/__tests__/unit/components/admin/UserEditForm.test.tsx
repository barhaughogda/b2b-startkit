import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserEditForm, type User } from '@/components/admin/UserEditForm';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe('UserEditForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const mockUser: User = {
    _id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'provider',
    isActive: true,
    tenantId: 'tenant-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Creating New User', () => {
    it('should render form fields for creating a new user', () => {
      render(
        <UserEditForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      expect(screen.getByText('Create New User')).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should require password for new users', () => {
      render(
        <UserEditForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toBeRequired();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(
        <UserEditForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      render(
        <UserEditForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should validate password length', async () => {
      const user = userEvent.setup();
      render(
        <UserEditForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'short');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i)
        ).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should call onSave with correct data when form is valid', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      render(
        <UserEditForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      await user.type(screen.getByLabelText(/name/i), 'New User');
      await user.type(screen.getByLabelText(/email/i), 'new@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Select role
      const roleSelect = screen.getByLabelText(/role/i);
      await user.click(roleSelect);
      await user.click(screen.getByText('Provider'));

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          name: 'New User',
          email: 'new@example.com',
          role: 'provider',
          isActive: true,
          password: 'password123',
        });
      });
    });
  });

  describe('Editing Existing User', () => {
    it('should render form with user data pre-filled', () => {
      render(
        <UserEditForm
          user={mockUser}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    it('should not require password for existing users', () => {
      render(
        <UserEditForm
          user={mockUser}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).not.toBeRequired();
    });

    it('should allow updating user without password', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      render(
        <UserEditForm
          user={mockUser}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          name: 'Updated Name',
          email: 'test@example.com',
          role: 'provider',
          isActive: true,
          tenantId: 'tenant-1',
        });
      });
    });

    it('should allow changing user role', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      render(
        <UserEditForm
          user={mockUser}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const roleSelect = screen.getByLabelText(/role/i);
      await user.click(roleSelect);
      await user.click(screen.getByText('Admin'));

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'admin',
          })
        );
      });
    });

    it('should allow changing user status', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      render(
        <UserEditForm
          user={mockUser}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const statusSelect = screen.getByLabelText(/status/i);
      await user.click(statusSelect);
      await user.click(screen.getByText('Inactive'));

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            isActive: false,
          })
        );
      });
    });
  });

  describe('Form Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UserEditForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should show loading state when submitting', async () => {
      const user = userEvent.setup();
      mockOnSave.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <UserEditForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      await user.type(screen.getByLabelText(/name/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should display error message when save fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to save user';
      mockOnSave.mockRejectedValue(new Error(errorMessage));

      render(
        <UserEditForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      await user.type(screen.getByLabelText(/name/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should clear errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(
        <UserEditForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Test');

      await waitFor(() => {
        expect(
          screen.queryByText(/name is required/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <UserEditForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveAttribute('aria-required', 'true');

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('aria-required', 'true');
    });

    it('should mark required fields', () => {
      render(
        <UserEditForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const requiredFields = screen.getAllByText('*');
      expect(requiredFields.length).toBeGreaterThan(0);
    });
  });
});


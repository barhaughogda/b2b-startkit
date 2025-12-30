import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MedicalBioForm } from '@/components/patient/profile/MedicalBioForm';
// Use relative import for Convex generated files (they're at root level, not in src/)
// File is 6 levels deep: src/__tests__/unit/components/patient/profile/
// Need 6 ../ segments to reach root where convex/ is located
import { Id } from '../../../../../../convex/_generated/dataModel';

// Mock Convex
const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);

vi.mock('convex/react', () => ({
  useMutation: () => mockUpdateProfile,
}));

// Mock @/lib/auth/react
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: vi.fn(() => ({
    data: {
      user: {
        email: 'patient@demo.com',
      },
    },
    status: 'authenticated',
  })),
}));

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MedicalBioForm', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render form label and description', () => {
      render(<MedicalBioForm patientId={mockPatientId} />);

      expect(screen.getByLabelText(/your medical story/i)).toBeInTheDocument();
      expect(screen.getByText(/share your medical story, concerns/i)).toBeInTheDocument();
    });

    it('should render textarea for medical bio', () => {
      render(<MedicalBioForm patientId={mockPatientId} />);

      const textarea = screen.getByLabelText(/your medical story/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should render save button', () => {
      render(<MedicalBioForm patientId={mockPatientId} />);

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should display initial data when provided', () => {
      const initialData = 'I have a history of hypertension and diabetes. I manage these conditions with medication and regular check-ups.';

      render(<MedicalBioForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue(initialData)).toBeInTheDocument();
    });

    it('should display placeholder text when empty', () => {
      render(<MedicalBioForm patientId={mockPatientId} />);

      const textarea = screen.getByLabelText(/your medical story/i);
      expect(textarea).toHaveAttribute('placeholder');
      expect(textarea.getAttribute('placeholder')).toContain('Tell your healthcare providers');
    });
  });

  describe('Form Interactions', () => {
    it('should update textarea value on input', async () => {
      const user = userEvent.setup();
      render(<MedicalBioForm patientId={mockPatientId} />);

      const textarea = screen.getByLabelText(/your medical story/i);
      await user.type(textarea, 'I have a history of heart disease.');

      expect(textarea).toHaveValue('I have a history of heart disease.');
    });

    it('should handle long text input', async () => {
      const user = userEvent.setup();
      render(<MedicalBioForm patientId={mockPatientId} />);

      const longText = 'This is a very long medical history. '.repeat(50);
      const textarea = screen.getByLabelText(/your medical story/i);
      await user.type(textarea, longText);

      expect(textarea).toHaveValue(longText);
    });

    it('should update when initialData changes', () => {
      const { rerender } = render(<MedicalBioForm patientId={mockPatientId} initialData="Initial text" />);

      expect(screen.getByDisplayValue('Initial text')).toBeInTheDocument();

      rerender(<MedicalBioForm patientId={mockPatientId} initialData="Updated text" />);

      expect(screen.getByDisplayValue('Updated text')).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should call updateProfile on save', async () => {
      const user = userEvent.setup();
      render(<MedicalBioForm patientId={mockPatientId} />);

      const textarea = screen.getByLabelText(/your medical story/i);
      await user.type(textarea, 'Test medical bio');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          patientId: mockPatientId,
          section: 'medicalBio',
          data: 'Test medical bio',
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should save empty string when textarea is empty', async () => {
      const user = userEvent.setup();
      render(<MedicalBioForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          patientId: mockPatientId,
          section: 'medicalBio',
          data: '',
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show loading state while saving', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<MedicalBioForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it('should show success message on successful save', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      render(<MedicalBioForm patientId={mockPatientId} />);

      const textarea = screen.getByLabelText(/your medical story/i);
      await user.type(textarea, 'Test bio');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Medical biography updated', {
          description: 'Your medical biography has been saved.',
        });
      });
    });

    it('should handle save errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockUpdateProfile.mockRejectedValue(new Error('Failed to save'));

      render(<MedicalBioForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should re-enable save button after error', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockRejectedValueOnce(new Error('Failed to save'));

      render(<MedicalBioForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(<MedicalBioForm patientId={mockPatientId} />);

      const textarea = screen.getByLabelText(/your medical story/i);
      expect(textarea).toHaveAttribute('id', 'medicalBio');
    });

    it('should have aria-describedby attribute', () => {
      render(<MedicalBioForm patientId={mockPatientId} />);

      const textarea = screen.getByLabelText(/your medical story/i);
      expect(textarea).toHaveAttribute('aria-describedby', 'medicalBio-description');
    });
  });
});


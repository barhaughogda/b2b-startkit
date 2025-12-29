import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MedicalHistoryForm } from '@/components/patient/profile/MedicalHistoryForm';
// Use relative import for Convex generated files (they're at root level, not in src/)
// File is 6 levels deep: src/__tests__/unit/components/patient/profile/
// Need 6 ../ segments to reach root where convex/ is located
import { Id } from '../../../../../../convex/_generated/dataModel';
import { createMockConvexMutation } from '@/__tests__/utils/mock-convex';

// Mock Convex
const { mockFn: mockUpdateProfile, reset } = createMockConvexMutation();

vi.mock('convex/react', () => ({
  useMutation: () => mockUpdateProfile,
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
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

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Save: ({ className }: { className?: string }) => <div data-testid="icon-save" className={className} />,
  Loader2: ({ className }: { className?: string }) => <div data-testid="icon-loader" className={className} />,
  Plus: ({ className }: { className?: string }) => <div data-testid="icon-plus" className={className} />,
  Trash2: ({ className }: { className?: string }) => <div data-testid="icon-trash" className={className} />,
}));

describe('MedicalHistoryForm', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;

  beforeEach(() => {
    reset();
  });

  describe('Rendering', () => {
    it('should render all form sections', () => {
      render(<MedicalHistoryForm patientId={mockPatientId} />);

      expect(screen.getByText('Chronic Conditions')).toBeInTheDocument();
      expect(screen.getByText('Surgeries')).toBeInTheDocument();
      expect(screen.getByText('Hospitalizations')).toBeInTheDocument();
    });

    it('should render add buttons for each section', () => {
      render(<MedicalHistoryForm patientId={mockPatientId} />);

      expect(screen.getByRole('button', { name: /add condition/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add surgery/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add hospitalization/i })).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<MedicalHistoryForm patientId={mockPatientId} />);

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should display initial data when provided', () => {
      const initialData = {
        chronicConditions: [
          {
            condition: 'Hypertension',
            diagnosisDate: '2020-01-01',
            status: 'active',
            notes: 'Well controlled',
          },
        ],
        surgeries: [
          {
            procedure: 'Appendectomy',
            date: '2019-06-15',
            hospital: 'General Hospital',
            notes: 'Successful',
          },
        ],
        hospitalizations: [
          {
            reason: 'Pneumonia',
            admissionDate: '2021-03-10',
            dischargeDate: '2021-03-15',
            hospital: 'City Hospital',
            notes: 'Recovered well',
          },
        ],
      };

      render(<MedicalHistoryForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Hypertension')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Appendectomy')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Pneumonia')).toBeInTheDocument();
    });
  });

  describe('Chronic Conditions', () => {
    it('should add a new chronic condition', async () => {
      const user = userEvent.setup();
      render(<MedicalHistoryForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add condition/i });
      await user.click(addButton);

      // Should show condition form fields
      await waitFor(() => {
        const conditionInputs = screen.getAllByPlaceholderText('e.g., Hypertension');
        expect(conditionInputs.length).toBeGreaterThan(0);
      });
      // Date inputs don't have labels associated, so we check by type
      const dateInputs = screen.getAllByDisplayValue('');
      const dateTypeInputs = dateInputs.filter(input => input.getAttribute('type') === 'date');
      expect(dateTypeInputs.length).toBeGreaterThan(0);
      // Status is a select element - check by finding selects
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('should remove a chronic condition', async () => {
      const user = userEvent.setup();
      const initialData = {
        chronicConditions: [
          {
            condition: 'Hypertension',
            diagnosisDate: '2020-01-01',
            status: 'active',
          },
        ],
      };

      render(<MedicalHistoryForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Hypertension')).toBeInTheDocument();

      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByDisplayValue('Hypertension')).not.toBeInTheDocument();
      });
    });

    it('should update chronic condition fields', async () => {
      const user = userEvent.setup();
      render(<MedicalHistoryForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add condition/i });
      await user.click(addButton);

      await waitFor(() => {
        const conditionInputs = screen.getAllByPlaceholderText('e.g., Hypertension');
        expect(conditionInputs.length).toBeGreaterThan(0);
      });

      const conditionInputs = screen.getAllByPlaceholderText('e.g., Hypertension');
      const conditionInput = conditionInputs[conditionInputs.length - 1]; // Get the last one (newly added)
      await user.type(conditionInput, 'Diabetes');

      expect(conditionInput).toHaveValue('Diabetes');
    });
  });

  describe('Surgeries', () => {
    it('should add a new surgery', async () => {
      const user = userEvent.setup();
      render(<MedicalHistoryForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add surgery/i });
      await user.click(addButton);

      // Should show surgery form fields
      await waitFor(() => {
        const procedureInputs = screen.getAllByPlaceholderText('e.g., Appendectomy');
        expect(procedureInputs.length).toBeGreaterThan(0);
      });
      // Date inputs don't have labels associated, so we check by type
      const dateInputs = screen.getAllByDisplayValue('');
      const dateTypeInputs = dateInputs.filter(input => input.getAttribute('type') === 'date');
      expect(dateTypeInputs.length).toBeGreaterThan(0);
      const hospitalInputs = screen.getAllByPlaceholderText('Hospital name (optional)');
      expect(hospitalInputs.length).toBeGreaterThan(0);
    });

    it('should remove a surgery', async () => {
      const user = userEvent.setup();
      const initialData = {
        surgeries: [
          {
            procedure: 'Appendectomy',
            date: '2019-06-15',
            hospital: 'General Hospital',
          },
        ],
      };

      render(<MedicalHistoryForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Appendectomy')).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      // Find the remove button for surgeries (should be the second one if there's a condition)
      const surgeryRemoveButton = removeButtons[removeButtons.length - 1];
      await user.click(surgeryRemoveButton);

      await waitFor(() => {
        expect(screen.queryByDisplayValue('Appendectomy')).not.toBeInTheDocument();
      });
    });

    it('should update surgery fields', async () => {
      const user = userEvent.setup();
      render(<MedicalHistoryForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add surgery/i });
      await user.click(addButton);

      await waitFor(() => {
        const procedureInputs = screen.getAllByPlaceholderText('e.g., Appendectomy');
        expect(procedureInputs.length).toBeGreaterThan(0);
      });

      const procedureInputs = screen.getAllByPlaceholderText('e.g., Appendectomy');
      const procedureInput = procedureInputs[procedureInputs.length - 1]; // Get the last one (newly added)
      await user.type(procedureInput, 'Knee Replacement');

      expect(procedureInput).toHaveValue('Knee Replacement');
    });
  });

  describe('Hospitalizations', () => {
    it('should add a new hospitalization', async () => {
      const user = userEvent.setup();
      render(<MedicalHistoryForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add hospitalization/i });
      await user.click(addButton);

      // Should show hospitalization form fields
      await waitFor(() => {
        const reasonInputs = screen.getAllByPlaceholderText('Reason for hospitalization');
        expect(reasonInputs.length).toBeGreaterThan(0);
      });
      // Date inputs don't have labels associated, so we check by type
      const dateInputs = screen.getAllByDisplayValue('');
      const dateTypeInputs = dateInputs.filter(input => input.getAttribute('type') === 'date');
      expect(dateTypeInputs.length).toBeGreaterThanOrEqual(2); // At least admission and discharge dates
      const hospitalInputs = screen.getAllByPlaceholderText('Hospital name (optional)');
      expect(hospitalInputs.length).toBeGreaterThan(0);
    });

    it('should remove a hospitalization', async () => {
      const user = userEvent.setup();
      const initialData = {
        hospitalizations: [
          {
            reason: 'Pneumonia',
            admissionDate: '2021-03-10',
            dischargeDate: '2021-03-15',
            hospital: 'City Hospital',
          },
        ],
      };

      render(<MedicalHistoryForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Pneumonia')).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      // Find the remove button for hospitalizations (should be the last one)
      const hospitalizationRemoveButton = removeButtons[removeButtons.length - 1];
      await user.click(hospitalizationRemoveButton);

      await waitFor(() => {
        expect(screen.queryByDisplayValue('Pneumonia')).not.toBeInTheDocument();
      });
    });

    it('should update hospitalization fields', async () => {
      const user = userEvent.setup();
      render(<MedicalHistoryForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add hospitalization/i });
      await user.click(addButton);

      await waitFor(() => {
        const reasonInputs = screen.getAllByPlaceholderText('Reason for hospitalization');
        expect(reasonInputs.length).toBeGreaterThan(0);
      });

      const reasonInputs = screen.getAllByPlaceholderText('Reason for hospitalization');
      const reasonInput = reasonInputs[reasonInputs.length - 1]; // Get the last one (newly added)
      await user.type(reasonInput, 'Heart Attack');

      expect(reasonInput).toHaveValue('Heart Attack');
    });
  });

  describe('Save Functionality', () => {
    it('should call updateProfile mutation on save', async () => {
      const user = userEvent.setup();
      render(<MedicalHistoryForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          patientId: mockPatientId,
          section: 'medicalHistory',
          data: {
            chronicConditions: [],
            surgeries: [],
            hospitalizations: [],
          },
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show loading state during save', async () => {
      const user = userEvent.setup();
      // Delay the mutation response
      mockUpdateProfile.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(undefined), 100)));

      render(<MedicalHistoryForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should show loading text
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should handle save errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockUpdateProfile.mockRejectedValue(new Error('Save failed'));

      render(<MedicalHistoryForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Form Validation', () => {
    it('should allow saving empty medical history', async () => {
      const user = userEvent.setup();
      render(<MedicalHistoryForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).not.toBeDisabled();

      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalled();
      });
    });
  });
});


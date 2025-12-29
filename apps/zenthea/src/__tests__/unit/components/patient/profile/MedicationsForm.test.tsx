import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MedicationsForm } from '@/components/patient/profile/MedicationsForm';
// Use relative import for Convex generated files (they're at root level, not in src/)
// File is 6 levels deep: src/__tests__/unit/components/patient/profile/
// Need 6 ../ segments to reach root where convex/ is located
import { Id } from '../../../../../../convex/_generated/dataModel';

// Mock Convex
const mockAddMedication = vi.fn().mockResolvedValue(undefined);
const mockRemoveMedication = vi.fn().mockResolvedValue(undefined);

vi.mock('convex/react', () => ({
  useMutation: vi.fn((mutationFn) => {
    // Safe string conversion - handle different mutationFn types
    const fnString = typeof mutationFn === 'function' 
      ? mutationFn.toString() 
      : String(mutationFn || '');
    
    if (fnString.includes('addMedication')) {
      return mockAddMedication;
    }
    if (fnString.includes('removeMedication')) {
      return mockRemoveMedication;
    }
    return vi.fn().mockResolvedValue(undefined);
  }),
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

describe('MedicationsForm', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddMedication.mockReset();
    mockAddMedication.mockResolvedValue(undefined);
    mockRemoveMedication.mockReset();
    mockRemoveMedication.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render form header and description', () => {
      render(<MedicationsForm patientId={mockPatientId} />);

      expect(screen.getByText('Current Medications')).toBeInTheDocument();
      expect(screen.getByText(/include all prescription medications/i)).toBeInTheDocument();
    });

    it('should render add medication button', () => {
      render(<MedicationsForm patientId={mockPatientId} />);

      expect(screen.getByRole('button', { name: /add medication/i })).toBeInTheDocument();
    });

    it('should render informational note', () => {
      render(<MedicationsForm patientId={mockPatientId} />);

      expect(screen.getByText(/note:/i)).toBeInTheDocument();
      expect(screen.getByText(/to add or update medications/i)).toBeInTheDocument();
    });

    it('should display empty state when no medications', () => {
      render(<MedicationsForm patientId={mockPatientId} />);

      expect(screen.getByText(/no medications recorded/i)).toBeInTheDocument();
    });

    it('should display initial data when provided', () => {
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          prescribedBy: 'Dr. Smith',
          startDate: '2023-01-15',
          indication: 'Type 2 Diabetes',
          notes: 'Take with meals',
        },
        {
          name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'Once daily',
          route: 'oral',
          prescribedBy: 'Dr. Johnson',
          startDate: '2023-02-01',
          indication: 'Hypertension',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Metformin')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Lisinopril')).toBeInTheDocument();
      expect(screen.getByDisplayValue('500mg')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10mg')).toBeInTheDocument();
    });
  });

  describe('Medication List Display', () => {
    it('should render all medication fields for each medication', () => {
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          prescribedBy: 'Dr. Smith',
          startDate: '2023-01-15',
          indication: 'Type 2 Diabetes',
          notes: 'Take with meals',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('Medication Name *')).toBeInTheDocument();
      expect(screen.getByText('Dosage *')).toBeInTheDocument();
      expect(screen.getByText('Frequency *')).toBeInTheDocument();
      expect(screen.getByText('Route')).toBeInTheDocument();
      expect(screen.getByText('Prescribed By')).toBeInTheDocument();
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('Indication')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('should display medication name', () => {
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          startDate: '2023-01-15',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Metformin')).toBeInTheDocument();
    });

    it('should display dosage', () => {
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          startDate: '2023-01-15',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('500mg')).toBeInTheDocument();
    });

    it('should display frequency', () => {
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          startDate: '2023-01-15',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Twice daily')).toBeInTheDocument();
    });

    it('should display route as select dropdown', () => {
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          startDate: '2023-01-15',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      const routeSelect = screen.getByDisplayValue('Oral');
      expect(routeSelect).toBeInTheDocument();
    });

    it('should display optional fields when provided', () => {
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          prescribedBy: 'Dr. Smith',
          startDate: '2023-01-15',
          indication: 'Type 2 Diabetes',
          notes: 'Take with meals',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Type 2 Diabetes')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Take with meals')).toBeInTheDocument();
    });

    it('should handle missing optional fields', () => {
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          startDate: '2023-01-15',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      // Should render empty inputs for optional fields
      const prescribedByInput = screen.getByPlaceholderText("Doctor's name");
      expect(prescribedByInput).toHaveValue('');
    });
  });

  describe('Add Medication', () => {
    it('should add a new medication', async () => {
      const user = userEvent.setup();
      render(<MedicationsForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add medication/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockAddMedication).toHaveBeenCalledWith({
          patientId: mockPatientId,
          medication: {
            name: '',
            dosage: '',
            frequency: '',
            route: 'oral',
            startDate: expect.any(String),
            indication: '',
            notes: '',
          },
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show success message when adding medication', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      render(<MedicationsForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add medication/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Medication added', {
          description: 'Please fill in the medication details.',
        });
      });
    });

    it('should handle add medication errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockAddMedication.mockRejectedValue(new Error('Failed to add medication'));

      render(<MedicationsForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add medication/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Remove Medication', () => {
    it('should remove a medication', async () => {
      const user = userEvent.setup();
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          startDate: '2023-01-15',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Metformin')).toBeInTheDocument();

      const removeButton = screen.getByRole('button', { name: /remove medication/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockRemoveMedication).toHaveBeenCalledWith({
          patientId: mockPatientId,
          index: 0,
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show success message when removing medication', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          startDate: '2023-01-15',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      const removeButton = screen.getByRole('button', { name: /remove medication/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Medication removed', {
          description: 'The medication has been removed from your profile.',
        });
      });
    });

    it('should handle remove medication errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockRemoveMedication.mockRejectedValue(new Error('Failed to remove medication'));

      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          startDate: '2023-01-15',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      const removeButton = screen.getByRole('button', { name: /remove medication/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should remove correct medication when multiple medications exist', async () => {
      const user = userEvent.setup();
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          startDate: '2023-01-15',
        },
        {
          name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'Once daily',
          route: 'oral',
          startDate: '2023-02-01',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      const removeButtons = screen.getAllByRole('button', { name: /remove medication/i });
      // Click the second remove button (for Lisinopril)
      await user.click(removeButtons[1]);

      await waitFor(() => {
        expect(mockRemoveMedication).toHaveBeenCalledWith({
          patientId: mockPatientId,
          index: 1,
          userEmail: 'patient@demo.com',
        });
      });
    });
  });

  describe('Route Options', () => {
    it('should display all route options', () => {
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          startDate: '2023-01-15',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      const routeSelect = screen.getByDisplayValue('Oral');
      expect(routeSelect).toBeInTheDocument();
    });

    it('should display different route values correctly', () => {
      const initialData = [
        {
          name: 'Topical Cream',
          dosage: '1%',
          frequency: 'Apply twice daily',
          route: 'topical',
          startDate: '2023-01-15',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      const routeSelect = screen.getByDisplayValue('Topical');
      expect(routeSelect).toBeInTheDocument();
    });
  });

  describe('Multiple Medications', () => {
    it('should display multiple medications correctly', () => {
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          startDate: '2023-01-15',
        },
        {
          name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'Once daily',
          route: 'oral',
          startDate: '2023-02-01',
        },
        {
          name: 'Aspirin',
          dosage: '81mg',
          frequency: 'Once daily',
          route: 'oral',
          startDate: '2023-03-01',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Metformin')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Lisinopril')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Aspirin')).toBeInTheDocument();
    });

    it('should render remove button for each medication', () => {
      const initialData = [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          route: 'oral',
          startDate: '2023-01-15',
        },
        {
          name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'Once daily',
          route: 'oral',
          startDate: '2023-02-01',
        },
      ];

      render(<MedicationsForm patientId={mockPatientId} initialData={initialData} />);

      const removeButtons = screen.getAllByRole('button', { name: /remove medication/i });
      expect(removeButtons).toHaveLength(2);
    });
  });
});


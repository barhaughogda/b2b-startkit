import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImmunizationsForm } from '@/components/patient/profile/ImmunizationsForm';
// Use relative import for Convex generated files (they're at root level, not in src/)
// File is 6 levels deep: src/__tests__/unit/components/patient/profile/
// Need 6 ../ segments to reach root where convex/ is located
import { Id } from '../../../../../../convex/_generated/dataModel';

// Mock Convex
const mockAddImmunization = vi.fn().mockResolvedValue(undefined);
const mockRemoveImmunization = vi.fn().mockResolvedValue(undefined);

vi.mock('convex/react', () => ({
  useMutation: vi.fn((mutationFn) => {
    // Safe string conversion - handle different mutationFn types
    const fnString = typeof mutationFn === 'function' 
      ? mutationFn.toString() 
      : String(mutationFn || '');
    
    if (fnString.includes('addImmunization')) {
      return mockAddImmunization;
    }
    if (fnString.includes('removeImmunization')) {
      return mockRemoveImmunization;
    }
    if (fnString.includes('updatePatientProfile')) {
      return vi.fn().mockResolvedValue(undefined);
    }
    return vi.fn().mockResolvedValue(undefined);
  }),
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

describe('ImmunizationsForm', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddImmunization.mockReset();
    mockAddImmunization.mockResolvedValue(undefined);
    mockRemoveImmunization.mockReset();
    mockRemoveImmunization.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render form title and description', () => {
      render(<ImmunizationsForm patientId={mockPatientId} />);

      expect(screen.getByText('Immunization Records')).toBeInTheDocument();
      expect(screen.getByText(/track your vaccination history/i)).toBeInTheDocument();
    });

    it('should render add immunization button', () => {
      render(<ImmunizationsForm patientId={mockPatientId} />);

      expect(screen.getByRole('button', { name: /add immunization/i })).toBeInTheDocument();
    });

    it('should display empty state when no immunizations', () => {
      render(<ImmunizationsForm patientId={mockPatientId} />);

      expect(screen.getByText(/no immunizations recorded/i)).toBeInTheDocument();
    });

    it('should display initial data when provided', () => {
      const initialData = [
        {
          vaccine: 'COVID-19',
          dateAdministered: '2021-03-15',
          lotNumber: 'ABC123',
          administeredBy: 'Dr. Smith',
          location: 'Hospital',
          notes: 'First dose',
        },
        {
          vaccine: 'Flu',
          dateAdministered: '2022-10-01',
          lotNumber: 'DEF456',
          administeredBy: 'Pharmacy',
          location: 'Local Pharmacy',
          notes: '',
        },
      ];

      render(<ImmunizationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('COVID-19')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2021-03-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ABC123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Hospital')).toBeInTheDocument();
      expect(screen.getByDisplayValue('First dose')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Flu')).toBeInTheDocument();
    });
  });

  describe('Add Immunization', () => {
    it('should add a new immunization', async () => {
      const user = userEvent.setup();
      render(<ImmunizationsForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add immunization/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockAddImmunization).toHaveBeenCalledWith({
          patientId: mockPatientId,
          immunization: {
            vaccine: '',
            dateAdministered: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            lotNumber: '',
            administeredBy: '',
            location: '',
            notes: '',
          },
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show success message when adding immunization', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      render(<ImmunizationsForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add immunization/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Immunization added', {
          description: 'Please fill in the immunization details.',
        });
      });
    });

    it('should handle add immunization errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockAddImmunization.mockRejectedValue(new Error('Failed to add immunization'));

      render(<ImmunizationsForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add immunization/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Remove Immunization', () => {
    it('should remove an immunization', async () => {
      const user = userEvent.setup();
      const initialData = [
        {
          vaccine: 'COVID-19',
          dateAdministered: '2021-03-15',
          lotNumber: 'ABC123',
          administeredBy: 'Dr. Smith',
          location: 'Hospital',
          notes: 'First dose',
        },
      ];

      render(<ImmunizationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('COVID-19')).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button', { name: /remove immunization/i });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(mockRemoveImmunization).toHaveBeenCalledWith({
          patientId: mockPatientId,
          index: 0,
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show success message when removing immunization', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      const initialData = [
        {
          vaccine: 'COVID-19',
          dateAdministered: '2021-03-15',
          lotNumber: 'ABC123',
          administeredBy: 'Dr. Smith',
          location: 'Hospital',
        },
      ];

      render(<ImmunizationsForm patientId={mockPatientId} initialData={initialData} />);

      const removeButtons = screen.getAllByRole('button', { name: /remove immunization/i });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Immunization removed', {
          description: 'The immunization has been removed.',
        });
      });
    });

    it('should handle remove immunization errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockRemoveImmunization.mockRejectedValue(new Error('Failed to remove immunization'));

      const initialData = [
        {
          vaccine: 'COVID-19',
          dateAdministered: '2021-03-15',
          lotNumber: 'ABC123',
          administeredBy: 'Dr. Smith',
          location: 'Hospital',
        },
      ];

      render(<ImmunizationsForm patientId={mockPatientId} initialData={initialData} />);

      const removeButtons = screen.getAllByRole('button', { name: /remove immunization/i });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Immunization Display', () => {
    it('should display all immunization fields', () => {
      const initialData = [
        {
          vaccine: 'COVID-19',
          dateAdministered: '2021-03-15',
          lotNumber: 'ABC123',
          administeredBy: 'Dr. Smith',
          location: 'Hospital',
          notes: 'First dose',
        },
      ];

      render(<ImmunizationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('Vaccine Name')).toBeInTheDocument();
      expect(screen.getByText('Date Administered')).toBeInTheDocument();
      expect(screen.getByText('Lot Number')).toBeInTheDocument();
      expect(screen.getByText('Administered By')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('should handle immunizations without optional fields', () => {
      const initialData = [
        {
          vaccine: 'Flu',
          dateAdministered: '2022-10-01',
          lotNumber: undefined,
          administeredBy: undefined,
          location: undefined,
          notes: undefined,
        },
      ];

      render(<ImmunizationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Flu')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2022-10-01')).toBeInTheDocument();
    });

    it('should display multiple immunizations', () => {
      const initialData = [
        {
          vaccine: 'COVID-19',
          dateAdministered: '2021-03-15',
          lotNumber: 'ABC123',
          administeredBy: 'Dr. Smith',
          location: 'Hospital',
        },
        {
          vaccine: 'Flu',
          dateAdministered: '2022-10-01',
          lotNumber: 'DEF456',
          administeredBy: 'Pharmacy',
          location: 'Local Pharmacy',
        },
        {
          vaccine: 'Tetanus',
          dateAdministered: '2020-05-10',
          lotNumber: 'GHI789',
          administeredBy: 'Dr. Johnson',
          location: 'Clinic',
        },
      ];

      render(<ImmunizationsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('COVID-19')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Flu')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Tetanus')).toBeInTheDocument();
    });
  });
});


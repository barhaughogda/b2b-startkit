import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FamilyHistoryForm } from '@/components/patient/profile/FamilyHistoryForm';
// Use relative import for Convex generated files (they're at root level, not in src/)
// File is 6 levels deep: src/__tests__/unit/components/patient/profile/
// Need 6 ../ segments to reach root where convex/ is located
import { Id } from '../../../../../../convex/_generated/dataModel';

// Mock Convex
const mockAddFamilyHistory = vi.fn().mockResolvedValue(undefined);
const mockRemoveFamilyHistory = vi.fn().mockResolvedValue(undefined);

vi.mock('convex/react', () => ({
  useMutation: vi.fn((mutationFn) => {
    // Safe string conversion - handle different mutationFn types
    const fnString = typeof mutationFn === 'function' 
      ? mutationFn.toString() 
      : String(mutationFn || '');
    
    if (fnString.includes('addFamilyHistory')) {
      return mockAddFamilyHistory;
    }
    if (fnString.includes('removeFamilyHistory')) {
      return mockRemoveFamilyHistory;
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

describe('FamilyHistoryForm', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddFamilyHistory.mockReset();
    mockAddFamilyHistory.mockResolvedValue(undefined);
    mockRemoveFamilyHistory.mockReset();
    mockRemoveFamilyHistory.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render form title and description', () => {
      render(<FamilyHistoryForm patientId={mockPatientId} />);

      expect(screen.getByText('Family Medical History')).toBeInTheDocument();
      expect(screen.getByText(/medical conditions affecting your family members/i)).toBeInTheDocument();
    });

    it('should render add entry button', () => {
      render(<FamilyHistoryForm patientId={mockPatientId} />);

      expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
    });

    it('should display empty state when no entries', () => {
      render(<FamilyHistoryForm patientId={mockPatientId} />);

      expect(screen.getByText(/no family history recorded/i)).toBeInTheDocument();
    });

    it('should display initial data when provided', () => {
      const initialData = [
        {
          relationship: 'Mother',
          condition: 'Diabetes',
          ageAtDiagnosis: 45,
          currentAge: 65,
          deceased: false,
          notes: 'Type 2 diabetes',
        },
        {
          relationship: 'Father',
          condition: 'Heart Disease',
          ageAtDiagnosis: 50,
          currentAge: undefined,
          deceased: true,
          notes: '',
        },
      ];

      render(<FamilyHistoryForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Mother')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Diabetes')).toBeInTheDocument();
      expect(screen.getByDisplayValue('45')).toBeInTheDocument();
      expect(screen.getByDisplayValue('65')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Father')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Heart Disease')).toBeInTheDocument();
    });

    it('should render informational note', () => {
      render(<FamilyHistoryForm patientId={mockPatientId} />);

      expect(screen.getByText(/family history helps identify genetic risk factors/i)).toBeInTheDocument();
    });
  });

  describe('Add Entry', () => {
    it('should add a new family history entry', async () => {
      const user = userEvent.setup();
      render(<FamilyHistoryForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add entry/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockAddFamilyHistory).toHaveBeenCalledWith({
          patientId: mockPatientId,
          entry: {
            relationship: '',
            condition: '',
            ageAtDiagnosis: undefined,
            currentAge: undefined,
            deceased: false,
            notes: '',
          },
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show success message when adding entry', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      render(<FamilyHistoryForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add entry/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Family history entry added', {
          description: 'Please fill in the details.',
        });
      });
    });

    it('should handle add entry errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockAddFamilyHistory.mockRejectedValue(new Error('Failed to add entry'));

      render(<FamilyHistoryForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add entry/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Remove Entry', () => {
    it('should remove a family history entry', async () => {
      const user = userEvent.setup();
      const initialData = [
        {
          relationship: 'Mother',
          condition: 'Diabetes',
          ageAtDiagnosis: 45,
          currentAge: 65,
          deceased: false,
          notes: 'Type 2 diabetes',
        },
      ];

      render(<FamilyHistoryForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Mother')).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button', { name: /remove entry/i });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(mockRemoveFamilyHistory).toHaveBeenCalledWith({
          patientId: mockPatientId,
          index: 0,
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show success message when removing entry', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      const initialData = [
        {
          relationship: 'Mother',
          condition: 'Diabetes',
          ageAtDiagnosis: 45,
          currentAge: 65,
          deceased: false,
        },
      ];

      render(<FamilyHistoryForm patientId={mockPatientId} initialData={initialData} />);

      const removeButtons = screen.getAllByRole('button', { name: /remove entry/i });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Entry removed', {
          description: 'The family history entry has been removed.',
        });
      });
    });

    it('should handle remove entry errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockRemoveFamilyHistory.mockRejectedValue(new Error('Failed to remove entry'));

      const initialData = [
        {
          relationship: 'Mother',
          condition: 'Diabetes',
          ageAtDiagnosis: 45,
          currentAge: 65,
          deceased: false,
        },
      ];

      render(<FamilyHistoryForm patientId={mockPatientId} initialData={initialData} />);

      const removeButtons = screen.getAllByRole('button', { name: /remove entry/i });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Entry Display', () => {
    it('should display all entry fields', () => {
      const initialData = [
        {
          relationship: 'Mother',
          condition: 'Diabetes',
          ageAtDiagnosis: 45,
          currentAge: 65,
          deceased: false,
          notes: 'Type 2 diabetes',
        },
      ];

      render(<FamilyHistoryForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('Relationship')).toBeInTheDocument();
      expect(screen.getByText('Condition')).toBeInTheDocument();
      expect(screen.getByText('Age at Diagnosis')).toBeInTheDocument();
      expect(screen.getByText('Current Age')).toBeInTheDocument();
      expect(screen.getByText('Deceased')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('should display deceased checkbox as checked when true', () => {
      const initialData = [
        {
          relationship: 'Father',
          condition: 'Heart Disease',
          ageAtDiagnosis: 50,
          currentAge: undefined,
          deceased: true,
        },
      ];

      render(<FamilyHistoryForm patientId={mockPatientId} initialData={initialData} />);

      const checkbox = screen.getByLabelText('Deceased');
      expect(checkbox).toBeChecked();
    });

    it('should display deceased checkbox as unchecked when false', () => {
      const initialData = [
        {
          relationship: 'Mother',
          condition: 'Diabetes',
          ageAtDiagnosis: 45,
          currentAge: 65,
          deceased: false,
        },
      ];

      render(<FamilyHistoryForm patientId={mockPatientId} initialData={initialData} />);

      const checkbox = screen.getByLabelText('Deceased');
      expect(checkbox).not.toBeChecked();
    });

    it('should handle entries without optional fields', () => {
      const initialData = [
        {
          relationship: 'Sibling',
          condition: 'Asthma',
          ageAtDiagnosis: undefined,
          currentAge: undefined,
          deceased: false,
          notes: '',
        },
      ];

      render(<FamilyHistoryForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Sibling')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Asthma')).toBeInTheDocument();
    });

    it('should display multiple entries', () => {
      const initialData = [
        {
          relationship: 'Mother',
          condition: 'Diabetes',
          ageAtDiagnosis: 45,
          currentAge: 65,
          deceased: false,
        },
        {
          relationship: 'Father',
          condition: 'Heart Disease',
          ageAtDiagnosis: 50,
          currentAge: undefined,
          deceased: true,
        },
        {
          relationship: 'Grandmother',
          condition: 'Cancer',
          ageAtDiagnosis: 60,
          currentAge: 80,
          deceased: false,
        },
      ];

      render(<FamilyHistoryForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Mother')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Father')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Grandmother')).toBeInTheDocument();
    });
  });
});


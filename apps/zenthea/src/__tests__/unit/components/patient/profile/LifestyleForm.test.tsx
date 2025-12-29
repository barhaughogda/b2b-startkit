import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LifestyleForm } from '@/components/patient/profile/LifestyleForm';
// Use relative import for Convex generated files (they're at root level, not in src/)
// File is 6 levels deep: src/__tests__/unit/components/patient/profile/
// Need 6 ../ segments to reach root where convex/ is located
import { Id } from '../../../../../../convex/_generated/dataModel';

// Mock Convex
const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);

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

describe('LifestyleForm', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render all lifestyle sections', () => {
      render(<LifestyleForm patientId={mockPatientId} />);

      expect(screen.getByText('Smoking Status')).toBeInTheDocument();
      expect(screen.getByText('Alcohol Use')).toBeInTheDocument();
      expect(screen.getByText('Exercise')).toBeInTheDocument();
      expect(screen.getByText('Dietary Patterns')).toBeInTheDocument();
      expect(screen.getByText('Occupational Exposures')).toBeInTheDocument();
    });

    it('should render smoking status dropdown', () => {
      render(<LifestyleForm patientId={mockPatientId} />);

      expect(screen.getByLabelText(/do you smoke/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Never')).toBeInTheDocument();
    });

    it('should render alcohol use dropdown', () => {
      render(<LifestyleForm patientId={mockPatientId} />);

      expect(screen.getByLabelText(/alcohol consumption/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('None')).toBeInTheDocument();
    });

    it('should render exercise frequency dropdown', () => {
      render(<LifestyleForm patientId={mockPatientId} />);

      expect(screen.getByLabelText(/exercise frequency/i)).toBeInTheDocument();
    });

    it('should render exercise types input', () => {
      render(<LifestyleForm patientId={mockPatientId} />);

      expect(screen.getByLabelText(/types of exercise/i)).toBeInTheDocument();
    });

    it('should render dietary patterns input', () => {
      render(<LifestyleForm patientId={mockPatientId} />);

      expect(screen.getByLabelText(/dietary preferences/i)).toBeInTheDocument();
    });

    it('should render occupational exposures input', () => {
      render(<LifestyleForm patientId={mockPatientId} />);

      expect(screen.getByLabelText(/exposures/i)).toBeInTheDocument();
    });

    it('should display initial data when provided', () => {
      const initialData = {
        smokingStatus: 'former',
        smokingHistory: {
          packsPerDay: 1.5,
          yearsSmoked: 10,
          quitDate: '2020-01-15',
        },
        alcoholUse: 'occasional',
        alcoholDetails: '1-2 drinks per week',
        exerciseFrequency: 'daily',
        exerciseTypes: ['Running', 'Swimming'],
        dietaryPatterns: ['Vegetarian'],
        occupationalExposures: 'Chemicals',
      };

      render(<LifestyleForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Former Smoker')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Occasional')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Daily')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Running, Swimming')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Vegetarian')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Chemicals')).toBeInTheDocument();
    });
  });

  describe('Smoking Status', () => {
    it('should show smoking history fields when status is "former"', async () => {
      const user = userEvent.setup();
      render(<LifestyleForm patientId={mockPatientId} />);

      const smokingSelect = screen.getByLabelText(/do you smoke/i);
      await user.selectOptions(smokingSelect, 'former');

      await waitFor(() => {
        expect(screen.getByLabelText(/packs per day/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/years smoked/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/quit date/i)).toBeInTheDocument();
      });
    });

    it('should hide smoking history fields when status is "never"', async () => {
      const user = userEvent.setup();
      const initialData = {
        smokingStatus: 'former',
        smokingHistory: {
          packsPerDay: 1.5,
          yearsSmoked: 10,
          quitDate: '2020-01-15',
        },
      };

      render(<LifestyleForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByLabelText(/packs per day/i)).toBeInTheDocument();

      const smokingSelect = screen.getByLabelText(/do you smoke/i);
      await user.selectOptions(smokingSelect, 'never');

      await waitFor(() => {
        expect(screen.queryByLabelText(/packs per day/i)).not.toBeInTheDocument();
      });
    });

    it('should display smoking history when provided', () => {
      const initialData = {
        smokingStatus: 'former',
        smokingHistory: {
          packsPerDay: 1.5,
          yearsSmoked: 10,
          quitDate: '2020-01-15',
        },
      };

      render(<LifestyleForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('1.5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2020-01-15')).toBeInTheDocument();
    });
  });

  describe('Alcohol Use', () => {
    it('should show alcohol details field when alcohol use is not "none"', async () => {
      const user = userEvent.setup();
      render(<LifestyleForm patientId={mockPatientId} />);

      const alcoholSelect = screen.getByLabelText(/alcohol consumption/i);
      await user.selectOptions(alcoholSelect, 'occasional');

      await waitFor(() => {
        expect(screen.getByLabelText(/details/i)).toBeInTheDocument();
      });
    });

    it('should hide alcohol details field when alcohol use is "none"', async () => {
      const user = userEvent.setup();
      const initialData = {
        alcoholUse: 'occasional',
        alcoholDetails: '1-2 drinks per week',
      };

      render(<LifestyleForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByLabelText(/details/i)).toBeInTheDocument();

      const alcoholSelect = screen.getByLabelText(/alcohol consumption/i);
      await user.selectOptions(alcoholSelect, 'none');

      await waitFor(() => {
        expect(screen.queryByLabelText(/details/i)).not.toBeInTheDocument();
      });
    });

    it('should display alcohol details when provided', () => {
      const initialData = {
        alcoholUse: 'moderate',
        alcoholDetails: '3-4 drinks per week',
      };

      render(<LifestyleForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('3-4 drinks per week')).toBeInTheDocument();
    });
  });

  describe('Exercise Types', () => {
    it('should handle comma-separated exercise types', async () => {
      const user = userEvent.setup();
      render(<LifestyleForm patientId={mockPatientId} />);

      const exerciseTypesInput = screen.getByLabelText(/types of exercise/i);
      await user.type(exerciseTypesInput, 'Running, Swimming, Weight Training');

      // Wait for the value to stabilize after typing (form processes character by character)
      await waitFor(() => {
        expect(exerciseTypesInput).toHaveValue('Running, Swimming, Weight Training');
      });
    });

    it('should display multiple exercise types', () => {
      const initialData = {
        exerciseTypes: ['Running', 'Swimming', 'Cycling'],
      };

      render(<LifestyleForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Running, Swimming, Cycling')).toBeInTheDocument();
    });
  });

  describe('Dietary Patterns', () => {
    it('should handle comma-separated dietary patterns', async () => {
      const user = userEvent.setup();
      render(<LifestyleForm patientId={mockPatientId} />);

      const dietaryInput = screen.getByLabelText(/dietary preferences/i);
      await user.type(dietaryInput, 'Vegetarian, Kosher');

      // Wait for the value to stabilize after typing (form processes character by character)
      await waitFor(() => {
        expect(dietaryInput).toHaveValue('Vegetarian, Kosher');
      });
    });

    it('should display multiple dietary patterns', () => {
      const initialData = {
        dietaryPatterns: ['Vegetarian', 'Vegan'],
      };

      render(<LifestyleForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Vegetarian, Vegan')).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should call updateProfile on save', async () => {
      const user = userEvent.setup();
      render(<LifestyleForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          patientId: mockPatientId,
          section: 'lifestyle',
          data: expect.objectContaining({
            smokingStatus: 'never',
            alcoholUse: 'none',
          }),
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show loading state while saving', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<LifestyleForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it('should show success message on successful save', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      render(<LifestyleForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Lifestyle information updated', {
          description: 'Your lifestyle information has been saved.',
        });
      });
    });

    it('should handle save errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockUpdateProfile.mockRejectedValue(new Error('Failed to save'));

      render(<LifestyleForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should update smoking status on change', async () => {
      const user = userEvent.setup();
      render(<LifestyleForm patientId={mockPatientId} />);

      const smokingSelect = screen.getByLabelText(/do you smoke/i);
      await user.selectOptions(smokingSelect, 'current');

      expect(screen.getByDisplayValue('Current Smoker')).toBeInTheDocument();
    });

    it('should update alcohol use on change', async () => {
      const user = userEvent.setup();
      render(<LifestyleForm patientId={mockPatientId} />);

      const alcoholSelect = screen.getByLabelText(/alcohol consumption/i);
      await user.selectOptions(alcoholSelect, 'moderate');

      expect(screen.getByDisplayValue('Moderate')).toBeInTheDocument();
    });

    it('should update exercise frequency on change', async () => {
      const user = userEvent.setup();
      render(<LifestyleForm patientId={mockPatientId} />);

      const exerciseSelect = screen.getByLabelText(/exercise frequency/i);
      await user.selectOptions(exerciseSelect, 'weekly');

      expect(screen.getByDisplayValue('Weekly')).toBeInTheDocument();
    });

    it('should update occupational exposures on input', async () => {
      const user = userEvent.setup();
      render(<LifestyleForm patientId={mockPatientId} />);

      const exposuresInput = screen.getByLabelText(/exposures/i);
      await user.type(exposuresInput, 'Chemicals, Dust');

      expect(exposuresInput).toHaveValue('Chemicals, Dust');
    });
  });
});


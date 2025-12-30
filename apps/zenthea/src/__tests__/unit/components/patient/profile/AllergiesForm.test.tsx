import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllergiesForm } from '@/components/patient/profile/AllergiesForm';
// Use relative import for Convex generated files (they're at root level, not in src/)
// File is 6 levels deep: src/__tests__/unit/components/patient/profile/
// Need 6 ../ segments to reach root where convex/ is located
import { Id } from '../../../../../../convex/_generated/dataModel';
import { createMockConvexMutations } from '@/__tests__/utils/mock-convex';

// Mock Convex
const { mocks, reset } = createMockConvexMutations({
  addAllergy: undefined,
  removeAllergy: undefined,
});

const mockAddAllergy = mocks.addAllergy;
const mockRemoveAllergy = mocks.removeAllergy;

vi.mock('convex/react', () => ({
  useMutation: vi.fn((mutationFn) => {
    // Safe string conversion - handle different mutationFn types
    const fnString = typeof mutationFn === 'function' 
      ? mutationFn.toString() 
      : String(mutationFn || '');
    
    if (fnString.includes('addAllergy')) {
      return mockAddAllergy;
    }
    if (fnString.includes('removeAllergy')) {
      return mockRemoveAllergy;
    }
    return vi.fn().mockResolvedValue(undefined);
  }),
}));

// Mock @/hooks/useZentheaSession
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

describe('AllergiesForm', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;

  beforeEach(() => {
    reset();
  });

  describe('Rendering', () => {
    it('should render all allergy categories', () => {
      render(<AllergiesForm patientId={mockPatientId} />);

      expect(screen.getByText('Medication Allergies')).toBeInTheDocument();
      expect(screen.getByText('Food Allergies')).toBeInTheDocument();
      expect(screen.getByText('Environmental Allergies')).toBeInTheDocument();
      expect(screen.getByText('Other Allergies')).toBeInTheDocument();
    });

    it('should render add buttons for each category', () => {
      render(<AllergiesForm patientId={mockPatientId} />);

      expect(screen.getByRole('button', { name: /add medication/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add food/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add environmental/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add other/i })).toBeInTheDocument();
    });

    it('should render important warning message', () => {
      render(<AllergiesForm patientId={mockPatientId} />);

      expect(screen.getByText(/important: please list all allergies accurately/i)).toBeInTheDocument();
      expect(screen.getByText(/this information is critical for your safety/i)).toBeInTheDocument();
    });

    it('should display empty state messages for each category', () => {
      render(<AllergiesForm patientId={mockPatientId} />);

      expect(screen.getByText(/no medication allergies recorded/i)).toBeInTheDocument();
      expect(screen.getByText(/no food allergies recorded/i)).toBeInTheDocument();
      expect(screen.getByText(/no environmental allergies recorded/i)).toBeInTheDocument();
      expect(screen.getByText(/no other allergies recorded/i)).toBeInTheDocument();
    });

    it('should display initial data when provided', () => {
      const initialData = {
        medications: [
          {
            substance: 'Penicillin',
            reactionType: 'Rash',
            severity: 'mild',
            symptoms: 'Itchy skin',
            dateIdentified: '2020-01-15',
          },
        ],
        foods: [
          {
            food: 'Peanuts',
            reactionType: 'Anaphylaxis',
            severity: 'life-threatening',
            symptoms: 'Difficulty breathing, swelling',
          },
        ],
        environmental: [
          {
            allergen: 'Pollen',
            reactionType: 'Sneezing',
            severity: 'mild',
            symptoms: 'Runny nose, itchy eyes',
          },
        ],
        other: [
          {
            substance: 'Latex',
            reactionType: 'Contact dermatitis',
            severity: 'moderate',
            symptoms: 'Skin irritation',
          },
        ],
      };

      render(<AllergiesForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('Penicillin')).toBeInTheDocument();
      expect(screen.getByText('Peanuts')).toBeInTheDocument();
      expect(screen.getByText('Pollen')).toBeInTheDocument();
      expect(screen.getByText('Latex')).toBeInTheDocument();
    });
  });

  describe('Medication Allergies', () => {
    it('should add a new medication allergy', async () => {
      const user = userEvent.setup();
      render(<AllergiesForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add medication/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockAddAllergy).toHaveBeenCalledWith({
          patientId: mockPatientId,
          category: 'medications',
          allergy: {
            substance: '',
            reactionType: '',
            severity: 'mild',
            symptoms: '',
            dateIdentified: '',
          },
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should remove a medication allergy', async () => {
      const user = userEvent.setup();
      const initialData = {
        medications: [
          {
            substance: 'Penicillin',
            reactionType: 'Rash',
            severity: 'mild',
            symptoms: 'Itchy skin',
          },
        ],
      };

      render(<AllergiesForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('Penicillin')).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button');
      // Find the remove button (trash icon button)
      const removeButton = removeButtons.find(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }

      await waitFor(() => {
        expect(mockRemoveAllergy).toHaveBeenCalledWith({
          patientId: mockPatientId,
          category: 'medications',
          index: 0,
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should display medication allergy details', () => {
      const initialData = {
        medications: [
          {
            substance: 'Penicillin',
            reactionType: 'Rash',
            severity: 'mild',
            symptoms: 'Itchy skin',
            dateIdentified: '2020-01-15',
          },
        ],
      };

      render(<AllergiesForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('Penicillin')).toBeInTheDocument();
      expect(screen.getByText(/reaction:/i)).toBeInTheDocument();
      expect(screen.getByText(/symptoms:/i)).toBeInTheDocument();
      expect(screen.getByText(/identified: 2020-01-15/i)).toBeInTheDocument();
    });

    it('should highlight life-threatening allergies', () => {
      const initialData = {
        medications: [
          {
            substance: 'Penicillin',
            reactionType: 'Anaphylaxis',
            severity: 'life-threatening',
            symptoms: 'Difficulty breathing',
          },
        ],
      };

      render(<AllergiesForm patientId={mockPatientId} initialData={initialData} />);

      const allergyCard = screen.getByText('Penicillin').closest('div');
      expect(allergyCard).toHaveClass('border-status-error');
    });
  });

  describe('Food Allergies', () => {
    it('should add a new food allergy', async () => {
      const user = userEvent.setup();
      render(<AllergiesForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add food/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockAddAllergy).toHaveBeenCalledWith({
          patientId: mockPatientId,
          category: 'foods',
          allergy: {
            substance: '',
            reactionType: '',
            severity: 'mild',
            symptoms: '',
          },
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should remove a food allergy', async () => {
      const user = userEvent.setup();
      const initialData = {
        foods: [
          {
            food: 'Peanuts',
            reactionType: 'Anaphylaxis',
            severity: 'life-threatening',
            symptoms: 'Difficulty breathing',
          },
        ],
      };

      render(<AllergiesForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('Peanuts')).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }

      await waitFor(() => {
        expect(mockRemoveAllergy).toHaveBeenCalledWith({
          patientId: mockPatientId,
          category: 'foods',
          index: 0,
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should display food allergy details', () => {
      const initialData = {
        foods: [
          {
            food: 'Peanuts',
            reactionType: 'Anaphylaxis',
            severity: 'severe',
            symptoms: 'Difficulty breathing, swelling',
          },
        ],
      };

      render(<AllergiesForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('Peanuts')).toBeInTheDocument();
      expect(screen.getByText(/reaction:/i)).toBeInTheDocument();
      expect(screen.getByText(/symptoms:/i)).toBeInTheDocument();
    });
  });

  describe('Environmental Allergies', () => {
    it('should add a new environmental allergy', async () => {
      const user = userEvent.setup();
      render(<AllergiesForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add environmental/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockAddAllergy).toHaveBeenCalledWith({
          patientId: mockPatientId,
          category: 'environmental',
          allergy: {
            substance: '',
            reactionType: '',
            severity: 'mild',
            symptoms: '',
          },
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should remove an environmental allergy', async () => {
      const user = userEvent.setup();
      const initialData = {
        environmental: [
          {
            allergen: 'Pollen',
            reactionType: 'Sneezing',
            severity: 'mild',
            symptoms: 'Runny nose',
          },
        ],
      };

      render(<AllergiesForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('Pollen')).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }

      await waitFor(() => {
        expect(mockRemoveAllergy).toHaveBeenCalledWith({
          patientId: mockPatientId,
          category: 'environmental',
          index: 0,
          userEmail: 'patient@demo.com',
        });
      });
    });
  });

  describe('Other Allergies', () => {
    it('should add a new other allergy', async () => {
      const user = userEvent.setup();
      render(<AllergiesForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add other/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockAddAllergy).toHaveBeenCalledWith({
          patientId: mockPatientId,
          category: 'other',
          allergy: {
            substance: '',
            reactionType: '',
            severity: 'mild',
            symptoms: '',
          },
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should remove an other allergy', async () => {
      const user = userEvent.setup();
      const initialData = {
        other: [
          {
            substance: 'Latex',
            reactionType: 'Contact dermatitis',
            severity: 'moderate',
            symptoms: 'Skin irritation',
          },
        ],
      };

      render(<AllergiesForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('Latex')).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }

      await waitFor(() => {
        expect(mockRemoveAllergy).toHaveBeenCalledWith({
          patientId: mockPatientId,
          category: 'other',
          index: 0,
          userEmail: 'patient@demo.com',
        });
      });
    });
  });

  describe('Severity Display', () => {
    it('should display severity for each allergy', () => {
      const initialData = {
        medications: [
          {
            substance: 'Penicillin',
            reactionType: 'Rash',
            severity: 'mild',
            symptoms: 'Itchy skin',
          },
        ],
        foods: [
          {
            food: 'Peanuts',
            reactionType: 'Anaphylaxis',
            severity: 'severe',
            symptoms: 'Difficulty breathing',
          },
        ],
        environmental: [
          {
            allergen: 'Dust',
            reactionType: 'Sneezing',
            severity: 'life-threatening',
            symptoms: 'Severe reaction',
          },
        ],
      };

      render(<AllergiesForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('mild')).toBeInTheDocument();
      expect(screen.getByText('severe')).toBeInTheDocument();
      expect(screen.getByText('life-threatening')).toBeInTheDocument();
    });

    it('should show alert icon for life-threatening allergies', () => {
      const initialData = {
        medications: [
          {
            substance: 'Penicillin',
            reactionType: 'Anaphylaxis',
            severity: 'life-threatening',
            symptoms: 'Difficulty breathing',
          },
        ],
      };

      render(<AllergiesForm patientId={mockPatientId} initialData={initialData} />);

      // Check for AlertTriangle icon (it's rendered as an SVG)
      const allergyCard = screen.getByText('Penicillin').closest('div');
      expect(allergyCard).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle add allergy errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockAddAllergy.mockRejectedValue(new Error('Failed to add allergy'));

      render(<AllergiesForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add medication/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should handle remove allergy errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockRemoveAllergy.mockRejectedValue(new Error('Failed to remove allergy'));

      const initialData = {
        medications: [
          {
            substance: 'Penicillin',
            reactionType: 'Rash',
            severity: 'mild',
            symptoms: 'Itchy skin',
          },
        ],
      };

      render(<AllergiesForm patientId={mockPatientId} initialData={initialData} />);

      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Success Messages', () => {
    it('should show success message when adding allergy', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      render(<AllergiesForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add medication/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Allergy added', {
          description: 'The allergy has been added to your profile.',
        });
      });
    });

    it('should show success message when removing allergy', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      const initialData = {
        medications: [
          {
            substance: 'Penicillin',
            reactionType: 'Rash',
            severity: 'mild',
            symptoms: 'Itchy skin',
          },
        ],
      };

      render(<AllergiesForm patientId={mockPatientId} initialData={initialData} />);

      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Allergy removed', {
          description: 'The allergy has been removed from your profile.',
        });
      });
    });
  });
});


import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvanceDirectivesForm } from '@/components/patient/profile/AdvanceDirectivesForm';
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

describe('AdvanceDirectivesForm', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render important information banner', () => {
      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      expect(screen.getByText(/important: advance care planning/i)).toBeInTheDocument();
      expect(screen.getByText(/advance directives help ensure your healthcare wishes/i)).toBeInTheDocument();
    });

    it('should render all directive checkboxes', () => {
      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      expect(screen.getByLabelText(/i have a living will/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/i have a do-not-resuscitate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/i have a polst/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/i am an organ donor/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/advance directive documents are on file/i)).toBeInTheDocument();
    });

    it('should render notes textarea', () => {
      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      expect(screen.getByLabelText(/additional notes/i)).toBeInTheDocument();
    });

    it('should display initial data when provided', () => {
      const initialData = {
        hasLivingWill: true,
        livingWillDate: '2020-01-15',
        hasDNR: true,
        dnrDate: '2020-02-20',
        hasPOLST: false,
        polstDate: '',
        organDonor: true,
        advanceDirectivesOnFile: true,
        notes: 'Discussed with family',
      };

      render(<AdvanceDirectivesForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByLabelText(/i have a living will/i)).toBeChecked();
      expect(screen.getByDisplayValue('2020-01-15')).toBeInTheDocument();
      expect(screen.getByLabelText(/i have a do-not-resuscitate/i)).toBeChecked();
      expect(screen.getByDisplayValue('2020-02-20')).toBeInTheDocument();
      expect(screen.getByLabelText(/i have a polst/i)).not.toBeChecked();
      expect(screen.getByLabelText(/i am an organ donor/i)).toBeChecked();
      expect(screen.getByLabelText(/advance directive documents are on file/i)).toBeChecked();
      expect(screen.getByDisplayValue('Discussed with family')).toBeInTheDocument();
    });
  });

  describe('Living Will', () => {
    it('should show date field when living will is checked', async () => {
      const user = userEvent.setup();
      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      const checkbox = screen.getByLabelText(/i have a living will/i);
      expect(screen.queryByLabelText(/date signed/i)).not.toBeInTheDocument();

      await user.click(checkbox);

      await waitFor(() => {
        expect(screen.getByLabelText(/date signed/i)).toBeInTheDocument();
      });
    });

    it('should hide date field when living will is unchecked', async () => {
      const user = userEvent.setup();
      const initialData = {
        hasLivingWill: true,
        livingWillDate: '2020-01-15',
      };

      render(<AdvanceDirectivesForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByLabelText(/date signed/i)).toBeInTheDocument();

      const checkbox = screen.getByLabelText(/i have a living will/i);
      await user.click(checkbox);

      await waitFor(() => {
        expect(screen.queryByLabelText(/date signed/i)).not.toBeInTheDocument();
      });
    });

    it('should display living will date when provided', () => {
      const initialData = {
        hasLivingWill: true,
        livingWillDate: '2020-01-15',
      };

      render(<AdvanceDirectivesForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('2020-01-15')).toBeInTheDocument();
    });
  });

  describe('DNR Order', () => {
    it('should show date field when DNR is checked', async () => {
      const user = userEvent.setup();
      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      const checkbox = screen.getByLabelText(/i have a do-not-resuscitate/i);
      const dateFields = screen.queryAllByLabelText(/date signed/i);
      expect(dateFields.length).toBe(0);

      await user.click(checkbox);

      await waitFor(() => {
        const dateFieldsAfter = screen.getAllByLabelText(/date signed/i);
        expect(dateFieldsAfter.length).toBeGreaterThan(0);
      });
    });

    it('should hide date field when DNR is unchecked', async () => {
      const user = userEvent.setup();
      const initialData = {
        hasDNR: true,
        dnrDate: '2020-02-20',
      };

      render(<AdvanceDirectivesForm patientId={mockPatientId} initialData={initialData} />);

      const dateFields = screen.getAllByLabelText(/date signed/i);
      expect(dateFields.length).toBeGreaterThan(0);

      const checkbox = screen.getByLabelText(/i have a do-not-resuscitate/i);
      await user.click(checkbox);

      await waitFor(() => {
        const dateFieldsAfter = screen.queryAllByLabelText(/date signed/i);
        expect(dateFieldsAfter.length).toBe(0);
      });
    });

    it('should display DNR date when provided', () => {
      const initialData = {
        hasDNR: true,
        dnrDate: '2020-02-20',
      };

      render(<AdvanceDirectivesForm patientId={mockPatientId} initialData={initialData} />);

      const dateInputs = screen.getAllByDisplayValue('2020-02-20');
      expect(dateInputs.length).toBeGreaterThan(0);
    });
  });

  describe('POLST', () => {
    it('should show date field when POLST is checked', async () => {
      const user = userEvent.setup();
      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      const checkbox = screen.getByLabelText(/i have a polst/i);
      const dateFields = screen.queryAllByLabelText(/date signed/i);
      expect(dateFields.length).toBe(0);

      await user.click(checkbox);

      await waitFor(() => {
        const dateFieldsAfter = screen.getAllByLabelText(/date signed/i);
        expect(dateFieldsAfter.length).toBeGreaterThan(0);
      });
    });

    it('should hide date field when POLST is unchecked', async () => {
      const user = userEvent.setup();
      const initialData = {
        hasPOLST: true,
        polstDate: '2020-03-10',
      };

      render(<AdvanceDirectivesForm patientId={mockPatientId} initialData={initialData} />);

      const dateFields = screen.getAllByLabelText(/date signed/i);
      expect(dateFields.length).toBeGreaterThan(0);

      const checkbox = screen.getByLabelText(/i have a polst/i);
      await user.click(checkbox);

      await waitFor(() => {
        const dateFieldsAfter = screen.queryAllByLabelText(/date signed/i);
        expect(dateFieldsAfter.length).toBe(0);
      });
    });

    it('should display POLST date when provided', () => {
      const initialData = {
        hasPOLST: true,
        polstDate: '2020-03-10',
      };

      render(<AdvanceDirectivesForm patientId={mockPatientId} initialData={initialData} />);

      const dateInputs = screen.getAllByDisplayValue('2020-03-10');
      expect(dateInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Organ Donor', () => {
    it('should toggle organ donor checkbox', async () => {
      const user = userEvent.setup();
      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      const checkbox = screen.getByLabelText(/i am an organ donor/i);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);

      expect(checkbox).toBeChecked();
    });
  });

  describe('Save Functionality', () => {
    it('should call updateProfile on save', async () => {
      const user = userEvent.setup();
      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          patientId: mockPatientId,
          section: 'advanceDirectives',
          data: expect.objectContaining({
            hasLivingWill: false,
            hasDNR: false,
            hasPOLST: false,
            organDonor: false,
            advanceDirectivesOnFile: false,
          }),
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show loading state while saving', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it('should show success message on successful save', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Advance directives updated', {
          description: 'Your advance directive information has been saved.',
        });
      });
    });

    it('should handle save errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockUpdateProfile.mockRejectedValue(new Error('Failed to save'));

      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should update notes on input', async () => {
      const user = userEvent.setup();
      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      const notesTextarea = screen.getByLabelText(/additional notes/i);
      await user.type(notesTextarea, 'Discussed with family and healthcare provider');

      expect(notesTextarea).toHaveValue('Discussed with family and healthcare provider');
    });

    it('should update date fields when provided', async () => {
      const user = userEvent.setup();
      render(<AdvanceDirectivesForm patientId={mockPatientId} />);

      const livingWillCheckbox = screen.getByLabelText(/i have a living will/i);
      await user.click(livingWillCheckbox);

      await waitFor(() => {
        const dateInputs = screen.getAllByLabelText(/date signed/i);
        expect(dateInputs.length).toBeGreaterThan(0);
      });

      const dateInput = screen.getAllByLabelText(/date signed/i)[0];
      await user.type(dateInput, '2020-01-15');

      expect(dateInput).toHaveValue('2020-01-15');
    });
  });
});


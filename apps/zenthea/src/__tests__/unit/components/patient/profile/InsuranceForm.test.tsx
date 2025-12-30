import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InsuranceForm } from '@/components/patient/profile/InsuranceForm';
// Use relative import for Convex generated files (they're at root level, not in src/)
// File is 6 levels deep: src/__tests__/unit/components/patient/profile/
// Need 6 ../ segments to reach root where convex/ is located
import { Id } from '../../../../../../convex/_generated/dataModel';

// Mock Convex
const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);

vi.mock('convex/react', () => ({
  useMutation: () => mockUpdateProfile,
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

describe('InsuranceForm', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render primary insurance section', () => {
      render(<InsuranceForm patientId={mockPatientId} />);

      expect(screen.getByText('Primary Insurance')).toBeInTheDocument();
    });

    it('should render secondary insurance section', () => {
      render(<InsuranceForm patientId={mockPatientId} />);

      expect(screen.getByText('Secondary Insurance')).toBeInTheDocument();
      expect(screen.getByText('Optional')).toBeInTheDocument();
    });

    it('should render all primary insurance fields', () => {
      render(<InsuranceForm patientId={mockPatientId} />);

      expect(screen.getByLabelText(/insurance provider/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/policy number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/group number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/subscriber name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/subscriber date of birth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/effective date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/employer name/i)).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<InsuranceForm patientId={mockPatientId} />);

      expect(screen.getByRole('button', { name: /save insurance information/i })).toBeInTheDocument();
    });

    it('should render add secondary insurance button when secondary is not present', () => {
      render(<InsuranceForm patientId={mockPatientId} />);

      expect(screen.getByRole('button', { name: /add secondary insurance/i })).toBeInTheDocument();
    });
  });

  describe('Primary Insurance', () => {
    it('should display initial primary insurance data', () => {
      const initialData = {
        primary: {
          provider: 'Blue Cross Blue Shield',
          policyNumber: 'ABC123456',
          groupNumber: 'GRP001',
          subscriberName: 'John Doe',
          subscriberDOB: '1980-01-15',
          effectiveDate: '2023-01-01',
          employerName: 'Acme Corp',
        },
      };

      render(<InsuranceForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Blue Cross Blue Shield')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ABC123456')).toBeInTheDocument();
      expect(screen.getByDisplayValue('GRP001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
    });

    it('should update provider field', async () => {
      const user = userEvent.setup();
      render(<InsuranceForm patientId={mockPatientId} />);

      const providerInput = screen.getByLabelText(/insurance provider/i);
      await user.type(providerInput, 'Blue Cross Blue Shield');

      expect(providerInput).toHaveValue('Blue Cross Blue Shield');
    });

    it('should update policy number field', async () => {
      const user = userEvent.setup();
      render(<InsuranceForm patientId={mockPatientId} />);

      const policyInput = screen.getByLabelText(/policy number/i);
      await user.type(policyInput, 'ABC123456');

      expect(policyInput).toHaveValue('ABC123456');
    });

    it('should update group number field', async () => {
      const user = userEvent.setup();
      render(<InsuranceForm patientId={mockPatientId} />);

      const groupInput = screen.getByLabelText(/group number/i);
      await user.type(groupInput, 'GRP001');

      expect(groupInput).toHaveValue('GRP001');
    });

    it('should update subscriber name field', async () => {
      const user = userEvent.setup();
      render(<InsuranceForm patientId={mockPatientId} />);

      const subscriberInput = screen.getByLabelText(/subscriber name/i);
      await user.type(subscriberInput, 'John Doe');

      expect(subscriberInput).toHaveValue('John Doe');
    });

    it('should update subscriber DOB field', async () => {
      const user = userEvent.setup();
      render(<InsuranceForm patientId={mockPatientId} />);

      const dobInput = screen.getByLabelText(/subscriber date of birth/i);
      await user.type(dobInput, '1980-01-15');

      expect(dobInput).toHaveValue('1980-01-15');
    });

    it('should update effective date field', async () => {
      const user = userEvent.setup();
      render(<InsuranceForm patientId={mockPatientId} />);

      const effectiveDateInput = screen.getByLabelText(/effective date/i);
      await user.type(effectiveDateInput, '2023-01-01');

      expect(effectiveDateInput).toHaveValue('2023-01-01');
    });

    it('should update employer name field', async () => {
      const user = userEvent.setup();
      render(<InsuranceForm patientId={mockPatientId} />);

      const employerInput = screen.getByLabelText(/employer name/i);
      await user.type(employerInput, 'Acme Corp');

      expect(employerInput).toHaveValue('Acme Corp');
    });
  });

  describe('Secondary Insurance', () => {
    it('should add secondary insurance', async () => {
      const user = userEvent.setup();
      render(<InsuranceForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add secondary insurance/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/secondary.*insurance provider/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/secondary.*policy number/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/secondary.*group number/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/secondary.*subscriber name/i)).toBeInTheDocument();
      });
    });

    it('should display initial secondary insurance data', () => {
      const initialData = {
        primary: {
          provider: 'Blue Cross Blue Shield',
          policyNumber: 'ABC123456',
          subscriberName: 'John Doe',
          effectiveDate: '2023-01-01',
        },
        secondary: {
          provider: 'Aetna',
          policyNumber: 'XYZ789',
          groupNumber: 'GRP002',
          subscriberName: 'Jane Doe',
        },
      };

      render(<InsuranceForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Aetna')).toBeInTheDocument();
      expect(screen.getByDisplayValue('XYZ789')).toBeInTheDocument();
      expect(screen.getByDisplayValue('GRP002')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    });

    it('should update secondary insurance fields', async () => {
      const user = userEvent.setup();
      const initialData = {
        primary: {
          provider: 'Blue Cross Blue Shield',
          policyNumber: 'ABC123456',
          subscriberName: 'John Doe',
          effectiveDate: '2023-01-01',
        },
        secondary: {
          provider: 'Aetna',
          policyNumber: 'XYZ789',
          subscriberName: 'Jane Doe',
        },
      };

      render(<InsuranceForm patientId={mockPatientId} initialData={initialData} />);

      const providerInput = screen.getByLabelText(/secondary.*insurance provider/i);
      await user.clear(providerInput);
      await user.type(providerInput, 'United Healthcare');

      expect(providerInput).toHaveValue('United Healthcare');
    });

    it('should remove secondary insurance', async () => {
      const user = userEvent.setup();
      const initialData = {
        primary: {
          provider: 'Blue Cross Blue Shield',
          policyNumber: 'ABC123456',
          subscriberName: 'John Doe',
          effectiveDate: '2023-01-01',
        },
        secondary: {
          provider: 'Aetna',
          policyNumber: 'XYZ789',
          subscriberName: 'Jane Doe',
        },
      };

      render(<InsuranceForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Aetna')).toBeInTheDocument();

      const removeButton = screen.getByRole('button', { name: /remove secondary insurance/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByDisplayValue('Aetna')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add secondary insurance/i })).toBeInTheDocument();
      });
    });

    it('should not show add button when secondary insurance exists', () => {
      const initialData = {
        primary: {
          provider: 'Blue Cross Blue Shield',
          policyNumber: 'ABC123456',
          subscriberName: 'John Doe',
          effectiveDate: '2023-01-01',
        },
        secondary: {
          provider: 'Aetna',
          policyNumber: 'XYZ789',
          subscriberName: 'Jane Doe',
        },
      };

      render(<InsuranceForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.queryByRole('button', { name: /add secondary insurance/i })).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable save button when required fields are empty', () => {
      render(<InsuranceForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save insurance information/i });
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when required fields are filled', async () => {
      const user = userEvent.setup();
      render(<InsuranceForm patientId={mockPatientId} />);

      const providerInput = screen.getByLabelText(/insurance provider/i);
      await user.type(providerInput, 'Blue Cross Blue Shield');

      const policyInput = screen.getByLabelText(/policy number/i);
      await user.type(policyInput, 'ABC123456');

      const subscriberInput = screen.getByLabelText(/subscriber name/i);
      await user.type(subscriberInput, 'John Doe');

      const effectiveDateInput = screen.getByLabelText(/effective date/i);
      await user.type(effectiveDateInput, '2023-01-01');

      const saveButton = screen.getByRole('button', { name: /save insurance information/i });
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('should require provider, policy number, subscriber name, and effective date', async () => {
      const user = userEvent.setup();
      render(<InsuranceForm patientId={mockPatientId} />);

      // Fill only some required fields
      const providerInput = screen.getByLabelText(/insurance provider/i);
      await user.type(providerInput, 'Blue Cross Blue Shield');

      const policyInput = screen.getByLabelText(/policy number/i);
      await user.type(policyInput, 'ABC123456');

      // Missing subscriber name and effective date
      const saveButton = screen.getByRole('button', { name: /save insurance information/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Save Functionality', () => {
    it('should save insurance information', async () => {
      const user = userEvent.setup();
      render(<InsuranceForm patientId={mockPatientId} />);

      // Fill required fields
      const providerInput = screen.getByLabelText(/insurance provider/i);
      await user.type(providerInput, 'Blue Cross Blue Shield');

      const policyInput = screen.getByLabelText(/policy number/i);
      await user.type(policyInput, 'ABC123456');

      const subscriberInput = screen.getByLabelText(/subscriber name/i);
      await user.type(subscriberInput, 'John Doe');

      const effectiveDateInput = screen.getByLabelText(/effective date/i);
      await user.type(effectiveDateInput, '2023-01-01');

      const saveButton = screen.getByRole('button', { name: /save insurance information/i });
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });

      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          patientId: mockPatientId,
          section: 'insurance',
          data: expect.objectContaining({
            primary: expect.objectContaining({
              provider: 'Blue Cross Blue Shield',
              policyNumber: 'ABC123456',
              subscriberName: 'John Doe',
              effectiveDate: '2023-01-01',
            }),
          }),
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should save both primary and secondary insurance', async () => {
      const user = userEvent.setup();
      render(<InsuranceForm patientId={mockPatientId} />);

      // Fill primary insurance
      const providerInput = screen.getByLabelText(/insurance provider/i);
      await user.type(providerInput, 'Blue Cross Blue Shield');

      const policyInput = screen.getByLabelText(/policy number/i);
      await user.type(policyInput, 'ABC123456');

      const subscriberInput = screen.getByLabelText(/subscriber name/i);
      await user.type(subscriberInput, 'John Doe');

      const effectiveDateInput = screen.getByLabelText(/effective date/i);
      await user.type(effectiveDateInput, '2023-01-01');

      // Add secondary insurance
      const addButton = screen.getByRole('button', { name: /add secondary insurance/i });
      await user.click(addButton);

      await waitFor(() => {
        const secondaryProviderInput = screen.getByLabelText(/secondary.*insurance provider/i);
        expect(secondaryProviderInput).toBeInTheDocument();
      });

      const secondaryProviderInput = screen.getByLabelText(/secondary.*insurance provider/i);
      await user.type(secondaryProviderInput, 'Aetna');

      const secondaryPolicyInput = screen.getByLabelText(/secondary.*policy number/i);
      await user.type(secondaryPolicyInput, 'XYZ789');

      const secondarySubscriberInput = screen.getByLabelText(/secondary.*subscriber name/i);
      await user.type(secondarySubscriberInput, 'Jane Doe');

      const saveButton = screen.getByRole('button', { name: /save insurance information/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          patientId: mockPatientId,
          section: 'insurance',
          data: expect.objectContaining({
            primary: expect.objectContaining({
              provider: 'Blue Cross Blue Shield',
            }),
            secondary: expect.objectContaining({
              provider: 'Aetna',
              policyNumber: 'XYZ789',
              subscriberName: 'Jane Doe',
            }),
          }),
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show success message when saving', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      render(<InsuranceForm patientId={mockPatientId} />);

      // Fill required fields
      const providerInput = screen.getByLabelText(/insurance provider/i);
      await user.type(providerInput, 'Blue Cross Blue Shield');

      const policyInput = screen.getByLabelText(/policy number/i);
      await user.type(policyInput, 'ABC123456');

      const subscriberInput = screen.getByLabelText(/subscriber name/i);
      await user.type(subscriberInput, 'John Doe');

      const effectiveDateInput = screen.getByLabelText(/effective date/i);
      await user.type(effectiveDateInput, '2023-01-01');

      const saveButton = screen.getByRole('button', { name: /save insurance information/i });
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });

      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Insurance updated', {
          description: 'Your insurance information has been saved.',
        });
      });
    });

    it('should show loading state during save', async () => {
      const user = userEvent.setup();
      // Delay the mutation response
      mockUpdateProfile.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(undefined), 100)));

      render(<InsuranceForm patientId={mockPatientId} />);

      // Fill required fields
      const providerInput = screen.getByLabelText(/insurance provider/i);
      await user.type(providerInput, 'Blue Cross Blue Shield');

      const policyInput = screen.getByLabelText(/policy number/i);
      await user.type(policyInput, 'ABC123456');

      const subscriberInput = screen.getByLabelText(/subscriber name/i);
      await user.type(subscriberInput, 'John Doe');

      const effectiveDateInput = screen.getByLabelText(/effective date/i);
      await user.type(effectiveDateInput, '2023-01-01');

      const saveButton = screen.getByRole('button', { name: /save insurance information/i });
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });

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

      render(<InsuranceForm patientId={mockPatientId} />);

      // Fill required fields
      const providerInput = screen.getByLabelText(/insurance provider/i);
      await user.type(providerInput, 'Blue Cross Blue Shield');

      const policyInput = screen.getByLabelText(/policy number/i);
      await user.type(policyInput, 'ABC123456');

      const subscriberInput = screen.getByLabelText(/subscriber name/i);
      await user.type(subscriberInput, 'John Doe');

      const effectiveDateInput = screen.getByLabelText(/effective date/i);
      await user.type(effectiveDateInput, '2023-01-01');

      const saveButton = screen.getByRole('button', { name: /save insurance information/i });
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });

      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });
});


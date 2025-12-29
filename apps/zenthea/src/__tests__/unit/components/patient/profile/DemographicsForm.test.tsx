import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemographicsForm } from '@/components/patient/profile/DemographicsForm';
// Use relative import for Convex generated files (they're at root level, not in src/)
// File is 6 levels deep: src/__tests__/unit/components/patient/profile/
// Need 6 ../ segments to reach root where convex/ is located
import { Id } from '../../../../../../convex/_generated/dataModel';
import { createMockConvexMutation } from '@/__tests__/utils/mock-convex';

const { mockFn: mockUpdateProfile, reset } = createMockConvexMutation();

// Mock Convex
vi.mock('convex/react', () => ({
  useMutation: () => mockUpdateProfile,
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        email: 'patient@demo.com',
      },
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DemographicsForm', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;

  beforeEach(() => {
    reset();
  });

  it('should render all form fields', () => {
    render(<DemographicsForm patientId={mockPatientId} />);

    expect(screen.getByLabelText(/preferred name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/biological sex/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gender identity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preferred pronouns/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/marital status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/occupation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/primary language/i)).toBeInTheDocument();
  });

  it('should display initial data when provided', () => {
    const initialData = {
      preferredName: 'John',
      gender: 'male',
      primaryLanguage: 'en',
    };

    render(<DemographicsForm patientId={mockPatientId} initialData={initialData} />);

    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    // For select elements, getByDisplayValue checks the option text, not the value
    // The option with value="male" displays "Male" (capitalized)
    expect(screen.getByDisplayValue('Male')).toBeInTheDocument();
  });

  it('should require primary language', () => {
    render(<DemographicsForm patientId={mockPatientId} />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it('should enable save button when required fields are filled', async () => {
    const user = userEvent.setup();
    render(<DemographicsForm patientId={mockPatientId} />);

    const genderSelect = screen.getByLabelText(/biological sex/i);
    await user.selectOptions(genderSelect, 'male');

    const languageSelect = screen.getByLabelText(/primary language/i);
    await user.selectOptions(languageSelect, 'en');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });
});


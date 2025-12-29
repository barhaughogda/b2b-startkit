import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderIdentitySection } from '@/components/provider/profile/sections/ProviderIdentitySection';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';

describe('ProviderIdentitySection', () => {
  const user = userEvent.setup();
  const mockUpdateField = vi.fn();
  const mockErrors = {};

  const defaultFormData: ProviderProfileUpdateData = {
    specialties: [],
    languages: [],
    bio: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render specialties input field', () => {
      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByLabelText(/Specialties/i)).toBeInTheDocument();
    });

    it('should render languages input field', () => {
      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByLabelText(/Languages Spoken/i)).toBeInTheDocument();
    });

    it('should render bio textarea field', () => {
      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByLabelText(/Professional Bio/i)).toBeInTheDocument();
    });

    it('should display existing form data values', () => {
      const formData: ProviderProfileUpdateData = {
        specialties: ['Cardiology', 'Internal Medicine'],
        languages: ['English', 'Spanish'],
        bio: 'Experienced cardiologist',
      };

      render(
        <ProviderIdentitySection
          formData={formData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByDisplayValue('Cardiology, Internal Medicine')).toBeInTheDocument();
      expect(screen.getByDisplayValue('English, Spanish')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Experienced cardiologist')).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should call updateField when specialties input changes', async () => {
      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const specialtiesInput = screen.getByLabelText(/Specialties/i);
      await user.clear(specialtiesInput);
      
      // Use fireEvent.change to simulate a complete input change
      fireEvent.change(specialtiesInput, { target: { value: 'Cardiology, Neurology' } });

      // Verify that updateField was called with the correct parsed array
      expect(mockUpdateField).toHaveBeenCalledWith('specialties', ['Cardiology', 'Neurology']);
    });

    it('should call updateField when languages input changes', async () => {
      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const languagesInput = screen.getByLabelText(/Languages Spoken/i);
      await user.clear(languagesInput);
      
      // Use fireEvent.change to simulate a complete input change
      fireEvent.change(languagesInput, { target: { value: 'English, Spanish, French' } });

      // Verify that updateField was called with the correct parsed array
      expect(mockUpdateField).toHaveBeenCalledWith('languages', ['English', 'Spanish', 'French']);
    });

    it('should call updateField when bio textarea changes', async () => {
      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const bioInput = screen.getByLabelText(/Professional Bio/i);
      await user.clear(bioInput);
      
      // Use fireEvent.change to simulate a complete input change
      fireEvent.change(bioInput, { target: { value: 'New bio text' } });

      expect(mockUpdateField).toHaveBeenCalledWith('bio', 'New bio text');
    });

    it('should handle comma-separated specialties correctly', async () => {
      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const specialtiesInput = screen.getByLabelText(/Specialties/i);
      
      // Use fireEvent.change to simulate a complete input change with extra spaces
      fireEvent.change(specialtiesInput, { target: { value: 'Cardiology, Internal Medicine,  Neurology  ' } });

      // Verify that updateField was called with the correctly parsed array (trimmed and filtered)
      expect(mockUpdateField).toHaveBeenCalledWith('specialties', [
        'Cardiology',
        'Internal Medicine',
        'Neurology',
      ]);
    });
  });

  describe('Error Display', () => {
    it('should display error message for specialties field', () => {
      const errors = {
        specialties: { message: 'At least one specialty is required' },
      };

      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={errors}
        />
      );

      expect(screen.getByText(/At least one specialty is required/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Specialties/i)).toHaveClass('border-status-error');
    });

    it('should display error message for languages field', () => {
      const errors = {
        languages: { message: 'At least one language is required' },
      };

      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={errors}
        />
      );

      expect(screen.getByText(/At least one language is required/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Languages Spoken/i)).toHaveClass('border-status-error');
    });

    it('should display error message for bio field', () => {
      const errors = {
        bio: { message: 'Bio must be at least 10 characters' },
      };

      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={errors}
        />
      );

      expect(screen.getByText(/Bio must be at least 10 characters/i)).toBeInTheDocument();
    });
  });

  describe('Helper Text', () => {
    it('should display helper text for specialties field', () => {
      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByText(/Separate multiple specialties with commas/i)).toBeInTheDocument();
    });

    it('should display helper text for languages field', () => {
      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(
        screen.getByText(/List all languages you can communicate in with patients/i)
      ).toBeInTheDocument();
    });

    it('should display helper text for bio field', () => {
      render(
        <ProviderIdentitySection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByText(/This will be visible on your public profile/i)).toBeInTheDocument();
    });
  });
});


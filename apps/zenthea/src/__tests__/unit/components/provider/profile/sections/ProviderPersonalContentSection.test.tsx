import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderPersonalContentSection } from '@/components/provider/profile/sections/ProviderPersonalContentSection';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';

describe('ProviderPersonalContentSection', () => {
  const user = userEvent.setup();
  const mockUpdateField = vi.fn();
  const mockErrors = {};

  const defaultFormData: ProviderProfileUpdateData = {
    specialties: [],
    languages: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render detailed bio textarea', () => {
      render(
        <ProviderPersonalContentSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByLabelText(/Detailed Bio/i)).toBeInTheDocument();
    });

    it('should render philosophy of care textarea', () => {
      render(
        <ProviderPersonalContentSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByLabelText(/Philosophy of Care/i)).toBeInTheDocument();
    });

    it('should render why I became a doctor textarea', () => {
      render(
        <ProviderPersonalContentSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByLabelText(/Why I Became a Doctor/i)).toBeInTheDocument();
    });

    it('should display existing form data values', () => {
      const formData: ProviderProfileUpdateData = {
        specialties: [],
        languages: [],
        detailedBio: 'Detailed bio text',
        philosophyOfCare: 'Patient-centered care',
        whyIBecameADoctor: 'Passion for helping people',
      };

      render(
        <ProviderPersonalContentSection
          formData={formData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByDisplayValue('Detailed bio text')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Patient-centered care')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Passion for helping people')).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should call updateField when detailed bio changes', async () => {
      render(
        <ProviderPersonalContentSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const detailedBioInput = screen.getByLabelText(/Detailed Bio/i);
      await user.clear(detailedBioInput);
      await user.type(detailedBioInput, 'New detailed bio');

      expect(mockUpdateField).toHaveBeenCalledWith('detailedBio', 'New detailed bio');
    });

    it('should call updateField when philosophy of care changes', async () => {
      render(
        <ProviderPersonalContentSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const philosophyInput = screen.getByLabelText(/Philosophy of Care/i);
      await user.clear(philosophyInput);
      await user.type(philosophyInput, 'New philosophy');

      expect(mockUpdateField).toHaveBeenCalledWith('philosophyOfCare', 'New philosophy');
    });

    it('should call updateField when why I became a doctor changes', async () => {
      render(
        <ProviderPersonalContentSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const storyInput = screen.getByLabelText(/Why I Became a Doctor/i);
      await user.clear(storyInput);
      await user.type(storyInput, 'New story');

      expect(mockUpdateField).toHaveBeenCalledWith('whyIBecameADoctor', 'New story');
    });
  });

  describe('Error Display', () => {
    it('should display error message for detailed bio field', () => {
      const errors = {
        detailedBio: { message: 'Detailed bio must be less than 5000 characters' },
      };

      render(
        <ProviderPersonalContentSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={errors}
        />
      );

      expect(
        screen.getByText(/Detailed bio must be less than 5000 characters/i)
      ).toBeInTheDocument();
    });

    it('should display error message for philosophy of care field', () => {
      const errors = {
        philosophyOfCare: { message: 'Philosophy of care must be less than 2000 characters' },
      };

      render(
        <ProviderPersonalContentSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={errors}
        />
      );

      expect(
        screen.getByText(/Philosophy of care must be less than 2000 characters/i)
      ).toBeInTheDocument();
    });
  });

  describe('Helper Text', () => {
    it('should display helper text for detailed bio', () => {
      render(
        <ProviderPersonalContentSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(
        screen.getByText(/Optional: Provide more detailed information about your background/i)
      ).toBeInTheDocument();
    });

    it('should display helper text for philosophy of care', () => {
      render(
        <ProviderPersonalContentSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(
        screen.getByText(/Optional: Share your approach to patient care/i)
      ).toBeInTheDocument();
    });

    it('should display helper text for why I became a doctor', () => {
      render(
        <ProviderPersonalContentSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(
        screen.getByText(/Optional: Share your personal journey/i)
      ).toBeInTheDocument();
    });
  });
});


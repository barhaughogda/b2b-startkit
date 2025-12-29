import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderPracticeDetailsSection } from '@/components/provider/profile/sections/ProviderPracticeDetailsSection';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';

describe('ProviderPracticeDetailsSection', () => {
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
    it('should render conditions treated input field', () => {
      render(
        <ProviderPracticeDetailsSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByLabelText(/Conditions Treated/i)).toBeInTheDocument();
    });

    it('should render procedures performed input field', () => {
      render(
        <ProviderPracticeDetailsSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByLabelText(/Procedures Performed/i)).toBeInTheDocument();
    });

    it('should display existing form data values', () => {
      const formData: ProviderProfileUpdateData = {
        specialties: [],
        languages: [],
        conditionsTreated: ['Hypertension', 'Heart Disease'],
        proceduresPerformed: ['EKG', 'Echocardiogram'],
      };

      render(
        <ProviderPracticeDetailsSection
          formData={formData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByDisplayValue('Hypertension, Heart Disease')).toBeInTheDocument();
      expect(screen.getByDisplayValue('EKG, Echocardiogram')).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should call updateField when conditions treated changes', async () => {
      render(
        <ProviderPracticeDetailsSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const conditionsInput = screen.getByLabelText(/Conditions Treated/i);
      await user.clear(conditionsInput);
      await user.type(conditionsInput, 'Diabetes, Hypertension');

      expect(mockUpdateField).toHaveBeenCalledWith('conditionsTreated', [
        'Diabetes',
        'Hypertension',
      ]);
    });

    it('should call updateField when procedures performed changes', async () => {
      render(
        <ProviderPracticeDetailsSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const proceduresInput = screen.getByLabelText(/Procedures Performed/i);
      await user.clear(proceduresInput);
      await user.type(proceduresInput, 'Annual Physical, EKG');

      expect(mockUpdateField).toHaveBeenCalledWith('proceduresPerformed', [
        'Annual Physical',
        'EKG',
      ]);
    });

    it('should handle comma-separated values correctly', async () => {
      render(
        <ProviderPracticeDetailsSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const conditionsInput = screen.getByLabelText(/Conditions Treated/i);
      await user.type(conditionsInput, 'Diabetes,  Hypertension  , Heart Disease');

      expect(mockUpdateField).toHaveBeenCalledWith('conditionsTreated', [
        'Diabetes',
        'Hypertension',
        'Heart Disease',
      ]);
    });
  });
});


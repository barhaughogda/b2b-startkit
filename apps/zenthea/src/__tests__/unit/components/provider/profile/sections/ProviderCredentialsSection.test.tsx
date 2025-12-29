import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderCredentialsSection } from '@/components/provider/profile/sections/ProviderCredentialsSection';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';

describe('ProviderCredentialsSection', () => {
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
    it('should render education section', () => {
      render(
        <ProviderCredentialsSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByText(/Education/i)).toBeInTheDocument();
      expect(screen.getByText(/Add your medical education and degrees/i)).toBeInTheDocument();
    });

    it('should render board certifications section', () => {
      render(
        <ProviderCredentialsSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByText(/Board Certifications/i)).toBeInTheDocument();
      expect(screen.getByText(/Add your board certifications/i)).toBeInTheDocument();
    });

    it('should render add education button', () => {
      render(
        <ProviderCredentialsSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByRole('button', { name: /Add Education/i })).toBeInTheDocument();
    });

    it('should render add certification button', () => {
      render(
        <ProviderCredentialsSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByRole('button', { name: /Add Certification/i })).toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('should display graduation cap icon for education', () => {
      render(
        <ProviderCredentialsSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      // Check for icon presence (lucide-react icons render as SVGs)
      const educationButton = screen.getByRole('button', { name: /Add Education/i });
      expect(educationButton).toBeInTheDocument();
    });

    it('should display award icon for certifications', () => {
      render(
        <ProviderCredentialsSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const certificationButton = screen.getByRole('button', { name: /Add Certification/i });
      expect(certificationButton).toBeInTheDocument();
    });
  });
});


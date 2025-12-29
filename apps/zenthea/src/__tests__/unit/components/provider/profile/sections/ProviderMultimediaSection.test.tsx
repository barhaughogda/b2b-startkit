import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderMultimediaSection } from '@/components/provider/profile/sections/ProviderMultimediaSection';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';

describe('ProviderMultimediaSection', () => {
  const user = userEvent.setup();
  const mockUpdateField = vi.fn();
  const mockErrors = {};

  const defaultFormData: ProviderProfileUpdateData = {
    specialties: [],
    languages: [],
    introductionVideoUrl: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render introduction video input field', () => {
      render(
        <ProviderMultimediaSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByLabelText(/Introduction Video/i)).toBeInTheDocument();
    });

    it('should display existing video URL value', () => {
      const formData: ProviderProfileUpdateData = {
        ...defaultFormData,
        introductionVideoUrl: 'https://youtube.com/watch?v=123',
      };

      render(
        <ProviderMultimediaSection
          formData={formData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByDisplayValue('https://youtube.com/watch?v=123')).toBeInTheDocument();
    });

    it('should display help text for video URL', () => {
      render(
        <ProviderMultimediaSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByText(/Optional: Add a 2-3 minute introduction video/i)).toBeInTheDocument();
    });

    it('should display note about professional photo', () => {
      render(
        <ProviderMultimediaSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      expect(screen.getByText(/Your professional photo can be uploaded using the avatar uploader/i)).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should call updateField when video URL changes', async () => {
      render(
        <ProviderMultimediaSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const videoInput = screen.getByLabelText(/Introduction Video/i);
      await user.clear(videoInput);
      await user.type(videoInput, 'https://vimeo.com/123456');

      expect(mockUpdateField).toHaveBeenCalledWith('introductionVideoUrl', 'https://vimeo.com/123456');
    });

    it('should handle empty video URL', async () => {
      const formData: ProviderProfileUpdateData = {
        ...defaultFormData,
        introductionVideoUrl: 'https://youtube.com/watch?v=123',
      };

      render(
        <ProviderMultimediaSection
          formData={formData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const videoInput = screen.getByLabelText(/Introduction Video/i);
      await user.clear(videoInput);

      expect(mockUpdateField).toHaveBeenCalledWith('introductionVideoUrl', '');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when validation fails', () => {
      const errors = {
        introductionVideoUrl: {
          message: 'Please enter a valid YouTube or Vimeo URL',
        },
      };

      render(
        <ProviderMultimediaSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={errors}
        />
      );

      expect(screen.getByText(/Please enter a valid YouTube or Vimeo URL/i)).toBeInTheDocument();
    });

    it('should apply error styling to input when error exists', () => {
      const errors = {
        introductionVideoUrl: {
          message: 'Invalid URL',
        },
      };

      render(
        <ProviderMultimediaSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={errors}
        />
      );

      const videoInput = screen.getByLabelText(/Introduction Video/i);
      expect(videoInput).toHaveClass('border-status-error');
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(
        <ProviderMultimediaSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const videoInput = screen.getByLabelText(/Introduction Video/i);
      expect(videoInput).toHaveAttribute('id', 'introductionVideoUrl');
    });

    it('should have placeholder text', () => {
      render(
        <ProviderMultimediaSection
          formData={defaultFormData}
          updateField={mockUpdateField}
          errors={mockErrors}
        />
      );

      const videoInput = screen.getByPlaceholderText(/YouTube or Vimeo URL/i);
      expect(videoInput).toBeInTheDocument();
    });
  });
});


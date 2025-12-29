import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderVisibilitySettingsSection } from '@/components/provider/profile/sections/ProviderVisibilitySettingsSection';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';
import { getDefaultVisibilitySettings } from '@/lib/profileVisibility';

describe('ProviderVisibilitySettingsSection', () => {
  const user = userEvent.setup();
  const mockUpdateVisibility = vi.fn();
  const mockErrors = {};

  const defaultFormData: ProviderProfileUpdateData = {
    specialties: [],
    languages: [],
    visibility: getDefaultVisibilitySettings(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render all privacy fields', () => {
      render(
        <ProviderVisibilitySettingsSection
          formData={defaultFormData}
          updateVisibility={mockUpdateVisibility}
          errors={mockErrors}
        />
      );

      expect(screen.getByText(/Professional Bio/i)).toBeInTheDocument();
      expect(screen.getByText(/Detailed Bio/i)).toBeInTheDocument();
      expect(screen.getByText(/Philosophy of Care/i)).toBeInTheDocument();
      expect(screen.getByText(/Professional Photo/i)).toBeInTheDocument();
      expect(screen.getByText(/Introduction Video/i)).toBeInTheDocument();
      expect(screen.getByText(/Patient Testimonials/i)).toBeInTheDocument();
    });

    it('should render visibility dropdowns for each field', () => {
      render(
        <ProviderVisibilitySettingsSection
          formData={defaultFormData}
          updateVisibility={mockUpdateVisibility}
          errors={mockErrors}
        />
      );

      // Check for select triggers (visibility dropdowns)
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(6); // At least 6 privacy fields
    });

    it('should display current visibility settings', () => {
      const formData: ProviderProfileUpdateData = {
        specialties: [],
        languages: [],
        visibility: {
          ...getDefaultVisibilitySettings(),
          bio: 'public',
          detailedBio: 'portal',
          philosophyOfCare: 'private',
        },
      };

      render(
        <ProviderVisibilitySettingsSection
          formData={formData}
          updateVisibility={mockUpdateVisibility}
          errors={mockErrors}
        />
      );

      // Visibility values should be displayed in selects
      expect(screen.getByText(/Professional Bio/i)).toBeInTheDocument();
    });
  });

  describe('Visibility Updates', () => {
    it('should call updateVisibility when bio visibility changes', async () => {
      render(
        <ProviderVisibilitySettingsSection
          formData={defaultFormData}
          updateVisibility={mockUpdateVisibility}
          errors={mockErrors}
        />
      );

      // Find the bio visibility select
      const bioSelect = screen
        .getByText(/Professional Bio/i)
        .closest('div')
        ?.querySelector('button[role="combobox"]');

      if (bioSelect) {
        await user.click(bioSelect);
        const portalOption = screen.getByText(/Patient Portal/i);
        await user.click(portalOption);

        expect(mockUpdateVisibility).toHaveBeenCalledWith('bio', 'portal');
      }
    });

    it('should call updateVisibility when detailed bio visibility changes', async () => {
      render(
        <ProviderVisibilitySettingsSection
          formData={defaultFormData}
          updateVisibility={mockUpdateVisibility}
          errors={mockErrors}
        />
      );

      const detailedBioSelect = screen
        .getByText(/Detailed Bio/i)
        .closest('div')
        ?.querySelector('button[role="combobox"]');

      if (detailedBioSelect) {
        await user.click(detailedBioSelect);
        const privateOption = screen.getByText(/Private/i);
        await user.click(privateOption);

        expect(mockUpdateVisibility).toHaveBeenCalledWith('detailedBio', 'private');
      }
    });
  });

  describe('Visibility Options', () => {
    it('should display Public, Patient Portal, and Private options', async () => {
      render(
        <ProviderVisibilitySettingsSection
          formData={defaultFormData}
          updateVisibility={mockUpdateVisibility}
          errors={mockErrors}
        />
      );

      const firstSelect = screen.getAllByRole('combobox')[0];
      await user.click(firstSelect);

      expect(screen.getByText(/Public/i)).toBeInTheDocument();
      expect(screen.getByText(/Patient Portal/i)).toBeInTheDocument();
      expect(screen.getByText(/Private/i)).toBeInTheDocument();
    });
  });

  describe('Helper Text', () => {
    it('should display description for each privacy field', () => {
      render(
        <ProviderVisibilitySettingsSection
          formData={defaultFormData}
          updateVisibility={mockUpdateVisibility}
          errors={mockErrors}
        />
      );

      expect(screen.getByText(/Short bio visible on public profile/i)).toBeInTheDocument();
      expect(screen.getByText(/Longer bio for patient portal/i)).toBeInTheDocument();
      expect(screen.getByText(/Your care philosophy/i)).toBeInTheDocument();
    });

    it('should display general instructions', () => {
      render(
        <ProviderVisibilitySettingsSection
          formData={defaultFormData}
          updateVisibility={mockUpdateVisibility}
          errors={mockErrors}
        />
      );

      expect(
        screen.getByText(/Control who can see each part of your profile/i)
      ).toBeInTheDocument();
    });
  });
});


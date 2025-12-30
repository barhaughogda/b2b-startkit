import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderProfileForm } from '@/components/provider/ProviderProfileForm';
import { AvatarUpload } from '@/components/provider/AvatarUpload';
import { BioEditor } from '@/components/provider/BioEditor';
import { ContactDetailsForm } from '@/components/provider/ContactDetailsForm';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock NextAuth
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
      },
    },
    status: 'authenticated',
  }),
}));

const mockProvider = {
  id: 'test-provider-id',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  specialty: 'Internal Medicine',
  licenseNumber: 'MD123456',
  npi: '1234567890',
};

describe('Provider Profile Components', () => {
  describe('ProviderProfileForm', () => {
    it('renders provider information correctly', () => {
      const mockOnSave = vi.fn();
      render(
        <ProviderProfileForm
          provider={mockProvider}
          onSave={mockOnSave}
          isEditing={false}
        />
      );

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument();
    });

    it('allows editing when isEditing is true', () => {
      const mockOnSave = vi.fn();
      render(
        <ProviderProfileForm
          provider={mockProvider}
          onSave={mockOnSave}
          isEditing={true}
        />
      );

      const firstNameInput = screen.getByDisplayValue('John');
      expect(firstNameInput).not.toBeDisabled();
    });

    it('disables inputs when isEditing is false', () => {
      const mockOnSave = vi.fn();
      render(
        <ProviderProfileForm
          provider={mockProvider}
          onSave={mockOnSave}
          isEditing={false}
        />
      );

      const firstNameInput = screen.getByDisplayValue('John');
      expect(firstNameInput).toBeDisabled();
    });
  });

  describe('AvatarUpload', () => {
    it('renders avatar upload component', () => {
      const mockOnAvatarChange = vi.fn();
      render(
        <AvatarUpload
          currentAvatar=""
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
    });

    it('shows upload button when not disabled', () => {
      const mockOnAvatarChange = vi.fn();
      render(
        <AvatarUpload
          currentAvatar=""
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
    });

    it('hides upload controls when disabled', () => {
      const mockOnAvatarChange = vi.fn();
      render(
        <AvatarUpload
          currentAvatar=""
          onAvatarChange={mockOnAvatarChange}
          disabled={true}
        />
      );

      expect(screen.queryByText('Upload Photo')).not.toBeInTheDocument();
    });
  });

  describe('BioEditor', () => {
    it('renders bio editor component', () => {
      const mockOnSave = vi.fn();
      render(
        <BioEditor
          bio="Test bio content"
          onSave={mockOnSave}
          isEditing={false}
        />
      );

      expect(screen.getByText('Professional Bio')).toBeInTheDocument();
    });

    it('shows bio content when not editing', () => {
      const mockOnSave = vi.fn();
      render(
        <BioEditor
          bio="Test bio content"
          onSave={mockOnSave}
          isEditing={false}
        />
      );

      expect(screen.getByText('Test bio content')).toBeInTheDocument();
    });

    it('shows textarea when editing', () => {
      const mockOnSave = vi.fn();
      render(
        <BioEditor
          bio="Test bio content"
          onSave={mockOnSave}
          isEditing={true}
        />
      );

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('ContactDetailsForm', () => {
    const mockProviderWithContact = {
      ...mockProvider,
      preferredContactMethod: 'email' as const,
      officeHours: 'Monday-Friday 9AM-5PM',
      languages: ['English', 'Spanish'],
      certifications: ['Board Certified'],
    };

    it('renders contact details form', () => {
      const mockOnSave = vi.fn();
      render(
        <ContactDetailsForm
          provider={mockProviderWithContact}
          onSave={mockOnSave}
          isEditing={false}
        />
      );

      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      expect(screen.getByText('Languages Spoken')).toBeInTheDocument();
      expect(screen.getByText('Professional Certifications')).toBeInTheDocument();
    });

    it('displays contact information correctly', () => {
      const mockOnSave = vi.fn();
      render(
        <ContactDetailsForm
          provider={mockProviderWithContact}
          onSave={mockOnSave}
          isEditing={false}
        />
      );

      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.getByText('Monday-Friday 9AM-5PM')).toBeInTheDocument();
    });

    it('shows languages and certifications as badges', () => {
      const mockOnSave = vi.fn();
      render(
        <ContactDetailsForm
          provider={mockProviderWithContact}
          onSave={mockOnSave}
          isEditing={false}
        />
      );

      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Spanish')).toBeInTheDocument();
      expect(screen.getByText('Board Certified')).toBeInTheDocument();
    });
  });
});

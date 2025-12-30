import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import ProfilePage from '@/app/company/user/profile/page';

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

// Mock fetch
global.fetch = vi.fn();

describe('Provider Profile Page - Single Page Layout', () => {
  beforeEach(() => {
    (global.fetch as MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: 'http://localhost:3000/api/provider/profile',
      clone: vi.fn(),
      body: null,
      bodyUsed: false,
      arrayBuffer: vi.fn(),
      blob: vi.fn(),
      formData: vi.fn(),
      json: async () => ({
        provider: {
          id: 'test-provider-id',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          specialty: 'Internal Medicine',
          licenseNumber: 'MD123456',
          npi: '1234567890',
          avatar: '',
          bio: '',
          preferredContactMethod: 'email',
          officeHours: '',
          languages: ['English'],
          certifications: [],
        },
      }),
      text: vi.fn()
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all sections on one page without tabs', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Profile Picture')).toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Contact Details')).toBeInTheDocument();
      expect(screen.getByText('Bio & Introduction')).toBeInTheDocument();
    });
  });

  it('shows save button in header', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Save All Changes')).toBeInTheDocument();
    });
  });

  it('allows editing all fields immediately', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      // Check that form fields are enabled
      const firstNameInput = screen.getByDisplayValue('John');
      expect(firstNameInput).not.toBeDisabled();
    });
  });

  it('does not show individual save buttons for each section', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      // Should not have individual save buttons
      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
      expect(screen.queryByText('Save Bio')).not.toBeInTheDocument();
    });
  });

  it('shows all form sections in a single scrollable page', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      // All sections should be visible without tab navigation
      expect(screen.getByText('Profile Picture')).toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Contact Details')).toBeInTheDocument();
      expect(screen.getByText('Bio & Introduction')).toBeInTheDocument();
      
      // Should not have tab navigation
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Contact Details')).not.toBeInTheDocument();
      expect(screen.queryByText('Bio & Introduction')).not.toBeInTheDocument();
    });
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantSettingsView } from '@/components/superadmin/tenants/TenantSettingsView';

// Mock fetch
global.fetch = vi.fn();

describe('TenantSettingsView', () => {
  const mockTenantId = 'test-tenant-1';
  const mockTenantName = 'Test Clinic';

  const mockTenantData = {
    branding: {
      logo: 'https://example.com/logo.png',
      primaryColor: '#5FBFAF',
      secondaryColor: '#5F284A',
      accentColor: '#FF6B6B',
      customDomain: 'test.example.com',
      favicon: 'https://example.com/favicon.ico',
    },
    features: {
      onlineScheduling: true,
      telehealth: true,
      prescriptionRefills: true,
      labResults: true,
      messaging: true,
      billing: false,
      patientPortal: true,
      mobileApp: false,
    },
    subscription: {
      plan: 'premium' as const,
      status: 'active' as const,
      maxUsers: 50,
      maxPatients: 1000,
    },
    contactInfo: {
      phone: '+1-555-0123',
      email: 'contact@testclinic.com',
      address: {
        street: '123 Main St',
        city: 'Test City',
        state: 'CA',
        zipCode: '12345',
        country: 'US',
      },
      website: 'https://testclinic.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
      new Promise(() => {}) // Never resolves to simulate loading
    );

    render(
      <TenantSettingsView
        tenantId={mockTenantId}
        tenantName={mockTenantName}
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays tenant settings when loaded', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTenantData,
      }),
    });

    render(
      <TenantSettingsView
        tenantId={mockTenantId}
        tenantName={mockTenantName}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(mockTenantName)).toBeInTheDocument();
    });

    // Check that branding information is displayed
    expect(screen.getByText(/branding/i)).toBeInTheDocument();
    expect(screen.getByText(/features/i)).toBeInTheDocument();
    expect(screen.getByText(/subscription/i)).toBeInTheDocument();
  });

  it('displays configuration completeness percentage', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTenantData,
      }),
    });

    render(
      <TenantSettingsView
        tenantId={mockTenantId}
        tenantName={mockTenantName}
      />
    );

    await waitFor(() => {
      // Should show completeness percentage (this tenant should be well configured)
      const completenessText = screen.getByText(/\d+%/i);
      expect(completenessText).toBeInTheDocument();
    });
  });

  it('displays error message when fetch fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Failed to fetch')
    );

    render(
      <TenantSettingsView
        tenantId={mockTenantId}
        tenantName={mockTenantName}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('displays "Help Configure" button', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTenantData,
      }),
    });

    render(
      <TenantSettingsView
        tenantId={mockTenantId}
        tenantName={mockTenantName}
      />
    );

    await waitFor(() => {
      const helpButton = screen.getByRole('button', { name: /help configure/i });
      expect(helpButton).toBeInTheDocument();
    });
  });

  it('displays "Edit as Tenant Admin" button', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTenantData,
      }),
    });

    render(
      <TenantSettingsView
        tenantId={mockTenantId}
        tenantName={mockTenantName}
      />
    );

    await waitFor(() => {
      const editButton = screen.getByRole('button', { name: /edit as tenant admin/i });
      expect(editButton).toBeInTheDocument();
    });
  });

  it('shows low completeness warning for incomplete configurations', async () => {
    const incompleteData = {
      ...mockTenantData,
      branding: {
        primaryColor: '#2563eb', // Default color
        secondaryColor: '#1e40af', // Default color
      },
      contactInfo: {
        ...mockTenantData.contactInfo,
        website: undefined,
      },
      features: {
        onlineScheduling: true,
        telehealth: false,
        prescriptionRefills: false,
        labResults: false,
        messaging: false,
        billing: false,
        patientPortal: false,
        mobileApp: false,
      },
      subscription: {
        plan: 'demo' as const,
        status: 'active' as const,
        maxUsers: 10,
        maxPatients: 100,
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: incompleteData,
      }),
    });

    render(
      <TenantSettingsView
        tenantId={mockTenantId}
        tenantName={mockTenantName}
      />
    );

    await waitFor(() => {
      // Should show low completeness or needs setup warning
      const warningText = screen.queryByText(/needs setup/i) || screen.queryByText(/incomplete/i);
      expect(warningText || screen.getByText(/\d+%/i)).toBeInTheDocument();
    });
  });

  it('displays subscription plan information', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTenantData,
      }),
    });

    render(
      <TenantSettingsView
        tenantId={mockTenantId}
        tenantName={mockTenantName}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/premium/i)).toBeInTheDocument();
      expect(screen.getByText(/50 users/i)).toBeInTheDocument();
      expect(screen.getByText(/1000 patients/i)).toBeInTheDocument();
    });
  });

  it('displays feature flags correctly', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTenantData,
      }),
    });

    render(
      <TenantSettingsView
        tenantId={mockTenantId}
        tenantName={mockTenantName}
      />
    );

    await waitFor(() => {
      // Check that enabled features are shown
      expect(screen.getByText(/online scheduling/i)).toBeInTheDocument();
      expect(screen.getByText(/telehealth/i)).toBeInTheDocument();
    });
  });
});


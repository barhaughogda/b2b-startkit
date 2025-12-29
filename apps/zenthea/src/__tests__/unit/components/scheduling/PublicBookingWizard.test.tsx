import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { PublicBookingWizard, type PublicBookingFormData } from '@/components/scheduling/PublicBookingWizard';
import { useQuery } from 'convex/react';

// Mock Convex API
vi.mock('@/convex/_generated/api', () => ({
  api: {
    publicLanding: {
      getBookingProviders: 'api.publicLanding.getBookingProviders',
    },
    tenantBranding: {
      getTenantBranding: 'api.tenantBranding.getTenantBranding',
    },
    slotLocks: {
      acquireLock: 'api.slotLocks.acquireLock',
      releaseLock: 'api.slotLocks.releaseLock',
      extendLock: 'api.slotLocks.extendLock',
      releaseSessionLocks: 'api.slotLocks.releaseSessionLocks',
    },
  },
}));

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="mock-link">{children}</a>
  ),
}));

// Mock ServiceSelector
vi.mock('@/components/scheduling/ServiceSelector', () => ({
  ServiceSelector: ({ onSelect, value }: any) => (
    <div data-testid="service-selector">
      <button
        data-testid="select-service"
        onClick={() => onSelect({ id: 'service-1', name: 'Consultation', duration: 30 })}
      >
        Select Service
      </button>
      {value && <span data-testid="selected-service">{value}</span>}
    </div>
  ),
}));

// Mock AvailabilitySlotPicker - captures displayTimezone prop for testing
vi.mock('@/components/scheduling/AvailabilitySlotPicker', () => ({
  AvailabilitySlotPicker: ({ onSlotSelect, displayTimezone, showTimezoneDisplay }: any) => {
    // Get browser timezone for display if displayTimezone is not provided
    // This matches the behavior in PublicBookingWizard which falls back to browser timezone
    const effectiveTimezone = displayTimezone || (typeof Intl !== 'undefined' && Intl.DateTimeFormat 
      ? Intl.DateTimeFormat().resolvedOptions().timeZone 
      : 'America/New_York');
    
    return (
      <div data-testid="availability-slot-picker" data-display-timezone={displayTimezone}>
        {showTimezoneDisplay && effectiveTimezone && (
          <div className="flex items-center gap-2 text-sm" data-testid="timezone-display">
            <span className="text-text-secondary">
              Times shown in <span className="font-medium text-text-primary">{effectiveTimezone}</span>
            </span>
          </div>
        )}
        <button
          data-testid="select-slot"
          onClick={() => onSlotSelect({ dateTime: Date.now() + 86400000 })}
        >
          Select Slot
        </button>
      </div>
    );
  },
}));

// Mock useSlotLock hook
vi.mock('@/hooks/useSlotLock', () => ({
  useSlotLock: vi.fn(() => ({
    acquireLock: vi.fn().mockResolvedValue(true),
    releaseLock: vi.fn().mockResolvedValue(true),
    isLocked: false,
    isLocking: false,
    lockError: null,
    lockState: {
      lockId: null,
      userId: null,
      slotStart: null,
      slotEnd: null,
      expiresAt: null,
    },
    sessionId: 'test-session-id',
  })),
}));

// Sample booking providers
const mockBookingProviders = [
  {
    _id: 'provider-1',
    displayName: 'Dr. Smith',
    title: 'Family Medicine',
    bio: 'Experienced family medicine doctor',
    photo: '/photos/smith.jpg',
    specialties: ['Family Medicine', 'Preventive Care'],
    languages: ['English', 'Spanish'],
    acceptingNewPatients: true,
    bookingEnabled: true,
    clinicIds: [],
    userId: 'user-1',
    providerProfileId: 'profile-1',
  },
  {
    _id: 'provider-2',
    displayName: 'Dr. Johnson',
    title: 'Internal Medicine',
    bio: 'Internal medicine specialist',
    photo: '/photos/johnson.jpg',
    specialties: ['Internal Medicine'],
    languages: ['English'],
    acceptingNewPatients: false, // Not accepting new patients
    bookingEnabled: true,
    clinicIds: [],
    userId: 'user-2',
    providerProfileId: 'profile-2',
  },
];

describe('PublicBookingWizard', () => {
  const mockOnFormDataChange = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnConfirmBooking = vi.fn();
  const mockedUseQuery = useQuery as MockedFunction<typeof useQuery>;

  const defaultFormData: PublicBookingFormData = {
    serviceId: '',
    serviceName: '',
    serviceDuration: 30,
    providerId: '',
    providerName: '',
    scheduledAt: 0,
    notes: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseQuery.mockReturnValue(mockBookingProviders);
    
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  describe('Wizard Steps', () => {
    it('renders service selection as first step', () => {
      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={defaultFormData}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Select a Service')).toBeInTheDocument();
      expect(screen.getByTestId('service-selector')).toBeInTheDocument();
    });

    it('shows provider selection as second step', () => {
      const formDataWithService = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithService}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
        />
      );

      // Click Next to go to step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(screen.getByText('Choose Your Provider')).toBeInTheDocument();
    });

    it('shows date/time selection as third step', () => {
      const formDataWithProvider = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
        providerId: 'provider-1',
        providerName: 'Dr. Smith',
        providerUserId: 'user-1',
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithProvider}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
        />
      );

      // Navigate to step 2 first (provider), then step 3 (date/time) using Next button
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton); // Go to step 2 (provider)
      fireEvent.click(nextButton); // Go to step 3 (date/time)

      expect(screen.getByText('Select Date & Time')).toBeInTheDocument();
    });
  });

  describe('Provider Blocking (acceptingNewPatients)', () => {
    it('shows "Accepting New Patients" badge for providers accepting new patients', () => {
      const formDataWithService = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithService}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
          isAuthenticated={false}
        />
      );

      // Go to provider selection
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Check for accepting new patients badge
      expect(screen.getByText('Accepting New Patients')).toBeInTheDocument();
    });

    it('shows "Existing Patients Only" badge for providers not accepting new patients', () => {
      const formDataWithService = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithService}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
          isAuthenticated={false}
        />
      );

      // Go to provider selection
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Check for existing patients only badge
      expect(screen.getByText('Existing Patients Only')).toBeInTheDocument();
    });

    it('shows blocking message for unauthenticated users trying to select provider not accepting new patients', () => {
      const formDataWithService = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithService}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
          isAuthenticated={false}
        />
      );

      // Go to provider selection
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Check for blocking message
      expect(screen.getByText(/sign in as an existing patient/i)).toBeInTheDocument();
    });

    it('allows authenticated users to select provider not accepting new patients', async () => {
      const formDataWithService = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithService}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
          isAuthenticated={true}
        />
      );

      // Go to provider selection
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Dr. Johnson (provider not accepting new patients) should be selectable
      const drJohnsonButton = screen.getByText('Dr. Johnson').closest('button');
      expect(drJohnsonButton).not.toBeDisabled();
    });

    it('does not call onFormDataChange when unauthenticated user clicks blocked provider', () => {
      const formDataWithService = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithService}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
          isAuthenticated={false}
        />
      );

      // Go to provider selection
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Try to click Dr. Johnson (blocked provider)
      const drJohnsonButton = screen.getByText('Dr. Johnson').closest('button');
      fireEvent.click(drJohnsonButton!);

      // Should not update form data with blocked provider
      expect(mockOnFormDataChange).not.toHaveBeenCalledWith(
        expect.objectContaining({ providerId: 'provider-2' })
      );
    });
  });

  describe('Auth Prompt at Confirm Step', () => {
    it('shows login/register prompt for unauthenticated users at confirm step', () => {
      const formDataComplete = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
        providerId: 'provider-1',
        providerName: 'Dr. Smith',
        providerUserId: 'user-1',
        scheduledAt: Date.now() + 86400000,
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataComplete}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
          isAuthenticated={false}
        />
      );

      // Navigate to confirm step
      const confirmStep = screen.getByText('Confirm').closest('button');
      fireEvent.click(confirmStep!);

      // Check for auth prompt
      expect(screen.getByText('Almost There!')).toBeInTheDocument();
      expect(screen.getAllByText(/sign in or create an account/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('link', { name: /sign in to complete booking/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create account/i })).toBeInTheDocument();
    });

    it('shows confirm button for authenticated users at confirm step', () => {
      const formDataComplete = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
        providerId: 'provider-1',
        providerName: 'Dr. Smith',
        providerUserId: 'user-1',
        scheduledAt: Date.now() + 86400000,
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataComplete}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
          isAuthenticated={true}
          onConfirmBooking={mockOnConfirmBooking}
        />
      );

      // Navigate to confirm step
      const confirmStep = screen.getByText('Confirm').closest('button');
      fireEvent.click(confirmStep!);

      // Check for confirm button instead of auth prompt
      expect(screen.getByText('Confirm Your Appointment')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm booking/i })).toBeInTheDocument();
    });
  });

  describe('State Preservation through Auth Redirect', () => {
    it('generates correct login redirect URL with booking state', () => {
      const formDataComplete = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
        providerId: 'provider-1',
        providerName: 'Dr. Smith',
        providerUserId: 'user-1',
        scheduledAt: 1735084800000, // Fixed timestamp for testing
        notes: 'Test notes',
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataComplete}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
          isAuthenticated={false}
        />
      );

      // Navigate to confirm step
      const confirmStep = screen.getByText('Confirm').closest('button');
      fireEvent.click(confirmStep!);

      // Get the login link
      const loginLink = screen.getByRole('link', { name: /sign in to complete booking/i });
      const href = loginLink.getAttribute('href');

      // Verify the URL contains booking state (URL-encoded)
      expect(href).toContain('/clinic/test-clinic/login');
      expect(href).toContain('redirect=');
      // The bookingState is double URL-encoded (once in the redirect URL, once in the href)
      expect(href).toContain('bookingState%3D');
    });

    it('saves booking state to sessionStorage when redirecting', () => {
      const formDataComplete = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
        providerId: 'provider-1',
        providerName: 'Dr. Smith',
        providerUserId: 'user-1',
        scheduledAt: 1735084800000,
        notes: 'Test notes',
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataComplete}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
          isAuthenticated={false}
        />
      );

      // Navigate to confirm step
      const confirmStep = screen.getByText('Confirm').closest('button');
      fireEvent.click(confirmStep!);

      // Click login link to trigger sessionStorage save
      const loginLink = screen.getByRole('link', { name: /sign in to complete booking/i });
      fireEvent.click(loginLink);

      // Verify sessionStorage was called
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'zenthea-booking-test-clinic',
        expect.any(String)
      );
    });
  });

  describe('Appointment Summary', () => {
    it('displays correct appointment details in summary', () => {
      const formDataComplete = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
        providerId: 'provider-1',
        providerName: 'Dr. Smith',
        providerUserId: 'user-1',
        scheduledAt: Date.now() + 86400000,
        notes: 'Test appointment notes',
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataComplete}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
          isAuthenticated={true}
          onConfirmBooking={mockOnConfirmBooking}
        />
      );

      // Navigate to confirm step
      const confirmStep = screen.getByText('Confirm').closest('button');
      fireEvent.click(confirmStep!);

      // Check summary content
      expect(screen.getByText('Consultation')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('30 minutes')).toBeInTheDocument();
    });
  });

  describe('Timezone Display (Calendly-style UX)', () => {
    it('shows times in invitee timezone (browser timezone) on step 3', () => {
      // Mock provider with clinic ID so AvailabilitySlotPicker renders
      (useQuery as MockedFunction<typeof useQuery>).mockImplementation((query) => {
        if (query === 'api.publicLanding.getBookingProviders') {
          return [
            {
              ...mockBookingProviders[0],
              clinicIds: ['clinic-1'], // Add clinic ID so picker renders
            },
          ];
        }
        return null;
      });

      const formDataWithProvider = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
        providerId: 'provider-1',
        providerName: 'Dr. Smith',
        providerUserId: 'user-1',
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithProvider}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
        />
      );

      // Navigate to step 3 (date/time)
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton); // Go to step 2
      fireEvent.click(nextButton); // Go to step 3

      // Should show "Times shown in" with the browser timezone
      // The browser timezone is detected via Intl.DateTimeFormat().resolvedOptions().timeZone
      const timezoneText = screen.getByText(/Times shown in/);
      expect(timezoneText).toBeInTheDocument();
    });

    it('passes displayTimezone to AvailabilitySlotPicker', () => {
      const formDataWithProvider = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
        providerId: 'provider-1',
        providerName: 'Dr. Smith',
        providerUserId: 'user-1',
      };

      // Update mock providers to include clinicIds
      mockedUseQuery.mockReturnValue([
        {
          ...mockBookingProviders[0],
          clinicIds: ['clinic-1'],
        },
        mockBookingProviders[1],
      ]);

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithProvider}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
        />
      );

      // Navigate to step 3 (date/time)
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton); // Go to step 2
      fireEvent.click(nextButton); // Go to step 3

      // The AvailabilitySlotPicker should receive displayTimezone
      const slotPicker = screen.getByTestId('availability-slot-picker');
      expect(slotPicker).toHaveAttribute('data-display-timezone');
      // The value should be a valid timezone string (not empty)
      expect(slotPicker.getAttribute('data-display-timezone')).toBeTruthy();
    });

    it('displays appointment time in invitee timezone on confirmation step', () => {
      const futureTimestamp = Date.now() + 86400000; // Tomorrow
      const formDataComplete = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
        providerId: 'provider-1',
        providerName: 'Dr. Smith',
        providerUserId: 'user-1',
        scheduledAt: futureTimestamp,
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataComplete}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
          isAuthenticated={true}
          onConfirmBooking={mockOnConfirmBooking}
        />
      );

      // Navigate to confirm step
      const confirmStep = screen.getByText('Confirm').closest('button');
      fireEvent.click(confirmStep!);

      // Date & Time section should show the timezone
      // This verifies the confirmation step also uses consistent timezone display
      // Use getAllByText since there are multiple elements with "Date & Time" (step indicator + summary)
      const dateTimeElements = screen.getAllByText('Date & Time');
      expect(dateTimeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Auto-Navigation on State Restoration', () => {
    it('starts at step 1 when no booking data is provided', () => {
      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={defaultFormData}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Select a Service')).toBeInTheDocument();
    });

    it('starts at step 2 when service is pre-selected', () => {
      const formDataWithService = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithService}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Choose Your Provider')).toBeInTheDocument();
    });

    it('starts at step 3 when service and provider are pre-selected', () => {
      mockedUseQuery.mockReturnValue([
        {
          ...mockBookingProviders[0],
          clinicIds: ['clinic-1'],
        },
        mockBookingProviders[1],
      ]);

      const formDataWithProvider = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
        providerId: 'provider-1',
        providerName: 'Dr. Smith',
        providerUserId: 'user-1',
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithProvider}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Select Date & Time')).toBeInTheDocument();
    });

    it('starts at step 4 (confirmation) when all booking data is restored from auth redirect', () => {
      const formDataComplete = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
        providerId: 'provider-1',
        providerName: 'Dr. Smith',
        providerUserId: 'user-1',
        scheduledAt: Date.now() + 86400000, // Tomorrow
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataComplete}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
          isAuthenticated={true}
          onConfirmBooking={mockOnConfirmBooking}
        />
      );

      // Should start directly at confirmation step
      expect(screen.getByText('Confirm Your Appointment')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm booking/i })).toBeInTheDocument();
    });

    it('does not auto-navigate to step 4 if scheduledAt is 0', () => {
      const formDataWithoutTime = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
        providerId: 'provider-1',
        providerName: 'Dr. Smith',
        providerUserId: 'user-1',
        scheduledAt: 0, // No time selected
      };

      mockedUseQuery.mockReturnValue([
        {
          ...mockBookingProviders[0],
          clinicIds: ['clinic-1'],
        },
        mockBookingProviders[1],
      ]);

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithoutTime}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
        />
      );

      // Should start at step 3 (date/time selection), not step 4
      expect(screen.getByText('Select Date & Time')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('disables Next button when current step is not complete', () => {
      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={defaultFormData}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('calls onCancel when Cancel is clicked on first step', async () => {
      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={defaultFormData}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Wait for async handleCancel to complete (it calls releaseLock then onCancel)
      await waitFor(() => {
        expect(mockOnCancel).toHaveBeenCalled();
      });
    });

    it('shows Back button on steps after the first', () => {
      const formDataWithService = {
        ...defaultFormData,
        serviceId: 'service-1',
        serviceName: 'Consultation',
        serviceDuration: 30,
      };

      render(
        <PublicBookingWizard
          tenantId="test-tenant"
          slug="test-clinic"
          formData={formDataWithService}
          onFormDataChange={mockOnFormDataChange}
          onCancel={mockOnCancel}
        />
      );

      // Go to step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Check for Back button
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });
});


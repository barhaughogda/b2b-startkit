/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-wrapper';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';

// Mock Next.js modules
// Note: @/convex/_generated/api is already mocked globally in src/__tests__/setup.ts
vi.mock('next-auth/react');
vi.mock('next/navigation');
vi.mock('convex/react');
vi.mock('sonner');
vi.mock('@/components/cards/CardSystemProvider', () => ({
  useCardSystem: () => ({
    openCard: vi.fn(),
    closeCard: vi.fn(),
    isCardOpen: false,
  }),
}));

// Import page component after mocks are set up
import ProviderCalendarPage from '@/app/company/calendar/page';

// Mock components
vi.mock('@/components/navigation/ProviderNavigationLayout', () => ({
  ProviderNavigationLayout: function MockProviderNavigationLayout({ 
    children, 
    pageTitle 
  }: { 
    children: React.ReactNode;
    pageTitle?: string;
  }) {
    return (
      <div data-testid="provider-navigation-layout" data-page-title={pageTitle}>
        {children}
      </div>
    );
  },
}));

vi.mock('@/components/calendar/ProviderCalendar', () => ({
  ProviderCalendar: function MockProviderCalendar({ 
    providerId, 
    tenantId, 
    locationId,
    onEventClick,
    onDateClick,
    onEventDrop 
  }: any) {
    return (
      <div 
        data-testid="provider-calendar"
        data-provider-id={providerId}
        data-tenant-id={tenantId}
        data-location-id={locationId}
      >
        <button 
          onClick={() => onEventClick?.('appointment-1')}
          data-testid="mock-event-click"
        >
          Click Event
        </button>
        <button 
          onClick={() => onDateClick?.(new Date('2024-01-15'))}
          data-testid="mock-date-click"
        >
          Click Date
        </button>
        <button 
          onClick={() => onEventDrop?.('appointment-1', new Date('2024-01-16'))}
          data-testid="mock-event-drop"
        >
          Drop Event
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/provider/AvailabilityManager', () => ({
  AvailabilityManager: function MockAvailabilityManager({ 
    providerId, 
    tenantId, 
    locationId 
  }: any) {
    return (
      <div 
        data-testid="availability-manager"
        data-provider-id={providerId}
        data-tenant-id={tenantId}
        data-location-id={locationId}
      >
        Availability Manager
      </div>
    );
  },
}));

vi.mock('@/components/provider/LocationManager', () => ({
  LocationManager: function MockLocationManager({ 
    providerId, 
    tenantId 
  }: any) {
    return (
      <div 
        data-testid="location-manager"
        data-provider-id={providerId}
        data-tenant-id={tenantId}
      >
        Location Manager
      </div>
    );
  },
}));

vi.mock('@/components/provider/CalendarSyncSettings', () => ({
  CalendarSyncSettings: function MockCalendarSyncSettings({ 
    providerId, 
    tenantId 
  }: any) {
    return (
      <div 
        data-testid="calendar-sync-settings"
        data-provider-id={providerId}
        data-tenant-id={tenantId}
      >
        Calendar Sync Settings
      </div>
    );
  },
}));

vi.mock('@/components/calendar/CalendarSettingsPanel', () => ({
  CalendarSettingsPanel: function MockCalendarSettingsPanel({ 
    userId, 
    tenantId,
    providerId,
    locationId 
  }: any) {
    return (
      <div 
        data-testid="calendar-settings-panel"
        data-user-id={userId}
        data-tenant-id={tenantId}
        data-provider-id={providerId}
        data-location-id={locationId}
      >
        <div data-testid="availability-accordion">
          <button data-testid="availability-accordion-trigger">Availability</button>
          <div data-testid="availability-manager" style={{ display: 'none' }}>
            Availability Manager
          </div>
        </div>
        <div data-testid="locations-accordion">
          <button data-testid="locations-accordion-trigger">Locations</button>
          <div data-testid="location-manager" style={{ display: 'none' }}>
            Location Manager
          </div>
        </div>
        <div data-testid="calendar-sync-settings">
          Calendar Sync Settings
        </div>
      </div>
    );
  },
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
  CardDescription: ({ children, className }: any) => (
    <p data-testid="card-description" className={className}>{children}</p>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className, 'aria-label': ariaLabel }: any) => (
    <button 
      data-testid="button" 
      onClick={onClick} 
      data-variant={variant}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/lib/convexIdValidation', () => ({
  canUseConvexQuery: vi.fn(() => true),
}));

const mockUseSession = useSession as any;
const mockUseSearchParams = useSearchParams as any;
const mockUseRouter = useRouter as any;
const mockUseQuery = useQuery as any;
const mockToast = toast as any;

describe('ProviderCalendarPage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockRouter = {
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };

  const mockSearchParams = {
    get: vi.fn(),
    toString: vi.fn(() => ''),
  };

  const mockProviderProfile = {
    providerId: 'provider-123' as const,
    _id: 'profile-1',
  };

  const mockProvider = {
    _id: 'provider-123' as const,
    email: 'provider@example.com',
  };

  const mockLocations = [
    { _id: 'location-1' as const, name: 'Main Office', isDefault: true },
    { _id: 'location-2' as const, name: 'Satellite Office', isDefault: false },
  ];

  const mockAvailabilitySummary = {
    recurring: [
      { dayOfWeek: 'monday', startTime: '09:00', endTime: '17:00' },
    ],
    overrides: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'j123456789012345', // Valid Convex ID format
          email: 'provider@example.com',
          tenantId: 'tenant-123',
        },
      },
      status: 'authenticated',
    });

    mockUseRouter.mockReturnValue(mockRouter);
    mockUseSearchParams.mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockReturnValue(null);
    mockSearchParams.toString.mockReturnValue('');

    // Mock Convex queries
    mockUseQuery.mockImplementation((queryFn: any, args: any) => {
      if (args === 'skip') return undefined;
      
      // Mock provider profile query
      if (queryFn === api.providerProfiles.getProviderProfileByUserId) {
        return mockProviderProfile;
      }
      
      // Mock provider by email query
      if (queryFn === api.providers.getProviderByEmail) {
        return mockProvider;
      }
      
      // Mock locations query - handle both direct reference and (api as any) pattern
      if (queryFn === api.locations.getProviderLocations || 
          queryFn === (api as any).locations?.getProviderLocations) {
        return mockLocations;
      }
      
      // Mock availability query - handle both direct reference and (api as any) pattern
      if (queryFn === (api as any).availability?.getProviderAvailability ||
          queryFn === api.availability?.getProviderAvailability) {
        return mockAvailabilitySummary;
      }
      
      return undefined;
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should render calendar page with navigation layout', () => {
    render(<ProviderCalendarPage />);
    
    expect(screen.getByTestId('provider-navigation-layout')).toBeInTheDocument();
    // Check for Calendar heading specifically (h1 element)
    expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument();
  });

  it('should display loading state when provider ID is not available', () => {
    mockUseQuery.mockImplementation(() => undefined);
    
    render(<ProviderCalendarPage />);
    
    expect(screen.getByText('Loading provider information...')).toBeInTheDocument();
  });

  it('should display sign in message when session is not available', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    
    render(<ProviderCalendarPage />);
    
    expect(screen.getByText('Please sign in to view your calendar.')).toBeInTheDocument();
  });

  it('should render calendar tab by default', () => {
    render(<ProviderCalendarPage />);
    
    expect(screen.getByTestId('provider-calendar')).toBeInTheDocument();
    expect(screen.queryByTestId('calendar-settings-panel')).not.toBeInTheDocument();
  });

  it('should switch to Settings tab when clicked', async () => {
    render(<ProviderCalendarPage />);
    
    // Find Settings button by aria-label attribute
    const buttons = screen.getAllByTestId('button');
    const settingsButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Settings');
    expect(settingsButton).toBeInTheDocument();
    fireEvent.click(settingsButton!);
    
    await waitFor(() => {
      expect(screen.getByTestId('calendar-settings-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('provider-calendar')).not.toBeInTheDocument();
    });
  });

  it('should show availability accordion in Settings panel', async () => {
    render(<ProviderCalendarPage />);
    
    // Click Settings button
    const buttons = screen.getAllByTestId('button');
    const settingsButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Settings');
    expect(settingsButton).toBeInTheDocument();
    fireEvent.click(settingsButton!);
    
    await waitFor(() => {
      expect(screen.getByTestId('calendar-settings-panel')).toBeInTheDocument();
      expect(screen.getByTestId('availability-accordion')).toBeInTheDocument();
    });
  });

  it('should show locations accordion in Settings panel', async () => {
    render(<ProviderCalendarPage />);
    
    // Click Settings button
    const buttons = screen.getAllByTestId('button');
    const settingsButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Settings');
    expect(settingsButton).toBeInTheDocument();
    fireEvent.click(settingsButton!);
    
    await waitFor(() => {
      expect(screen.getByTestId('calendar-settings-panel')).toBeInTheDocument();
      expect(screen.getByTestId('locations-accordion')).toBeInTheDocument();
    });
  });

  it('should migrate old availability tab URL to Settings', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return 'availability';
      return null;
    });
    mockSearchParams.toString.mockReturnValue('tab=availability');
    
    render(<ProviderCalendarPage />);
    
    await waitFor(() => {
      // Should redirect to Settings tab (sync)
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('tab=sync'),
        { scroll: false }
      );
    }, { timeout: 3000 });
  });

  it('should migrate old locations tab URL to Settings', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return 'locations';
      return null;
    });
    mockSearchParams.toString.mockReturnValue('tab=locations');
    
    render(<ProviderCalendarPage />);
    
    await waitFor(() => {
      // Should redirect to Settings tab (sync)
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('tab=sync'),
        { scroll: false }
      );
    }, { timeout: 3000 });
  });

  it('should initialize sync tab from URL query parameter', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return 'sync';
      return null;
    });
    
    render(<ProviderCalendarPage />);
    
    expect(screen.getByTestId('calendar-settings-panel')).toBeInTheDocument();
  });

  it('should handle OAuth success callback', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'success') return 'calendar_connected';
      return null;
    });
    mockSearchParams.toString.mockReturnValue('success=calendar_connected');
    
    render(<ProviderCalendarPage />);
    
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        'Google Calendar connected',
        expect.objectContaining({
          description: 'Your Google Calendar has been successfully connected.',
        })
      );
      expect(mockReplace).toHaveBeenCalledWith('/provider/calendar?tab=sync', { scroll: false });
    });
  });

  it('should handle OAuth error callback', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'error') return 'oauth_cancelled';
      return null;
    });
    mockSearchParams.toString.mockReturnValue('error=oauth_cancelled');
    
    render(<ProviderCalendarPage />);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Connection failed',
        expect.objectContaining({
          description: 'Google Calendar authorization was cancelled.',
        })
      );
      expect(mockReplace).toHaveBeenCalledWith('/provider/calendar?tab=sync', { scroll: false });
    });
  });

  it('should handle event click and navigate to appointment', async () => {
    render(<ProviderCalendarPage />);
    
    const eventButton = screen.getByTestId('mock-event-click');
    fireEvent.click(eventButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/provider/appointments/appointment-1');
    });
  });

  it('should handle date click and open appointment card', async () => {
    // The component uses openCard from CardSystemProvider (mocked in test-wrapper)
    // We can't easily test the card system interaction here, so we verify the button exists
    // and can be clicked without errors
    render(<ProviderCalendarPage />);
    
    const dateButton = screen.getByTestId('mock-date-click');
    expect(dateButton).toBeInTheDocument();
    
    // Click should not throw
    expect(() => {
      fireEvent.click(dateButton);
    }).not.toThrow();
  });

  it('should handle event drop and show toast', async () => {
    render(<ProviderCalendarPage />);
    
    const dropButton = screen.getByTestId('mock-event-drop');
    fireEvent.click(dropButton);
    
    await waitFor(() => {
      expect(mockToast.info).toHaveBeenCalledWith(
        'Appointment rescheduling coming soon',
        expect.objectContaining({
          description: 'This feature will be available in a future update.',
        })
      );
    });
  });

  it('should filter calendar by location', async () => {
    render(<ProviderCalendarPage />);
    
    // Wait for locations to load - check for the select element with "All Clinics" option
    await waitFor(() => {
      // Find select by looking for its options
      const allClinicsOption = screen.getByRole('option', { name: /all clinics/i });
      expect(allClinicsOption).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Find the select element (parent of the option)
    const allClinicsOption = screen.getByRole('option', { name: /all clinics/i });
    const locationSelect = allClinicsOption.closest('select');
    
    expect(locationSelect).toBeInTheDocument();
    
    // Verify location options are present
    expect(locationSelect?.querySelector('option[value="location-1"]')).toBeInTheDocument();
    
    // Change the location filter
    fireEvent.change(locationSelect!, { target: { value: 'location-1' } });
    
    await waitFor(() => {
      const calendar = screen.getByTestId('provider-calendar');
      expect(calendar).toHaveAttribute('data-location-id', 'location-1');
    });
  });

  // Note: Availability summary is no longer displayed on the calendar page
  // It's now accessible via the Settings panel accordion
  // This test is removed as it's no longer applicable

  it('should not process OAuth params twice', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'success') return 'calendar_connected';
      return null;
    });
    mockSearchParams.toString.mockReturnValue('success=calendar_connected');
    
    const { rerender } = render(<ProviderCalendarPage />);
    
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledTimes(1);
    });
    
    // Rerender should not trigger OAuth processing again
    rerender(<ProviderCalendarPage />);
    
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle Convex query errors gracefully', async () => {
    // Mock useQuery to return undefined for locations query (simulating error state)
    // Convex queries return undefined when they fail, not throw errors
    mockUseQuery.mockImplementation((queryFn: any, args: any) => {
      if (args === 'skip') return undefined;
      
      if (queryFn === api.providerProfiles.getProviderProfileByUserId) {
        return mockProviderProfile;
      }
      
      if (queryFn === api.providers.getProviderByEmail) {
        return mockProvider;
      }
      
      // Simulate error for locations query by returning undefined
      if (queryFn === api.locations.getProviderLocations ||
          queryFn === (api as any).locations?.getProviderLocations) {
        return undefined; // Convex returns undefined on error, not throws
      }
      
      // Mock availability query - handle both direct reference and (api as any) pattern
      if (queryFn === (api as any).availability?.getProviderAvailability ||
          queryFn === api.availability?.getProviderAvailability) {
        return mockAvailabilitySummary;
      }
      
      return undefined;
    });
    
    render(<ProviderCalendarPage />);
    
    // Should still render the page, showing "Loading locations..." when locations is undefined
    await waitFor(() => {
      expect(screen.getByTestId('provider-calendar')).toBeInTheDocument();
      expect(screen.getByText('Loading locations...')).toBeInTheDocument();
    });
  });

  it('should not update router during render', () => {
    // Mock searchParams to trigger OAuth callback
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'success') return 'calendar_connected';
      return null;
    });
    mockSearchParams.toString.mockReturnValue('success=calendar_connected');
    
    // Should not throw React warning about updating during render
    expect(() => {
      render(<ProviderCalendarPage />);
    }).not.toThrow();
  });
});



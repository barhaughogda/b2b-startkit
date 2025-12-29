/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-wrapper';
import { useQuery } from 'convex/react';
import { ProviderCalendar } from '@/components/calendar/ProviderCalendar';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Id } from '@/convex/_generated/dataModel';

// Mock Convex
vi.mock('convex/react');

// Mock the Convex API to provide structured mock functions
vi.mock('@/convex/_generated/api', () => ({
  api: {
    appointments: {
      getUserCalendarWithShares: 'appointments.getUserCalendarWithShares',
      getMultiUserAppointments: 'appointments.getMultiUserAppointments',
    },
    locations: {
      getLocationsByTenant: 'locations.getLocationsByTenant',
    },
    clinics: {
      getClinicsByTenant: 'clinics.getClinicsByTenant',
    },
    availability: {
      getUserClinicAvailabilityWindows: 'availability.getUserClinicAvailabilityWindows',
    },
  },
}));

// Mock useIsMobile
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

// Mock FullCalendar
vi.mock('@fullcalendar/react', () => ({
  default: function MockFullCalendar({ 
    events, 
    eventClick, 
    dateClick, 
    eventDrop,
    initialView,
    slotMinTime,
    slotMaxTime,
  }: any) {
    return (
      <div 
        data-testid="fullcalendar"
        data-initial-view={initialView}
        data-events-count={events?.length || 0}
        data-slot-min-time={slotMinTime}
        data-slot-max-time={slotMaxTime}
      >
        {events?.map((event: any, idx: number) => (
          <div 
            key={idx}
            data-testid={`calendar-event-${event.id}`}
            data-display={event.display}
            data-is-availability={event.extendedProps?.isAvailability || false}
            onClick={() => {
              if (!event.extendedProps?.isAvailability && !event.extendedProps?.isSelection) {
                eventClick?.({ event });
              }
            }}
          >
            {event.title}
          </div>
        ))}
        <button 
          onClick={() => dateClick?.({ date: new Date('2024-01-15') })}
          data-testid="mock-date-click"
        >
          Click Date
        </button>
        <button 
          onClick={() => eventDrop?.({ 
            event: { 
              extendedProps: { appointmentId: 'appt-1' },
              start: new Date('2024-01-16')
            } 
          })}
          data-testid="mock-event-drop"
        >
          Drop Event
        </button>
      </div>
    );
  },
}));

vi.mock('@fullcalendar/daygrid', () => ({
  default: {},
}));
vi.mock('@fullcalendar/timegrid', () => ({
  default: {},
}));
vi.mock('@fullcalendar/interaction', () => ({
  default: {},
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className }: any) => (
    <button 
      data-testid="button" 
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span 
      data-testid="badge" 
      className={className}
      data-variant={variant}
    >
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ id, checked, onCheckedChange, className }: any) => (
    <input
      type="checkbox"
      id={id}
      data-testid={`switch-${id}`}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={className}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={className} data-testid={`label-${htmlFor}`}>
      {children}
    </label>
  ),
}));

const mockUseQuery = useQuery as any;

describe('ProviderCalendar', () => {
  const mockUserId = 'user-123' as Id<'users'>;
  const mockTenantId = 'tenant-123';
  const mockClinicId = 'clinic-1' as Id<'clinics'>;
  const mockLocationId = 'location-1' as Id<'locations'>;

  const mockAppointments = [
    {
      _id: 'appt-1',
      patientId: 'patient-1',
      scheduledAt: new Date('2024-01-15T10:00:00').getTime(),
      duration: 30,
      status: 'scheduled',
      type: 'consultation',
      locationId: mockLocationId,
      clinicId: mockClinicId,
    },
    {
      _id: 'appt-2',
      patientId: 'patient-2',
      scheduledAt: new Date('2024-01-16T14:00:00').getTime(),
      duration: 60,
      status: 'confirmed',
      type: 'follow-up',
      locationId: undefined,
      clinicId: undefined,
    },
  ];

  const mockClinics = [
    { _id: mockClinicId, name: 'Main Clinic', timezone: 'America/New_York' },
  ];

  const mockAvailabilityWindows = {
    windows: [
      {
        clinicId: mockClinicId,
        clinicName: 'Main Clinic',
        date: '2024-01-15',
        dayOfWeek: 'monday',
        startTime: '09:00',
        endTime: '17:00',
        startTimestamp: new Date('2024-01-15T09:00:00').getTime(),
        endTimestamp: new Date('2024-01-15T17:00:00').getTime(),
        isOverride: false,
      },
      {
        clinicId: mockClinicId,
        clinicName: 'Main Clinic',
        date: '2024-01-16',
        dayOfWeek: 'tuesday',
        startTime: '09:00',
        endTime: '17:00',
        startTimestamp: new Date('2024-01-16T09:00:00').getTime(),
        endTimestamp: new Date('2024-01-16T17:00:00').getTime(),
        isOverride: false,
      },
    ],
    clinics: [{ id: mockClinicId, name: 'Main Clinic', timezone: 'America/New_York' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseQuery.mockImplementation((queryFn: any, args: any) => {
      if (args === 'skip') return undefined;
      
      // Match by query function string representation
      const queryStr = String(queryFn);
      
      // Mock appointments with shares query
      if (queryStr.includes('getUserCalendarWithShares')) {
        return mockAppointments;
      }
      
      // Mock multi-user appointments query
      if (queryStr.includes('getMultiUserAppointments')) {
        return [];
      }
      
      // Mock locations query
      if (queryStr.includes('getLocationsByTenant')) {
        return [{ _id: mockLocationId, name: 'Main Clinic', isDefault: true }];
      }
      
      // Mock clinics query
      if (queryStr.includes('getClinicsByTenant')) {
        return mockClinics;
      }
      
      // Mock availability windows query
      if (queryStr.includes('getUserClinicAvailabilityWindows')) {
        return mockAvailabilityWindows;
      }
      
      return undefined;
    });
  });

  it('should render calendar component', () => {
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('fullcalendar')).toBeInTheDocument();
  });

  it('should display calendar events including availability blocks', async () => {
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('calendar-event-appt-1')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-event-appt-2')).toBeInTheDocument();
    });
    
    // Availability blocks should be present (rendered as background)
    const calendar = screen.getByTestId('fullcalendar');
    // With 2 appointments + 2 availability windows = 4 events
    expect(parseInt(calendar.getAttribute('data-events-count') || '0')).toBeGreaterThanOrEqual(2);
  });

  it('should render availability blocks as background events', async () => {
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );
    
    await waitFor(() => {
      // Check that availability events have correct display type
      const availabilityEvents = screen.getAllByTestId(/calendar-event-availability/);
      expect(availabilityEvents.length).toBeGreaterThan(0);
      
      // Verify they're marked as background events
      availabilityEvents.forEach(event => {
        expect(event).toHaveAttribute('data-display', 'background');
        expect(event).toHaveAttribute('data-is-availability', 'true');
      });
    });
  });

  it('should filter events by clinicId when provided', async () => {
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
        clinicId={mockClinicId}
      />
    );
    
    await waitFor(() => {
      // Only appointment with matching clinicId should be shown
      expect(screen.getByTestId('calendar-event-appt-1')).toBeInTheDocument();
      expect(screen.queryByTestId('calendar-event-appt-2')).not.toBeInTheDocument();
    });
  });

  it('should support legacy locationId for backward compatibility', async () => {
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
        locationId={mockLocationId}
      />
    );
    
    await waitFor(() => {
      // Should filter by locationId when clinicId is not provided
      expect(screen.getByTestId('calendar-event-appt-1')).toBeInTheDocument();
      expect(screen.queryByTestId('calendar-event-appt-2')).not.toBeInTheDocument();
    });
  });

  it('should have Show Availability toggle', () => {
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByTestId('switch-show-availability')).toBeInTheDocument();
    expect(screen.getByTestId('label-show-availability')).toBeInTheDocument();
  });

  it('should hide availability blocks when toggle is turned off', async () => {
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );
    
    // Initially availability is shown
    await waitFor(() => {
      const calendar = screen.getByTestId('fullcalendar');
      const eventCount = parseInt(calendar.getAttribute('data-events-count') || '0');
      expect(eventCount).toBeGreaterThan(2); // More than just appointments
    });
    
    // Toggle off
    const toggle = screen.getByTestId('switch-show-availability');
    fireEvent.click(toggle);
    
    await waitFor(() => {
      // Should only have appointment events now
      expect(screen.queryByTestId(/calendar-event-availability/)).not.toBeInTheDocument();
    });
  });

  it('should have Focus Hours toggle', () => {
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByTestId('switch-focus-hours')).toBeInTheDocument();
    expect(screen.getByTestId('label-focus-hours')).toBeInTheDocument();
  });

  it('should update slot times when Focus Hours is enabled', async () => {
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );
    
    const calendar = screen.getByTestId('fullcalendar');
    
    // Initially default hours
    expect(calendar).toHaveAttribute('data-slot-min-time', '06:00:00');
    expect(calendar).toHaveAttribute('data-slot-max-time', '22:00:00');
    
    // Enable focus hours
    const focusToggle = screen.getByTestId('switch-focus-hours');
    fireEvent.click(focusToggle);
    
    await waitFor(() => {
      // Should use focused hours based on availability (9-17 with padding = 8-18)
      expect(calendar).toHaveAttribute('data-slot-min-time', '08:00:00');
      expect(calendar).toHaveAttribute('data-slot-max-time', '18:00:00');
    });
  });

  it('should call onEventClick when appointment is clicked', async () => {
    const handleEventClick = vi.fn();
    
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
        onEventClick={handleEventClick}
      />
    );
    
    await waitFor(() => {
      const event = screen.getByTestId('calendar-event-appt-1');
      fireEvent.click(event);
    });
    
    expect(handleEventClick).toHaveBeenCalled();
  });

  it('should NOT call onEventClick for availability blocks', async () => {
    const handleEventClick = vi.fn();
    
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
        onEventClick={handleEventClick}
      />
    );
    
    await waitFor(() => {
      const availabilityEvents = screen.queryAllByTestId(/calendar-event-availability/);
      if (availabilityEvents.length > 0) {
        fireEvent.click(availabilityEvents[0]);
      }
    });
    
    // Should not be called because availability blocks are non-interactive
    expect(handleEventClick).not.toHaveBeenCalled();
  });

  it('should call onDateClick when date is clicked', async () => {
    const handleDateClick = vi.fn();
    
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
        onDateClick={handleDateClick}
      />
    );
    
    const dateButton = screen.getByTestId('mock-date-click');
    fireEvent.click(dateButton);
    
    await waitFor(() => {
      expect(handleDateClick).toHaveBeenCalled();
    });
  });

  it('should call onEventDrop when event is dropped', async () => {
    const handleEventDrop = vi.fn();
    
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
        onEventDrop={handleEventDrop}
      />
    );
    
    const dropButton = screen.getByTestId('mock-event-drop');
    fireEvent.click(dropButton);
    
    await waitFor(() => {
      expect(handleEventDrop).toHaveBeenCalledWith('appt-1', expect.any(Date));
    });
  });

  it('should switch between week and day views', async () => {
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );
    
    const weekButton = screen.getByText('Week');
    const dayButton = screen.getByText('Day');
    
    expect(weekButton).toHaveAttribute('data-variant', 'default');
    
    fireEvent.click(dayButton);
    await waitFor(() => {
      expect(dayButton).toHaveAttribute('data-variant', 'default');
    });
  });

  it('should navigate calendar with prev/next buttons', async () => {
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );
    
    const prevButton = screen.getByText('← Prev');
    const nextButton = screen.getByText('Next →');
    const todayButton = screen.getByText('Today');
    
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
    expect(todayButton).toBeInTheDocument();
    
    fireEvent.click(prevButton);
    fireEvent.click(nextButton);
    fireEvent.click(todayButton);
    
    // Buttons should be clickable without errors
    await waitFor(() => {
      expect(prevButton).toBeInTheDocument();
    });
  });

  it('should display status legend', () => {
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('should handle empty appointments list', () => {
    mockUseQuery.mockImplementation((queryFn: any, args: any) => {
      if (args === 'skip') return undefined;
      const queryStr = String(queryFn);
      if (queryStr.includes('getUserCalendarWithShares')) {
        return [];
      }
      if (queryStr.includes('getMultiUserAppointments')) {
        return [];
      }
      if (queryStr.includes('getLocationsByTenant')) {
        return [];
      }
      if (queryStr.includes('getClinicsByTenant')) {
        return mockClinics;
      }
      if (queryStr.includes('getUserClinicAvailabilityWindows')) {
        return { windows: [], clinics: [] };
      }
      return undefined;
    });
    
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );
    
    const calendar = screen.getByTestId('fullcalendar');
    expect(calendar).toHaveAttribute('data-events-count', '0');
  });

  it('should handle loading state when queries are undefined', () => {
    mockUseQuery.mockImplementation(() => undefined);
    
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );
    
    // Calendar should still render
    expect(screen.getByTestId('fullcalendar')).toBeInTheDocument();
  });

  it('should display selection time block when provided', async () => {
    const selectionBlock = {
      start: new Date('2024-01-15T10:00:00'),
      end: new Date('2024-01-15T10:30:00'),
      date: '2024-01-15',
      time: '10:00',
      duration: 30,
    };
    
    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
        selectionTimeBlock={selectionBlock}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('calendar-event-__selection__')).toBeInTheDocument();
    });
  });
});

describe('ProviderCalendar Availability Overlay', () => {
  const mockUserId = 'user-123' as Id<'users'>;
  const mockTenantId = 'tenant-123';
  const mockClinicId1 = 'clinic-1' as Id<'clinics'>;
  const mockClinicId2 = 'clinic-2' as Id<'clinics'>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle multiple clinics with different availability', async () => {
    const multiClinicAvailability = {
      windows: [
        {
          clinicId: mockClinicId1,
          clinicName: 'Clinic A',
          date: '2024-01-15',
          dayOfWeek: 'monday',
          startTime: '08:00',
          endTime: '12:00',
          startTimestamp: new Date('2024-01-15T08:00:00').getTime(),
          endTimestamp: new Date('2024-01-15T12:00:00').getTime(),
          isOverride: false,
        },
        {
          clinicId: mockClinicId2,
          clinicName: 'Clinic B',
          date: '2024-01-15',
          dayOfWeek: 'monday',
          startTime: '14:00',
          endTime: '18:00',
          startTimestamp: new Date('2024-01-15T14:00:00').getTime(),
          endTimestamp: new Date('2024-01-15T18:00:00').getTime(),
          isOverride: false,
        },
      ],
      clinics: [
        { id: mockClinicId1, name: 'Clinic A', timezone: 'America/New_York' },
        { id: mockClinicId2, name: 'Clinic B', timezone: 'America/New_York' },
      ],
    };

    mockUseQuery.mockImplementation((queryFn: any, args: any) => {
      if (args === 'skip') return undefined;
      const queryStr = String(queryFn);
      if (queryStr.includes('getUserCalendarWithShares')) return [];
      if (queryStr.includes('getMultiUserAppointments')) return [];
      if (queryStr.includes('getLocationsByTenant')) return [];
      if (queryStr.includes('getClinicsByTenant')) {
        return [
          { _id: mockClinicId1, name: 'Clinic A' },
          { _id: mockClinicId2, name: 'Clinic B' },
        ];
      }
      if (queryStr.includes('getUserClinicAvailabilityWindows')) {
        return multiClinicAvailability;
      }
      return undefined;
    });

    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      // Both clinic availability blocks should be rendered
      const calendar = screen.getByTestId('fullcalendar');
      expect(parseInt(calendar.getAttribute('data-events-count') || '0')).toBe(2);
    });
  });

  it('should calculate focused hours from availability windows', async () => {
    const narrowAvailability = {
      windows: [
        {
          clinicId: mockClinicId1,
          clinicName: 'Clinic A',
          date: '2024-01-15',
          dayOfWeek: 'monday',
          startTime: '10:00',
          endTime: '14:00',
          startTimestamp: new Date('2024-01-15T10:00:00').getTime(),
          endTimestamp: new Date('2024-01-15T14:00:00').getTime(),
          isOverride: false,
        },
      ],
      clinics: [{ id: mockClinicId1, name: 'Clinic A', timezone: 'America/New_York' }],
    };

    mockUseQuery.mockImplementation((queryFn: any, args: any) => {
      if (args === 'skip') return undefined;
      const queryStr = String(queryFn);
      if (queryStr.includes('getUserCalendarWithShares')) return [];
      if (queryStr.includes('getMultiUserAppointments')) return [];
      if (queryStr.includes('getLocationsByTenant')) return [];
      if (queryStr.includes('getClinicsByTenant')) {
        return [{ _id: mockClinicId1, name: 'Clinic A' }];
      }
      if (queryStr.includes('getUserClinicAvailabilityWindows')) {
        return narrowAvailability;
      }
      return undefined;
    });

    render(
      <ProviderCalendar
        userId={mockUserId}
        tenantId={mockTenantId}
      />
    );

    // Enable focus hours
    const focusToggle = screen.getByTestId('switch-focus-hours');
    fireEvent.click(focusToggle);

    await waitFor(() => {
      const calendar = screen.getByTestId('fullcalendar');
      // With availability 10:00-14:00, focus should be 9:00-15:00 (1 hour padding)
      expect(calendar).toHaveAttribute('data-slot-min-time', '09:00:00');
      expect(calendar).toHaveAttribute('data-slot-max-time', '15:00:00');
    });
  });
});

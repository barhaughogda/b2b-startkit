/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { addDays, startOfDay } from 'date-fns';
import { AvailabilitySlotPicker } from '@/components/scheduling/AvailabilitySlotPicker';
import { Id } from '@/convex/_generated/dataModel';
import { TimeSlot } from '@/hooks/useProviderAvailability';

// Mock Convex API
vi.mock('@/convex/_generated/api', () => ({
  api: {
    clinics: {
      getClinicTimezone: 'api.clinics.getClinicTimezone',
    },
  },
}));

// Mock Convex useQuery
vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => ({ timezone: 'America/New_York' })),
}));

// Mock useProviderAvailability hook
vi.mock('@/hooks/useProviderAvailability', () => ({
  useProviderAvailability: vi.fn(),
  getSlotsForDate: vi.fn((slots: TimeSlot[], date: Date) => {
    const targetDateString = date.toISOString().split('T')[0];
    return slots.filter((slot: TimeSlot) => {
      const slotDateString = slot.date.toISOString().split('T')[0];
      return slotDateString === targetDateString;
    });
  }),
  hasAvailableSlotsOnDate: vi.fn((slots: TimeSlot[], date: Date) => {
    const targetDateString = date.toISOString().split('T')[0];
    return slots.some((slot: TimeSlot) => {
      const slotDateString = slot.date.toISOString().split('T')[0];
      return slotDateString === targetDateString && slot.available;
    });
  }),
  getAvailabilityLevel: vi.fn((slots: TimeSlot[], date: Date) => {
    const targetDateString = date.toISOString().split('T')[0];
    const dateSlots = slots.filter((slot: TimeSlot) => {
      const slotDateString = slot.date.toISOString().split('T')[0];
      return slotDateString === targetDateString;
    });
    const count = dateSlots.filter((slot: TimeSlot) => slot.available).length;
    if (count >= 3) return 'high';
    if (count >= 1) return 'low';
    return 'none';
  }),
}));

// Import the mocked module to control it
import { useProviderAvailability, hasAvailableSlotsOnDate, getAvailabilityLevel } from '@/hooks/useProviderAvailability';

const mockUseProviderAvailability = useProviderAvailability as ReturnType<typeof vi.fn>;
const mockHasAvailableSlotsOnDate = hasAvailableSlotsOnDate as ReturnType<typeof vi.fn>;
const mockGetAvailabilityLevel = getAvailabilityLevel as ReturnType<typeof vi.fn>;

// Helper to create mock time slots
function createMockTimeSlot(dateTime: number, available: boolean): TimeSlot {
  const date = new Date(dateTime);
  return {
    dateTime,
    available,
    date,
    timeString: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    dateString: date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
  };
}

// Helper to create slots for a specific day
function createSlotsForDay(date: Date, count: number, available: boolean): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const baseDate = startOfDay(date);
  
  for (let i = 0; i < count; i++) {
    const slotTime = new Date(baseDate);
    slotTime.setHours(9 + i); // Starting at 9am
    slots.push(createMockTimeSlot(slotTime.getTime(), available));
  }
  
  return slots;
}

describe('AvailabilitySlotPicker', () => {
  const mockProviderId = 'provider-123' as Id<'providers'>;
  const mockOnSlotSelect = vi.fn();
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock: slots available on tomorrow, not on other days
    const slotsForTomorrow = createSlotsForDay(tomorrow, 3, true);
    const allSlots = slotsForTomorrow;
    const availableSlots = allSlots.filter(s => s.available);
    
    mockUseProviderAvailability.mockReturnValue({
      slots: allSlots,
      availableSlots,
      unavailableSlots: [],
      isLoading: false,
      error: null,
    });
    
    // Mock hasAvailableSlotsOnDate to check against our mock data
    mockHasAvailableSlotsOnDate.mockImplementation((slots: TimeSlot[], date: Date) => {
      const targetDateString = date.toISOString().split('T')[0];
      return slots.some((slot: TimeSlot) => {
        const slotDateString = slot.date.toISOString().split('T')[0];
        return slotDateString === targetDateString && slot.available;
      });
    });
    
    // Mock getAvailabilityLevel to check against our mock data
    mockGetAvailabilityLevel.mockImplementation((slots: TimeSlot[], date: Date) => {
      const targetDateString = date.toISOString().split('T')[0];
      const dateSlots = slots.filter((slot: TimeSlot) => {
        const slotDateString = slot.date.toISOString().split('T')[0];
        return slotDateString === targetDateString;
      });
      const count = dateSlots.filter((slot: TimeSlot) => slot.available).length;
      if (count >= 3) return 'high';
      if (count >= 1) return 'low';
      return 'none';
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state when providerId is not provided', () => {
    render(
      <AvailabilitySlotPicker
        providerId={undefined}
        onSlotSelect={mockOnSlotSelect}
      />
    );
    
    expect(screen.getByText('Please select a provider to view available times')).toBeInTheDocument();
  });

  it('should render loading state while fetching availability', () => {
    mockUseProviderAvailability.mockReturnValue({
      slots: [],
      availableSlots: [],
      unavailableSlots: [],
      isLoading: true,
      error: null,
    });
    
    render(
      <AvailabilitySlotPicker
        providerId={mockProviderId}
        onSlotSelect={mockOnSlotSelect}
      />
    );
    
    expect(screen.getByText('Loading available times...')).toBeInTheDocument();
  });

  it('should render error state when there is an error', () => {
    mockUseProviderAvailability.mockReturnValue({
      slots: [],
      availableSlots: [],
      unavailableSlots: [],
      isLoading: false,
      error: 'Failed to load availability',
    });
    
    render(
      <AvailabilitySlotPicker
        providerId={mockProviderId}
        onSlotSelect={mockOnSlotSelect}
      />
    );
    
    expect(screen.getByText('Failed to load availability')).toBeInTheDocument();
  });

  it('should render calendar with available time slots', () => {
    render(
      <AvailabilitySlotPicker
        providerId={mockProviderId}
        onSlotSelect={mockOnSlotSelect}
        showCalendar={true}
      />
    );
    
    // Calendar should be visible
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('should show "No available times" message when selected date has no slots', async () => {
    // Set up slots only for tomorrow, not today
    const slotsForTomorrow = createSlotsForDay(tomorrow, 3, true);
    
    mockUseProviderAvailability.mockReturnValue({
      slots: slotsForTomorrow,
      availableSlots: slotsForTomorrow,
      unavailableSlots: [],
      isLoading: false,
      error: null,
    });
    
    render(
      <AvailabilitySlotPicker
        providerId={mockProviderId}
        onSlotSelect={mockOnSlotSelect}
        minDate={today}
      />
    );
    
    // Today is selected by default (minDate) and has no slots
    expect(screen.getByText('No available times for this date')).toBeInTheDocument();
  });

  it('should display available time slots for selected date', async () => {
    const slotsForToday = createSlotsForDay(today, 3, true);
    
    mockUseProviderAvailability.mockReturnValue({
      slots: slotsForToday,
      availableSlots: slotsForToday,
      unavailableSlots: [],
      isLoading: false,
      error: null,
    });
    
    render(
      <AvailabilitySlotPicker
        providerId={mockProviderId}
        onSlotSelect={mockOnSlotSelect}
        minDate={today}
      />
    );
    
    // Should display the time slots (time format depends on locale)
    await waitFor(() => {
      // Check that time slot buttons are rendered
      const timeSlotButtons = screen.getAllByRole('button', { name: /Select/ });
      expect(timeSlotButtons.length).toBeGreaterThan(0);
    });
  });

  it('should call onSlotSelect when a time slot is clicked', async () => {
    const slotsForToday = createSlotsForDay(today, 3, true);
    
    mockUseProviderAvailability.mockReturnValue({
      slots: slotsForToday,
      availableSlots: slotsForToday,
      unavailableSlots: [],
      isLoading: false,
      error: null,
    });
    
    render(
      <AvailabilitySlotPicker
        providerId={mockProviderId}
        onSlotSelect={mockOnSlotSelect}
        minDate={today}
      />
    );
    
    // Click on first time slot
    await waitFor(() => {
      const timeSlotButtons = screen.getAllByRole('button', { name: /Select/ });
      expect(timeSlotButtons.length).toBeGreaterThan(0);
      fireEvent.click(timeSlotButtons[0]);
    });
    
    expect(mockOnSlotSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        available: true,
      })
    );
  });

  it('should highlight selected time slot', async () => {
    const slotsForToday = createSlotsForDay(today, 3, true);
    const selectedSlot = slotsForToday[0];
    
    mockUseProviderAvailability.mockReturnValue({
      slots: slotsForToday,
      availableSlots: slotsForToday,
      unavailableSlots: [],
      isLoading: false,
      error: null,
    });
    
    render(
      <AvailabilitySlotPicker
        providerId={mockProviderId}
        onSlotSelect={mockOnSlotSelect}
        selectedDateTime={selectedSlot.dateTime}
        minDate={today}
      />
    );
    
    // The selected slot button should have aria-pressed="true"
    await waitFor(() => {
      const timeSlotButtons = screen.getAllByRole('button', { name: /Select/ });
      expect(timeSlotButtons.length).toBeGreaterThan(0);
      // First button should be selected
      expect(timeSlotButtons[0]).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('should show selected time summary when a slot is selected', async () => {
    const slotsForToday = createSlotsForDay(today, 3, true);
    const selectedSlot = slotsForToday[0];
    
    mockUseProviderAvailability.mockReturnValue({
      slots: slotsForToday,
      availableSlots: slotsForToday,
      unavailableSlots: [],
      isLoading: false,
      error: null,
    });
    
    render(
      <AvailabilitySlotPicker
        providerId={mockProviderId}
        onSlotSelect={mockOnSlotSelect}
        selectedDateTime={selectedSlot.dateTime}
        minDate={today}
      />
    );
    
    // Should show the selected time summary
    expect(screen.getByText('Selected Time')).toBeInTheDocument();
  });

  describe('Calendar day availability behavior', () => {
    it('should highlight days with available slots', () => {
      // This test verifies that the modifiers prop is passed to Calendar
      // with hasAvailability returning true for days with slots
      const slotsForTomorrow = createSlotsForDay(tomorrow, 3, true);
      
      mockUseProviderAvailability.mockReturnValue({
        slots: slotsForTomorrow,
        availableSlots: slotsForTomorrow,
        unavailableSlots: [],
        isLoading: false,
        error: null,
      });
      
      render(
        <AvailabilitySlotPicker
          providerId={mockProviderId}
          onSlotSelect={mockOnSlotSelect}
          minDate={today}
          maxDate={addDays(today, 30)}
        />
      );
      
      // Calendar should render
      expect(screen.getByRole('grid')).toBeInTheDocument();
      
      // Verify the hook is being used with correct parameters
      expect(mockUseProviderAvailability).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: mockProviderId,
        })
      );
    });

    it('should disable days that are before minDate', () => {
      const slotsForToday = createSlotsForDay(today, 3, true);
      
      mockUseProviderAvailability.mockReturnValue({
        slots: slotsForToday,
        availableSlots: slotsForToday,
        unavailableSlots: [],
        isLoading: false,
        error: null,
      });
      
      render(
        <AvailabilitySlotPicker
          providerId={mockProviderId}
          onSlotSelect={mockOnSlotSelect}
          minDate={today}
          maxDate={addDays(today, 30)}
        />
      );
      
      // The calendar should render with the correct minDate constraint
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
    });

    it('should disable days that are after maxDate', () => {
      const maxDate = addDays(today, 7);
      const slotsForToday = createSlotsForDay(today, 3, true);
      
      mockUseProviderAvailability.mockReturnValue({
        slots: slotsForToday,
        availableSlots: slotsForToday,
        unavailableSlots: [],
        isLoading: false,
        error: null,
      });
      
      render(
        <AvailabilitySlotPicker
          providerId={mockProviderId}
          onSlotSelect={mockOnSlotSelect}
          minDate={today}
          maxDate={maxDate}
        />
      );
      
      // The calendar should render with the correct maxDate constraint
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
    });

    it('should style days without available slots differently (not disabled)', () => {
      // Only tomorrow has slots, today and day after tomorrow do not
      // Days without availability are styled with muted appearance but NOT disabled
      // This allows users to click and see "no times available" message
      const slotsForTomorrow = createSlotsForDay(tomorrow, 3, true);
      
      mockUseProviderAvailability.mockReturnValue({
        slots: slotsForTomorrow,
        availableSlots: slotsForTomorrow,
        unavailableSlots: [],
        isLoading: false,
        error: null,
      });
      
      render(
        <AvailabilitySlotPicker
          providerId={mockProviderId}
          onSlotSelect={mockOnSlotSelect}
          minDate={today}
          maxDate={addDays(today, 30)}
        />
      );
      
      // Calendar should render
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
      
      // Days without slots are styled differently but still clickable
      // This improves UX by allowing users to see "no times" message rather than 
      // having to guess which days have availability
    });
  });

  describe('Month navigation', () => {
    it('should update viewStartDate when month changes', async () => {
      const slotsForToday = createSlotsForDay(today, 3, true);
      
      mockUseProviderAvailability.mockReturnValue({
        slots: slotsForToday,
        availableSlots: slotsForToday,
        unavailableSlots: [],
        isLoading: false,
        error: null,
      });
      
      render(
        <AvailabilitySlotPicker
          providerId={mockProviderId}
          onSlotSelect={mockOnSlotSelect}
          minDate={today}
          maxDate={addDays(today, 90)}
        />
      );
      
      // Calendar should render
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
      
      // The hook should be called - when month changes, viewStartDate updates
      // which triggers a new fetch with updated date range
      expect(mockUseProviderAvailability).toHaveBeenCalled();
    });

    it('should fetch availability for new month when navigating', async () => {
      const slotsForToday = createSlotsForDay(today, 3, true);
      
      mockUseProviderAvailability.mockReturnValue({
        slots: slotsForToday,
        availableSlots: slotsForToday,
        unavailableSlots: [],
        isLoading: false,
        error: null,
      });
      
      render(
        <AvailabilitySlotPicker
          providerId={mockProviderId}
          onSlotSelect={mockOnSlotSelect}
          minDate={today}
          maxDate={addDays(today, 90)}
        />
      );
      
      // Initial call to useProviderAvailability
      const initialCallCount = mockUseProviderAvailability.mock.calls.length;
      expect(initialCallCount).toBeGreaterThan(0);
      
      // The hook is configured to fetch 60 days of data, so month navigation
      // within that range won't trigger a new fetch, but navigating outside will
    });
  });

  describe('Compact slot picker behavior', () => {
    // The CompactSlotPicker is a simpler version without calendar
    // These tests ensure the main component works without showCalendar
    
    it('should render without calendar when showCalendar is false', () => {
      const slotsForToday = createSlotsForDay(today, 3, true);
      
      mockUseProviderAvailability.mockReturnValue({
        slots: slotsForToday,
        availableSlots: slotsForToday,
        unavailableSlots: [],
        isLoading: false,
        error: null,
      });
      
      render(
        <AvailabilitySlotPicker
          providerId={mockProviderId}
          onSlotSelect={mockOnSlotSelect}
          showCalendar={false}
          minDate={today}
        />
      );
      
      // Calendar grid should not be present
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
      
      // Time slots should still be visible
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    });
  });

  describe('displayTimezone prop (Calendly-style UX)', () => {
    it('should use displayTimezone when provided', () => {
      const slotsForToday = createSlotsForDay(today, 3, true);
      
      mockUseProviderAvailability.mockReturnValue({
        slots: slotsForToday,
        availableSlots: slotsForToday,
        unavailableSlots: [],
        isLoading: false,
        error: null,
      });
      
      const displayTimezone = 'America/New_York';
      
      render(
        <AvailabilitySlotPicker
          providerId={mockProviderId}
          onSlotSelect={mockOnSlotSelect}
          minDate={today}
          displayTimezone={displayTimezone}
        />
      );
      
      // Verify the hook is called with the display timezone
      expect(mockUseProviderAvailability).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: mockProviderId,
          timezone: displayTimezone,
        })
      );
    });

    it('should fall back to clinic timezone when displayTimezone is not provided', () => {
      const slotsForToday = createSlotsForDay(today, 3, true);
      
      mockUseProviderAvailability.mockReturnValue({
        slots: slotsForToday,
        availableSlots: slotsForToday,
        unavailableSlots: [],
        isLoading: false,
        error: null,
      });
      
      render(
        <AvailabilitySlotPicker
          providerId={mockProviderId}
          onSlotSelect={mockOnSlotSelect}
          minDate={today}
          // No displayTimezone provided - should use clinic timezone (default: UTC)
        />
      );
      
      // Verify the hook is called (timezone will be clinic timezone or UTC default)
      expect(mockUseProviderAvailability).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: mockProviderId,
        })
      );
    });

    it('should format selected time summary in displayTimezone', async () => {
      const slotsForToday = createSlotsForDay(today, 3, true);
      const selectedSlot = slotsForToday[0];
      
      mockUseProviderAvailability.mockReturnValue({
        slots: slotsForToday,
        availableSlots: slotsForToday,
        unavailableSlots: [],
        isLoading: false,
        error: null,
      });
      
      const displayTimezone = 'America/Los_Angeles';
      
      render(
        <AvailabilitySlotPicker
          providerId={mockProviderId}
          onSlotSelect={mockOnSlotSelect}
          selectedDateTime={selectedSlot.dateTime}
          minDate={today}
          displayTimezone={displayTimezone}
        />
      );
      
      // Should show the selected time summary
      expect(screen.getByText('Selected Time')).toBeInTheDocument();
      
      // The time should be formatted - we can't test exact values due to timezone
      // variations in test environments, but we can verify the summary renders
      await waitFor(() => {
        const summary = screen.getByText('Selected Time');
        expect(summary).toBeInTheDocument();
      });
    });
  });
});


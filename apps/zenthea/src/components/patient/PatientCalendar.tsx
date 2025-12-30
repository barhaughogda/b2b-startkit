'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { format, addDays, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { canUseConvexQuery } from '@/lib/convexIdValidation';
import { CareTeamProviderSelector } from './CareTeamProviderSelector';
import { CareTeamMember } from '@/hooks/useCareTeam';
import { useProviderAvailability, TimeSlot } from '@/hooks/useProviderAvailability';
import { getCSSVariable, BRAND_COLORS } from '@/lib/colors';
import { ClinicSelector } from '@/components/scheduling/ClinicSelector';
import { Building2 } from 'lucide-react';
import { loadDateTimePreferences, formatDateWithPrefs, type DateTimePreferences, type DateFormat } from '@/lib/datetime/formatting';

// Calendar status colors - resolved at render time for FullCalendar compatibility
const getCalendarStatusColors = () => {
  // Try to get CSS variable values, fallback to hardcoded values that match the color system
  const resolveColor = (cssVar: string, fallback: string): string => {
    if (typeof window === 'undefined') return fallback;
    const resolved = getCSSVariable(cssVar);
    return resolved || fallback;
  };

  return {
    scheduled: {
      bg: resolveColor('--color-status-info', '#0ea5e9'),
      border: resolveColor('--color-status-info', '#0ea5e9'),
      text: '#ffffff',
    },
    confirmed: {
      bg: resolveColor('--zenthea-teal', BRAND_COLORS.teal),
      border: resolveColor('--zenthea-teal', BRAND_COLORS.teal),
      text: '#ffffff',
    },
    'in-progress': {
      bg: resolveColor('--color-status-warning', '#d97706'),
      border: resolveColor('--color-status-warning', '#d97706'),
      text: '#000000',
    },
    completed: {
      bg: resolveColor('--color-text-secondary', '#6b7280'),
      border: resolveColor('--color-text-secondary', '#6b7280'),
      text: '#ffffff',
    },
    cancelled: {
      bg: resolveColor('--color-status-error', '#dc2626'),
      border: resolveColor('--color-status-error', '#dc2626'),
      text: '#ffffff',
    },
  };
};

// Appointment type returned from getPatientAppointments query
// Uses a flexible type that matches the actual query return type
type CalendarAppointment = {
  _id: string;
  _creationTime: number;
  patientId: string;
  providerId: string;
  scheduledAt: number;
  duration: number;
  type: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  tenantId: string;
  createdAt: number;
  updatedAt: number;
  userId?: string;
  locationId?: string;
  locationName?: string;
  // Enriched fields from query
  providerName?: string;
  providerSpecialty?: string;
  patientName?: string;
  patientEmail?: string;
} & Record<string, unknown>; // Allow additional properties for flexibility

// Patient appointment data for display
interface PatientAppointmentData {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  time: string;
  date: string;
  scheduledAt: number;
  duration: number;
  type: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  location?: string;
  locationId?: string;
  notes?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  display?: 'auto' | 'block' | 'list-item' | 'background' | 'inverse-background' | 'none';
  classNames?: string[];
  extendedProps: {
    type: 'appointment' | 'available-slot';
    appointmentId?: string;
    patientId?: string;
    patientName?: string;
    providerId?: string;
    providerName?: string;
    appointmentType?: string;
    status?: string;
    locationName?: string;
    locationId?: string;
    notes?: string;
    slotDateTime?: number;
    clinicId?: string;
    userId?: string;
  };
}

interface PatientCalendarProps {
  /** Called when an existing appointment is clicked */
  onAppointmentClick?: (appointmentData: PatientAppointmentData) => void;
  /** Called when an available slot is clicked (for booking) */
  onSlotClick?: (slot: TimeSlot, providerId: string, providerName: string) => void;
  /** Called when a date is clicked (for booking) */
  onDateClick?: (date: Date) => void;
  /** Whether to show booking mode UI */
  showBookingMode?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * PatientCalendar Component
 *
 * A calendar view for patients that displays:
 * - Their booked appointments in a FullCalendar view
 * - Available slots from selected providers (when in booking mode)
 * - Color-coded events: booked (teal), available (green), unavailable (gray)
 *
 * @example
 * ```tsx
 * <PatientCalendar
 *   onAppointmentClick={(apt) => openAppointmentCard({ mode: 'view', appointmentData: apt })}
 *   onSlotClick={(slot, providerId, name) => openBookingWithPrefill(slot, providerId)}
 *   showBookingMode
 * />
 * ```
 */
export function PatientCalendar({
  onAppointmentClick,
  onSlotClick,
  onDateClick,
  showBookingMode = true,
  className,
}: PatientCalendarProps) {
  const { data: session } = useZentheaSession();
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  const patientEmail = session?.user?.email;
  const userId = session?.user?.id;

  // Calendar state
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const calendarRef = useRef<FullCalendar>(null);
  
  // Load user's datetime preferences
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [dateFormat, setDateFormat] = useState<DateFormat>('MM/DD/YYYY');
  const [dateTimePrefs, setDateTimePrefs] = useState<DateTimePreferences>(() => loadDateTimePreferences());
  
  useEffect(() => {
    const prefs = loadDateTimePreferences();
    setTimeFormat(prefs.timeFormat);
    setDateFormat(prefs.dateFormat);
    setDateTimePrefs(prefs);
    
    // Listen for storage changes to update when preference changes in another tab/window
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'zenthea-time-format' && e.newValue) {
        setTimeFormat(e.newValue as '12h' | '24h');
        const updatedPrefs = loadDateTimePreferences();
        setDateTimePrefs(updatedPrefs);
      }
      if (e.key === 'zenthea-date-format' && e.newValue) {
        setDateFormat(e.newValue as DateFormat);
        const updatedPrefs = loadDateTimePreferences();
        setDateTimePrefs(updatedPrefs);
      }
    };
    
    // Listen for custom events for same-tab reactivity
    const handleTimeFormatChange = (e: CustomEvent<{ timeFormat: '12h' | '24h' }>) => {
      setTimeFormat(e.detail.timeFormat);
      const updatedPrefs = loadDateTimePreferences();
      setDateTimePrefs(updatedPrefs);
    };
    
    const handleDateFormatChange = (e: CustomEvent<{ dateFormat: DateFormat }>) => {
      setDateFormat(e.detail.dateFormat);
      const updatedPrefs = loadDateTimePreferences();
      setDateTimePrefs(updatedPrefs);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('zenthea-time-format-changed', handleTimeFormatChange as EventListener);
    window.addEventListener('zenthea-date-format-changed', handleDateFormatChange as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('zenthea-time-format-changed', handleTimeFormatChange as EventListener);
      window.removeEventListener('zenthea-date-format-changed', handleDateFormatChange as EventListener);
    };
  }, []);
  
  // Create time format objects based on user preference
  const timeFormatConfig = useMemo(() => {
    if (timeFormat === '24h') {
      return {
        eventTimeFormat: {
          hour: '2-digit' as const,
          minute: '2-digit' as const,
          hour12: false,
        },
        slotLabelFormat: {
          hour: '2-digit' as const,
          minute: '2-digit' as const,
          hour12: false,
        },
      };
    } else {
      return {
        eventTimeFormat: {
          hour: 'numeric' as const,
          minute: '2-digit' as const,
          meridiem: 'short' as const,
        },
        slotLabelFormat: {
          hour: 'numeric' as const,
          minute: '2-digit' as const,
          meridiem: 'short' as const,
        },
      };
    }
  }, [timeFormat]);

  // Create column header format function based on user's date format preference
  // Using dayHeaderContent hook which is called on every render and is more reliable
  const dayHeaderContent = useCallback((info: { date: Date; text: string; view: any }) => {
    const date = info.date;
    const day = date.getDate();
    const month = date.getMonth();
    const locale = dateTimePrefs.language === 'en' ? 'en-US' : dateTimePrefs.language;
    
    // Get short weekday name
    const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
    
    // Format date part according to user preference
    let datePart = '';
    switch (dateTimePrefs.dateFormat) {
      case 'MM/DD/YYYY':
        datePart = `${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        break;
      case 'DD/MM/YYYY':
        datePart = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;
        break;
      case 'YYYY-MM-DD':
        datePart = `${date.getFullYear()}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        break;
      case 'DD.MM.YYYY':
        datePart = `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}`;
        break;
      case 'DD MMM YYYY':
        const shortMonth = date.toLocaleDateString(locale, { month: 'short' });
        datePart = `${day} ${shortMonth}`;
        break;
      default:
        datePart = `${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    }
    
    return `${weekday} ${datePart}`;
  }, [dateTimePrefs]);

  // Booking mode state
  const [bookingModeEnabled, setBookingModeEnabled] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedProviderName, setSelectedProviderName] = useState<string>('');
  // Clinic-based availability state (for proper availability matching)
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [selectedProviderUserId, setSelectedProviderUserId] = useState<string>('');

  // Can query check
  const canQuery = canUseConvexQuery(userId, tenantId);

  // Calculate date range for queries
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (currentView === 'dayGridMonth') {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      end.setMonth(end.getMonth() + 2);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else {
      const daysOffset = currentView === 'timeGridWeek' ? 14 : 3;
      start.setDate(start.getDate() - daysOffset);
      start.setHours(0, 0, 0, 0);

      end.setDate(end.getDate() + daysOffset);
      end.setHours(23, 59, 59, 999);
    }

    return {
      start: start.getTime(),
      end: end.getTime(),
      startDate: start,
      endDate: end,
    };
  }, [currentDate, currentView]);

  // Fetch patient record
  const patient = useQuery(
    api.patients.getPatientByEmail,
    canQuery && patientEmail && tenantId
      ? { email: patientEmail, tenantId }
      : 'skip'
  );

  // Fetch patient's appointments
  const appointments = useQuery(
    api.appointments.getPatientAppointments,
    canQuery && patient?._id && tenantId
      ? {
          patientId: patient._id as Id<'patients'>,
          tenantId,
          startDate: dateRange.start,
          endDate: dateRange.end,
        }
      : 'skip'
  );

  // Fetch available slots when booking mode is enabled
  // Uses clinic-based availability if we have userId and clinicId (preferred)
  // Falls back to provider-based for backward compatibility
  const { slots: availableSlots, isLoading: slotsLoading } = useProviderAvailability({
    // Use clinic-based availability if we have userId and clinicId (preferred)
    userId: bookingModeEnabled && selectedProviderUserId && selectedClinicId
      ? selectedProviderUserId as Id<'users'>
      : undefined,
    clinicId: bookingModeEnabled && selectedClinicId
      ? selectedClinicId as Id<'clinics'>
      : undefined,
    // Fallback to provider-based for backward compatibility (when no userId/clinicId)
    providerId: bookingModeEnabled && selectedProviderId && !selectedClinicId && !selectedProviderUserId
      ? selectedProviderId as Id<'providers'>
      : undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    slotDuration: 30,
    tenantId,
  });

  // Handle provider selection for booking mode
  const handleProviderSelect = useCallback(
    (providerId: string, member?: CareTeamMember) => {
      setSelectedProviderId(providerId);
      setSelectedProviderName(member?.name || '');
      // Capture userId for clinic-based availability queries
      setSelectedProviderUserId(member?.userId ? String(member.userId) : '');
      // Reset clinic when provider changes (need to select new clinic)
      setSelectedClinicId('');
    },
    []
  );

  // Handle clinic selection for booking mode
  const handleClinicSelect = useCallback((clinicId: string) => {
    setSelectedClinicId(clinicId);
  }, []);

  // Transform data into calendar events
  const calendarEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    
    // Get resolved status colors (CSS variables resolved to actual color values)
    const statusColors = getCalendarStatusColors();

    // Add patient's booked appointments
    if (appointments && Array.isArray(appointments)) {
      (appointments as CalendarAppointment[]).forEach((appointment) => {
        const start = new Date(appointment.scheduledAt);
        const end = new Date(start.getTime() + (appointment.duration || 30) * 60 * 1000);

        const colors = statusColors[appointment.status as keyof typeof statusColors] || statusColors.scheduled;
        const providerName = appointment.providerName || 'Unknown Provider';

        events.push({
          id: appointment._id,
          title: `${providerName} - ${appointment.type || 'Appointment'}`,
          start,
          end,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          classNames: ['patient-appointment-event'],
          extendedProps: {
            type: 'appointment',
            appointmentId: appointment._id,
            patientId: appointment.patientId,
            patientName: appointment.patientName || '',
            providerId: appointment.providerId,
            providerName,
            appointmentType: appointment.type,
            status: appointment.status,
            locationName: appointment.locationName,
            locationId: appointment.locationId,
            notes: appointment.notes,
          },
        });
      });
    }

    // Add available slots when booking mode is enabled with clinic selected
    // Only show slots when clinic is selected (clinic-based availability is required)
    if (bookingModeEnabled && selectedProviderId && selectedClinicId && availableSlots) {
      // Resolve success color for available slots
      const successColor = typeof window !== 'undefined' 
        ? getCSSVariable('--color-status-success') || '#16a34a' 
        : '#16a34a';

      availableSlots
        .filter((slot) => slot.available)
        .forEach((slot) => {
          const start = slot.date;
          const end = new Date(slot.dateTime + 30 * 60 * 1000);

          // Check if this slot conflicts with an existing appointment
          const hasConflict = (appointments as CalendarAppointment[] | undefined)?.some((apt) => {
            const aptStart = apt.scheduledAt;
            const aptEnd = aptStart + (apt.duration || 30) * 60 * 1000;
            return slot.dateTime >= aptStart && slot.dateTime < aptEnd;
          });

          if (!hasConflict) {
            events.push({
              id: `available-${slot.dateTime}`,
              title: `Available - ${selectedProviderName || 'Provider'}`,
              start,
              end,
              backgroundColor: successColor,
              borderColor: successColor,
              textColor: '#ffffff',
              display: 'block',
              classNames: ['available-slot-event', 'cursor-pointer'],
              extendedProps: {
                type: 'available-slot',
                providerId: selectedProviderId,
                providerName: selectedProviderName,
                slotDateTime: slot.dateTime,
                // Include clinic info for booking
                clinicId: selectedClinicId,
                userId: selectedProviderUserId,
              },
            });
          }
        });
    }

    return events;
  }, [appointments, availableSlots, bookingModeEnabled, selectedProviderId, selectedProviderName, selectedClinicId, selectedProviderUserId]);

  // Handle event click
  const handleEventClick = useCallback(
    (info: any) => {
      const event = info.event;
      const extendedProps = event.extendedProps;

      if (extendedProps.type === 'appointment' && onAppointmentClick) {
        const appointmentData: PatientAppointmentData = {
          id: extendedProps.appointmentId,
          patientId: extendedProps.patientId,
          patientName: extendedProps.patientName,
          providerId: extendedProps.providerId,
          providerName: extendedProps.providerName,
          time: event.start
            ? event.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : '',
          date: event.start ? format(event.start, 'yyyy-MM-dd') : '',
          scheduledAt: event.start ? event.start.getTime() : 0,
          duration: event.end && event.start
            ? Math.round((event.end.getTime() - event.start.getTime()) / (60 * 1000))
            : 30,
          type: extendedProps.appointmentType || 'consultation',
          status: extendedProps.status || 'scheduled',
          location: extendedProps.locationName,
          locationId: extendedProps.locationId,
          notes: extendedProps.notes,
        };
        onAppointmentClick(appointmentData);
      } else if (extendedProps.type === 'available-slot' && onSlotClick) {
        const slot: TimeSlot = {
          dateTime: extendedProps.slotDateTime,
          available: true,
          date: event.start,
          timeString: event.start
            ? event.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
            : '',
          dateString: event.start
            ? format(event.start, 'EEE, MMM d')
            : '',
          fullDateString: event.start
            ? event.start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
            : '',
        };
        onSlotClick(slot, extendedProps.providerId, extendedProps.providerName);
      }
    },
    [onAppointmentClick, onSlotClick]
  );

  // Handle date click
  const handleDateClick = useCallback(
    (info: any) => {
      if (onDateClick) {
        onDateClick(info.date);
      }
    },
    [onDateClick]
  );

  // Calendar navigation handlers
  const handleViewChange = useCallback((view: any) => {
    setCurrentView(view.view.type);
    const viewStart = view.view.currentStart;
    setCurrentDate(viewStart);
    setDisplayDate(viewStart);
  }, []);

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi.view.type !== currentView) {
        calendarApi.changeView(currentView);
        setDisplayDate(calendarApi.getDate());
      }
    }
  }, [currentView]);

  const formatDateDisplay = useCallback(() => {
    if (!displayDate) return '';

    if (currentView === 'dayGridMonth') {
      // Month view: use locale-aware month/year
      const locale = dateTimePrefs.language === 'en' ? 'en-US' : dateTimePrefs.language;
      return displayDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    } else if (currentView === 'timeGridWeek') {
      // Format date according to user preferences
      const formatDateForWeekHeader = (date: Date): string => {
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();
        const locale = dateTimePrefs.language === 'en' ? 'en-US' : dateTimePrefs.language;
        const shortMonth = date.toLocaleDateString(locale, { month: 'short' });
        
        // Format based on user's date format preference
        switch (dateTimePrefs.dateFormat) {
          case 'MM/DD/YYYY':
          case 'DD/MM/YYYY':
            return `${shortMonth} ${day}`;
          case 'YYYY-MM-DD':
            return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          case 'DD.MM.YYYY':
            return `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}`;
          case 'DD MMM YYYY':
            return `${day} ${shortMonth}`;
          default:
            return `${shortMonth} ${day}`;
        }
      };

      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        const view = calendarApi.view;
        const start = view.activeStart;
        const end = new Date(view.activeEnd.getTime() - 24 * 60 * 60 * 1000); // Subtract a day since activeEnd is exclusive

        const startStr = formatDateForWeekHeader(start);
        const endStr = formatDateForWeekHeader(end);

        return `${startStr} - ${endStr}`;
      }
      // Fallback
      const locale = dateTimePrefs.language === 'en' ? 'en-US' : dateTimePrefs.language;
      return displayDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    } else {
      // Day view: Use user's date format preference
      return formatDateWithPrefs(displayDate, dateTimePrefs, true);
    }
  }, [displayDate, currentView, dateTimePrefs]);

  const handleTodayClick = useCallback(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.today();
      const today = new Date();
      setCurrentDate(today);
      setDisplayDate(today);
    }
  }, []);

  const handlePrevClick = useCallback(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.prev();
      const newDate = calendarApi.getDate();
      setCurrentDate(newDate);
      setDisplayDate(newDate);
    }
  }, []);

  const handleNextClick = useCallback(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.next();
      const newDate = calendarApi.getDate();
      setCurrentDate(newDate);
      setDisplayDate(newDate);
    }
  }, []);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-zenthea-teal" />
            My Calendar
          </CardTitle>

          {/* Booking Mode Toggle */}
          {showBookingMode && (
            <div className="flex items-center gap-3">
              <Label htmlFor="booking-mode" className="text-sm cursor-pointer">
                Show available slots
              </Label>
              <Switch
                id="booking-mode"
                checked={bookingModeEnabled}
                onCheckedChange={setBookingModeEnabled}
              />
            </div>
          )}
        </div>

        {/* Booking Mode Provider & Clinic Selector */}
        {showBookingMode && bookingModeEnabled && (
          <div className="mt-4 p-4 bg-surface-elevated rounded-lg border border-border-primary space-y-4">
            <CareTeamProviderSelector
              value={selectedProviderId}
              onValueChange={handleProviderSelect}
              label="View availability for"
              placeholder="Select a provider to see available slots"
              showPrimaryBadge
              showSpecialty
            />
            
            {/* Clinic selector - shows after provider is selected if userId is available */}
            {selectedProviderId && selectedProviderUserId && (
              <ClinicSelector
                value={selectedClinicId}
                onValueChange={handleClinicSelect}
                userId={selectedProviderUserId as Id<'users'>}
                tenantId={tenantId}
                label="Select Clinic Location"
                placeholder="Choose clinic to see availability"
                required
                showTimezone
              />
            )}
            
            {/* Message when provider is selected but no clinic yet */}
            {selectedProviderId && selectedProviderUserId && !selectedClinicId && (
              <div className="flex items-center gap-2 p-3 bg-status-info/10 border border-status-info/20 rounded-md">
                <Building2 className="h-4 w-4 text-status-info flex-shrink-0" />
                <span className="text-sm text-text-secondary">
                  Please select a clinic to view {selectedProviderName || 'provider'}&apos;s available time slots
                </span>
              </div>
            )}
            
            {/* Loading indicator when fetching slots */}
            {slotsLoading && selectedProviderId && selectedClinicId && (
              <div className="flex items-center gap-2 text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading available slots...</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {/* Calendar Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevClick}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleTodayClick}>
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextClick}
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Date Display */}
          <div className="flex-1 text-center">
            <h2 className="text-lg font-semibold text-text-primary">
              {formatDateDisplay()}
            </h2>
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-1">
            <Button
              variant={currentView === 'dayGridMonth' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('dayGridMonth')}
              title="Month view"
            >
              <CalendarDays className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Month</span>
            </Button>
            <Button
              variant={currentView === 'timeGridWeek' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('timeGridWeek')}
              title="Week view"
            >
              <CalendarRange className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Week</span>
            </Button>
            <Button
              variant={currentView === 'timeGridDay' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('timeGridDay')}
              title="Day view"
            >
              <CalendarClock className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Day</span>
            </Button>
          </div>
        </div>

        {/* FullCalendar */}
        <div className="patient-calendar-container">
          <FullCalendar
            key={`calendar-${dateTimePrefs.dateFormat}`}
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            headerToolbar={false}
            events={calendarEvents}
            editable={false}
            droppable={false}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            viewDidMount={handleViewChange}
            height="auto"
            dayMaxEvents={3}
            moreLinkClick="popover"
            eventDisplay="block"
            eventTimeFormat={timeFormatConfig.eventTimeFormat}
            slotLabelFormat={timeFormatConfig.slotLabelFormat}
            slotMinTime="00:00:00"
            slotMaxTime="23:59:00"
            slotDuration="00:30:00"
            allDaySlot={false}
            nowIndicator={true}
            locale={dateTimePrefs.language || 'en'}
            firstDay={1}
            timeZone="local"
            dayHeaderContent={dayHeaderContent}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border-primary">
          <span className="text-sm font-medium text-text-secondary">Legend:</span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-zenthea-teal text-white border-zenthea-teal">
              Confirmed
            </Badge>
            <Badge variant="outline" className="bg-status-info text-white border-status-info">
              Scheduled
            </Badge>
            <Badge variant="outline" className="bg-status-warning text-black border-status-warning">
              In Progress
            </Badge>
            {bookingModeEnabled && selectedClinicId && (
              <Badge variant="outline" className="bg-status-success text-white border-status-success">
                Available
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PatientCalendar;


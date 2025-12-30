'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { loadDateTimePreferences, formatDateWithPrefs, type DateTimePreferences, type DateFormat } from '@/lib/datetime/formatting';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCSSVariable } from '@/lib/colors';

// Clinic colors for availability blocks (using brand palette)
const CLINIC_COLORS = [
  { bg: 'rgba(95, 191, 175, 0.15)', border: 'rgba(95, 191, 175, 0.4)' }, // Zenthea teal
  { bg: 'rgba(95, 40, 74, 0.15)', border: 'rgba(95, 40, 74, 0.4)' }, // Zenthea purple
  { bg: 'rgba(232, 122, 110, 0.15)', border: 'rgba(232, 122, 110, 0.4)' }, // Zenthea coral
];

// Extended appointment data for event click handler
interface AppointmentEventData {
  patientId: string;
  patientName: string;
  time: string;
  date: string;
  duration: number;
  type: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  location?: string;
  locationId?: string;
  provider?: string;
  notes?: string;
}

interface ProviderCalendarProps {
  userId: Id<'users'>; // User who owns the calendar
  tenantId: string;
  locationId?: Id<'locations'>; // Legacy - kept for backward compatibility
  clinicId?: Id<'clinics'>; // Preferred - filter to specific clinic
  sharedUserIds?: string[]; // Additional users whose calendars to show (for shared calendars)
  onEventClick?: (appointmentId: string, appointmentData?: AppointmentEventData) => void;
  onDateClick?: (date: Date) => void;
  onEventDrop?: (appointmentId: string, newStart: Date) => void;
  selectionTimeBlock?: {
    start: Date;
    end: Date;
    date: string;
    time: string;
    duration: number;
  } | null; // Visual selection for appointment being created/edited
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor?: string;
  borderColor?: string;
  display?: 'auto' | 'block' | 'list-item' | 'background' | 'inverse-background' | 'none';
  classNames?: string[];
  extendedProps: {
    appointmentId: string;
    patientId: string;
    patientName: string;
    type: string;
    status: string;
    locationName?: string;
    locationId?: string;
    clinicId?: string;
    isShared?: boolean;
    ownerUserId?: string;
    userName?: string;
    notes?: string;
    isSelection?: boolean; // Mark selection events for styling
    isAvailability?: boolean; // Mark availability events for styling
  };
}

export function ProviderCalendar({
  userId,
  tenantId,
  locationId,
  clinicId,
  sharedUserIds = [],
  onEventClick,
  onDateClick,
  onEventDrop,
  selectionTimeBlock,
}: ProviderCalendarProps) {
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek');
  
  // Initialize with stable week-start date to prevent render loops
  // FullCalendar's viewDidMount fires with the week start date (Monday when firstDay=1)
  // CRITICAL: Must match FullCalendar's firstDay config (1 = Monday)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc.
    // Calculate Monday as week start to match firstDay={1}
    // If Sunday (0), go back 6 days; otherwise go back (day - 1) days
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  });
  const [displayDate, setDisplayDate] = useState<Date>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  });
  const calendarRef = useRef<FullCalendar>(null);
  
  // Mobile detection - used for default Day view on first session load
  const isMobile = useIsMobile();
  const mobileViewInitializedRef = useRef(false);
  
  // Set Day view once on first mobile load (sessionStorage-based to persist across navigations)
  useEffect(() => {
    // Skip if not mobile or already initialized this session
    if (!isMobile || mobileViewInitializedRef.current) return;
    
    // Check sessionStorage to see if we've already set mobile view this session
    const SESSION_KEY = 'calendar.mobileDayViewInitialized';
    const alreadyInitialized = sessionStorage.getItem(SESSION_KEY) === 'true';
    
    if (alreadyInitialized) {
      mobileViewInitializedRef.current = true;
      return;
    }
    
    // First time on mobile this session - switch to Day view
    mobileViewInitializedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, 'true');
    
    // Only update if not already on Day view (guard against render loops)
    setCurrentView((prev) => {
      if (prev !== 'timeGridDay') {
        return 'timeGridDay';
      }
      return prev;
    });
  }, [isMobile]);
  
  // Availability display toggles
  const [showAvailability, setShowAvailability] = useState(true);
  const [focusHours, setFocusHours] = useState(false);
  
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

  // Calculate date range for queries (current view ± 1 month for month view, ± 1 week for week/day views)
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (currentView === 'dayGridMonth') {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      
      end.setMonth(end.getMonth() + 2);
      end.setDate(0); // Last day of next month
      end.setHours(23, 59, 59, 999);
    } else {
      // Week or day view
      const daysOffset = currentView === 'timeGridWeek' ? 7 : 1;
      start.setDate(start.getDate() - daysOffset);
      start.setHours(0, 0, 0, 0);
      
      end.setDate(end.getDate() + daysOffset);
      end.setHours(23, 59, 59, 999);
    }

    return {
      start: start.getTime(),
      end: end.getTime(),
    };
  }, [currentDate, currentView]);

  // Fetch appointments for the date range using getUserCalendarWithShares
  // This handles both the user's own appointments and shared calendars
  const appointmentsWithShares = useQuery(
    api.appointments.getUserCalendarWithShares,
    userId && tenantId
      ? {
          userId,
          tenantId,
          startDate: dateRange.start,
          endDate: dateRange.end,
          includeSharedCalendars: true,
        }
      : 'skip'
  );

  // For multiple users (sharedUserIds), also fetch their appointments
  const sharedAppointments = useQuery(
    api.appointments.getMultiUserAppointments,
    sharedUserIds && sharedUserIds.length > 0 && tenantId
      ? {
          tenantId,
          startDate: dateRange.start,
          endDate: dateRange.end,
          userIds: sharedUserIds.map(id => id as Id<'users'>),
        }
      : 'skip'
  );

  // Combine appointments
  // getUserCalendarWithShares returns an array of enriched appointments
  const appointments = useMemo(() => {
    const ownAppointments = appointmentsWithShares || [];
    const shared = sharedAppointments || [];
    
    // Combine and deduplicate by appointment ID
    const combined = [...ownAppointments, ...shared];
    const unique = combined.filter((apt, index, self) =>
      index === self.findIndex(a => a._id === apt._id)
    );
    
    return unique;
  }, [appointmentsWithShares, sharedAppointments]);

  // Fetch patients for patient names (we'll batch fetch all needed patients)
  const patientIds = useMemo(() => {
    if (!appointments) return [];
    return Array.from(new Set(appointments.map(apt => apt.patientId)));
  }, [appointments]);

  // Note: We'd need a batch query for patients, but for now we'll fetch individually
  // This is not optimal but works for MVP - can be optimized later with a batch query

  // Fetch locations for display (user-based)
  // Use getLocationsByTenant - it's the existing function that works
  const locations = useQuery(
    api.locations.getLocationsByTenant,
    tenantId
      ? {
          tenantId,
        }
      : 'skip'
  );

  // Fetch user's clinic availability windows for the calendar overlay
  const availabilityData = useQuery(
    api.availability.getUserClinicAvailabilityWindows,
    userId && tenantId
      ? {
          userId,
          tenantId,
          startDate: dateRange.start,
          endDate: dateRange.end,
          clinicIds: clinicId ? [clinicId] : undefined,
        }
      : 'skip'
  );

  // Create a stable map of clinic IDs to color indices
  const clinicColorMap = useMemo(() => {
    const map = new Map<string, number>();
    if (availabilityData?.clinics) {
      availabilityData.clinics.forEach((clinic, index) => {
        map.set(clinic.id, index % CLINIC_COLORS.length);
      });
    }
    return map;
  }, [availabilityData?.clinics]);

  // Calculate focused hours based on availability windows
  const focusedHours = useMemo(() => {
    if (!focusHours || !availabilityData?.windows || availabilityData.windows.length === 0) {
      return { slotMinTime: '06:00:00', slotMaxTime: '22:00:00' };
    }

    let minHour = 23;
    let maxHour = 0;

    availabilityData.windows.forEach((window) => {
      const [startHour] = window.startTime.split(':').map(Number);
      const [endHour] = window.endTime.split(':').map(Number);
      if (startHour !== undefined && startHour < minHour) minHour = startHour;
      if (endHour !== undefined && endHour > maxHour) maxHour = endHour;
    });

    // Add 1 hour padding on each side
    const paddedMin = Math.max(0, minHour - 1);
    const paddedMax = Math.min(24, maxHour + 1);

    return {
      slotMinTime: `${paddedMin.toString().padStart(2, '0')}:00:00`,
      slotMaxTime: `${paddedMax.toString().padStart(2, '0')}:00:00`,
    };
  }, [focusHours, availabilityData?.windows]);

  // Transform appointments and availability into FullCalendar events
  const calendarEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // Add visual selection time block if an appointment is being created/edited
    if (selectionTimeBlock) {
      events.push({
        id: '__selection__',
        title: 'New Appointment',
        start: selectionTimeBlock.start,
        end: selectionTimeBlock.end,
        backgroundColor: 'rgba(95, 191, 175, 0.3)', // Zenthea teal with transparency
        borderColor: '#5FBFAF', // Zenthea teal solid border
        extendedProps: {
          appointmentId: '__selection__',
          patientId: '',
          patientName: 'New Appointment',
          type: 'selection',
          status: 'scheduled',
          isSelection: true, // Mark as selection for styling
        },
        display: 'block',
        classNames: ['appointment-selection'], // Custom class for styling
      });
    }

    // Add appointments as events
    if (appointments) {
      appointments.forEach((appointment) => {
        // Skip if clinicId filter is set and appointment doesn't match (preferred filter)
        if (clinicId && (appointment as any).clinicId !== clinicId) {
          return;
        }
        // Skip if location filter is set and appointment doesn't match (legacy filter)
        if (!clinicId && locationId && appointment.locationId !== locationId) {
          return;
        }

        const start = new Date(appointment.scheduledAt);
        const end = new Date(start.getTime() + appointment.duration * 60 * 1000);

        // Get patient name from enriched appointment data
        const patientName = (appointment as any).patientName || `Patient ${appointment.patientId.slice(-6)}`;
        const userName = (appointment as any).userName || '';
        const isShared = (appointment as any).isShared || false;
        const ownerUserId = (appointment as any).ownerUserId;

        // Color coding by status and user (for shared calendars) - using CSS variables for theme support
        const resolveColor = (cssVar: string, fallback: string): string => {
          if (typeof window === 'undefined') return fallback;
          const resolved = getCSSVariable(cssVar);
          return resolved || fallback;
        };

        const statusColors: Record<string, { bg: string; border: string }> = {
          scheduled: { 
            bg: resolveColor('--color-status-info', '#3b82f6'), 
            border: resolveColor('--color-status-info', '#2563eb') 
          },
          confirmed: { 
            bg: resolveColor('--zenthea-teal', '#10b981'), 
            border: resolveColor('--zenthea-teal-600', '#059669') 
          },
          'in-progress': { 
            bg: resolveColor('--color-status-warning', '#f59e0b'), 
            border: resolveColor('--color-status-warning', '#d97706') 
          },
          completed: { 
            bg: resolveColor('--color-text-secondary', '#6b7280'), 
            border: resolveColor('--color-text-secondary', '#4b5563') 
          },
          cancelled: { 
            bg: resolveColor('--color-status-error', '#ef4444'), 
            border: resolveColor('--color-status-error', '#dc2626') 
          },
        };

        // Use different color shades for shared calendars
        let colors = statusColors[appointment.status] || statusColors['scheduled'] || { bg: '#3b82f6', border: '#2563eb' };
        if (isShared && ownerUserId) {
          // Lighter/more transparent colors for shared calendars
          const baseColor = colors.bg;
          // Add slight transparency or tint for shared events
          colors = {
            bg: baseColor + '80', // Add transparency
            border: colors.border + 'CC',
          };
        }

        // Get location name
        const locationName = (appointment as any).locationName || locations?.find(
          (loc: any) => loc._id === appointment.locationId
        )?.name;

        // Build title with patient name and optionally user name for shared calendars
        let title = `${patientName} - ${appointment.type}`;
        if (isShared && userName) {
          title = `${userName}: ${title}`;
        }

        events.push({
          id: appointment._id,
          title,
          start,
          end,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          extendedProps: {
            appointmentId: appointment._id,
            patientId: appointment.patientId,
            patientName,
            type: appointment.type,
            status: appointment.status,
            locationName,
            locationId: appointment.locationId,
            isShared,
            ownerUserId,
            userName,
            notes: (appointment as any).notes,
          },
        });
      });
    }

    // Add availability blocks as background events when toggle is enabled
    if (showAvailability && availabilityData?.windows) {
      availabilityData.windows.forEach((window, index) => {
        // Skip if clinicId filter is set and doesn't match
        if (clinicId && window.clinicId !== clinicId) {
          return;
        }

        const colorIndex = clinicColorMap.get(window.clinicId) ?? 0;
        const colors = CLINIC_COLORS[colorIndex] || CLINIC_COLORS[0]!;

        // Use local date/time strings to display availability in the clinic's local time
        // This ensures 09:00 at the clinic displays as 09:00 regardless of browser timezone
        // Format: "2025-12-22T09:00:00" (no timezone offset = FullCalendar treats as local)
        const startDateTimeStr = `${window.date}T${window.startTime}:00`;
        const endDateTimeStr = `${window.date}T${window.endTime}:00`;

        events.push({
          id: `availability-${window.clinicId}-${window.date}-${index}`,
          title: window.clinicName,
          start: new Date(startDateTimeStr),
          end: new Date(endDateTimeStr),
          backgroundColor: colors.bg,
          borderColor: colors.border,
          display: 'background',
          extendedProps: {
            appointmentId: `availability-${window.clinicId}-${window.date}-${index}`,
            patientId: '',
            patientName: '',
            type: 'availability',
            status: 'available',
            clinicId: window.clinicId,
            isAvailability: true,
          },
        });
      });
    }

    return events;
  }, [appointments, locations, locationId, clinicId, selectionTimeBlock, showAvailability, availabilityData, clinicColorMap]);

  const handleEventClick = useCallback(
    (info: any) => {
      // Don't handle clicks on selection or availability events
      if (info.event.id === '__selection__' || info.event.extendedProps?.isAvailability) {
        return;
      }
      
      if (onEventClick) {
        const event = info.event;
        const extendedProps = event.extendedProps;
        
        // Build appointment data from event
        const appointmentData: AppointmentEventData = {
          patientId: extendedProps.patientId || '',
          patientName: extendedProps.patientName || 'Unknown Patient',
          time: event.start ? event.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
          date: event.start ? event.start.toISOString().split('T')[0]! : '',
          duration: event.end && event.start 
            ? Math.round((event.end.getTime() - event.start.getTime()) / (60 * 1000)) 
            : 30,
          type: extendedProps.type || 'consultation',
          status: extendedProps.status || 'scheduled',
          location: extendedProps.locationName,
          locationId: extendedProps.locationId,
          provider: extendedProps.userName || '',
          notes: extendedProps.notes,
        };
        
        onEventClick(extendedProps.appointmentId, appointmentData);
      }
    },
    [onEventClick]
  );

  const handleDateClick = useCallback(
    (info: any) => {
      if (onDateClick) {
        onDateClick(info.date);
      }
    },
    [onDateClick]
  );

  const handleEventDrop = useCallback(
    (info: any) => {
      if (onEventDrop) {
        onEventDrop(info.event.extendedProps.appointmentId, info.event.start);
      }
    },
    [onEventDrop]
  );

  const handleViewChange = useCallback((view: any) => {
    const newViewType = view.view.type;
    const viewStart = view.view.currentStart;
    
    // Only update state if actually different to prevent render loops
    setCurrentView((prev) => {
      if (prev !== newViewType) {
        return newViewType;
      }
      return prev;
    });
    
    // Only update date if significantly different (more than 1 second tolerance)
    setCurrentDate((prev) => {
      const startTime = viewStart.getTime();
      const prevTime = prev.getTime();
      if (Math.abs(startTime - prevTime) > 1000) {
        return viewStart;
      }
      return prev;
    });
    
    setDisplayDate((prev) => {
      const startTime = viewStart.getTime();
      const prevTime = prev.getTime();
      if (Math.abs(startTime - prevTime) > 1000) {
        return viewStart;
      }
      return prev;
    });
  }, []);

  // Update calendar view when currentView state changes
  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi.view.type !== currentView) {
        calendarApi.changeView(currentView);
        // Update display date when view changes
        setDisplayDate(calendarApi.getDate());
      }
    }
  }, [currentView]);

  // Format date display based on current view using user preferences
  const formatDateDisplay = useCallback(() => {
    if (!displayDate) return '';
    
    if (currentView === 'dayGridMonth') {
      // Month view: "January 2024" - use locale-aware month/year
      const locale = dateTimePrefs.language === 'en' ? 'en-US' : dateTimePrefs.language;
      return displayDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    } else if (currentView === 'timeGridWeek') {
      // Helper function to get ISO week number
      const getWeekNumber = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      };

      // Format date according to user preferences
      const formatDateForWeekHeader = (date: Date): string => {
        // For week header, we want a compact format like "Dec 15" or "15 Dec" depending on user preference
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

      // Week view: Get actual week range from calendar
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        const view = calendarApi.view;
        const start = view.activeStart;
        const end = view.activeEnd;
        
        const weekNumber = getWeekNumber(start);
        const startStr = formatDateForWeekHeader(start);
        const endStr = formatDateForWeekHeader(end);
        
        // If same month, show "Week 49: Dec 15 - 22, 2025", otherwise "Week 1: Dec 30 - Jan 5, 2024"
        if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
          return `Week ${weekNumber}: ${startStr} - ${end.getDate()}, ${end.getFullYear()}`;
        }
        return `Week ${weekNumber}: ${startStr} - ${endStr}`;
      }
      // Fallback if calendar ref not available
      const startOfWeek = new Date(displayDate);
      const dayOfWeek = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
      startOfWeek.setDate(diff);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const weekNumber = getWeekNumber(startOfWeek);
      const startStr = formatDateForWeekHeader(startOfWeek);
      const endStr = formatDateForWeekHeader(endOfWeek);
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `Week ${weekNumber}: ${startStr} - ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
      }
      return `Week ${weekNumber}: ${startStr} - ${endStr}`;
    } else {
      // Day view: Use user's date format preference
      return formatDateWithPrefs(displayDate, dateTimePrefs, false);
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
      // Update state to reflect the new date
      const newDate = calendarApi.getDate();
      setCurrentDate(newDate);
      setDisplayDate(newDate);
    }
  }, []);

  const handleNextClick = useCallback(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.next();
      // Update state to reflect the new date
      const newDate = calendarApi.getDate();
      setCurrentDate(newDate);
      setDisplayDate(newDate);
    }
  }, []);

  return (
    <Card className="w-full">
      <CardContent className="p-3 sm:p-6">
        {/* Calendar Controls - responsive layout for mobile */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-4">
          {/* Top row: Navigation and View buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Navigation buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevClick}
                className="min-h-[40px] min-w-[40px] sm:min-h-[32px] sm:min-w-0 px-2 sm:px-3"
              >
                <span className="hidden sm:inline">← Prev</span>
                <span className="sm:hidden">←</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTodayClick}
                className="min-h-[40px] sm:min-h-[32px] px-3 sm:px-3"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextClick}
                className="min-h-[40px] min-w-[40px] sm:min-h-[32px] sm:min-w-0 px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Next →</span>
                <span className="sm:hidden">→</span>
              </Button>
            </div>

            {/* View buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant={currentView === 'timeGridDay' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('timeGridDay')}
                className="min-h-[40px] sm:min-h-[32px] px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Day</span>
                <span className="sm:hidden">D</span>
              </Button>
              <Button
                variant={currentView === 'timeGridWeek' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('timeGridWeek')}
                className="min-h-[40px] sm:min-h-[32px] px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Week</span>
                <span className="sm:hidden">W</span>
              </Button>
              <Button
                variant={currentView === 'dayGridMonth' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('dayGridMonth')}
                className="min-h-[40px] sm:min-h-[32px] px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Month</span>
                <span className="sm:hidden">M</span>
              </Button>
            </div>
          </div>

          {/* Date Display - centered, full width on mobile */}
          <div className="flex justify-center order-first sm:order-none">
            <h2 className="text-base sm:text-lg font-semibold text-text-primary text-center">
              {formatDateDisplay()}
            </h2>
          </div>
        </div>

        {/* Availability Toggles - wrap on mobile */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-4 py-2 border-b">
          <div className="flex items-center gap-2">
            <Switch
              id="show-availability"
              checked={showAvailability}
              onCheckedChange={setShowAvailability}
              className="min-h-[24px]"
            />
            <Label htmlFor="show-availability" className="text-sm text-text-secondary cursor-pointer">
              Show Availability
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="focus-hours"
              checked={focusHours}
              onCheckedChange={setFocusHours}
              className="min-h-[24px]"
            />
            <Label htmlFor="focus-hours" className="text-sm text-text-secondary cursor-pointer">
              Focus Hours
            </Label>
          </div>
        </div>

        {/* FullCalendar Component */}
        <div className="calendar-container">
          <FullCalendar
            key={`calendar-${dateTimePrefs.dateFormat}`}
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            headerToolbar={false}
            events={calendarEvents}
            editable={!!onEventDrop}
            droppable={false}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            eventDrop={handleEventDrop}
            viewDidMount={handleViewChange}
            height="auto"
            dayMaxEvents={true}
            moreLinkClick="popover"
            eventDisplay="block"
            eventDidMount={(info) => {
              // Make selection and availability events non-interactive
              if (info.event.id === '__selection__' || info.event.extendedProps?.isAvailability) {
                info.el.style.pointerEvents = 'none';
                info.el.style.cursor = 'default';
              }
            }}
            eventTimeFormat={timeFormatConfig.eventTimeFormat}
            slotLabelFormat={timeFormatConfig.slotLabelFormat}
            slotMinTime={focusedHours.slotMinTime}
            slotMaxTime={focusedHours.slotMaxTime}
            slotDuration="00:30:00"
            allDaySlot={false}
            nowIndicator={true}
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
              startTime: '09:00',
              endTime: '17:00',
            }}
            locale={dateTimePrefs.language || 'en'}
            firstDay={1} // Start week on Monday
            dayHeaderContent={dayHeaderContent}
          />
        </div>

        {/* Legend - wrap on mobile */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-4 pt-4 border-t">
          <span className="text-sm font-medium text-text-secondary w-full sm:w-auto">Status:</span>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Badge variant="outline" className="bg-blue-500 text-white border-blue-600 text-xs sm:text-sm">
              Scheduled
            </Badge>
            <Badge variant="outline" className="bg-green-500 text-white border-green-600 text-xs sm:text-sm">
              Confirmed
            </Badge>
            <Badge variant="outline" className="bg-yellow-500 text-white border-yellow-600 text-xs sm:text-sm">
              In Progress
            </Badge>
            <Badge variant="outline" className="bg-gray-500 text-white border-gray-600 text-xs sm:text-sm">
              Completed
            </Badge>
            <Badge variant="outline" className="bg-red-500 text-white border-red-600 text-xs sm:text-sm">
              Cancelled
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


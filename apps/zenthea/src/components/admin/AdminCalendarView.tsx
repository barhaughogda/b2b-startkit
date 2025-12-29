'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, MapPin, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { loadDateTimePreferences, formatDateWithPrefs, type DateTimePreferences, type DateFormat } from '@/lib/datetime/formatting';
import { getCSSVariable } from '@/lib/colors';

interface AdminCalendarViewProps {
  tenantId: string;
  onEventClick?: (appointmentId: string) => void;
  onDateClick?: (date: Date, providerId?: Id<'providers'>) => void;
  onEventDrop?: (appointmentId: string, newStart: Date) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string; // Provider ID for resource view
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    appointmentId: string;
    patientName: string;
    providerName: string;
    type: string;
    status: string;
    locationName?: string;
  };
}

export function AdminCalendarView({
  tenantId,
  onEventClick,
  onDateClick,
  onEventDrop,
}: AdminCalendarViewProps) {
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const [selectedProviders, setSelectedProviders] = useState<Id<'providers'>[]>([]); // Empty = all providers
  const [selectedLocation, setSelectedLocation] = useState<Id<'locations'> | 'all'>('all');
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

  // Fetch all providers for the tenant
  const providers = useQuery(
    api.providers.getProvidersByTenant,
    tenantId ? { tenantId, limit: 100 } : 'skip'
  );

  // Fetch locations for filtering
  const locations = useQuery(
    api.locations.getLocationsByTenant,
    tenantId ? { tenantId } : 'skip'
  );

  // Calculate date range for queries
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

  // Fetch appointments for selected providers (or all if none selected)
  const appointments = useQuery(
    api.appointments.getMultiProviderAppointments,
    tenantId
      ? {
          tenantId,
          startDate: dateRange.start,
          endDate: dateRange.end,
          providerIds: selectedProviders.length > 0 ? selectedProviders : undefined,
        }
      : 'skip'
  );

  // Transform appointments into FullCalendar events
  const calendarEvents = useMemo((): CalendarEvent[] => {
    if (!appointments) return [];

    return appointments
      .filter((appointment) => {
        // Filter by location if selected
        if (selectedLocation !== 'all' && appointment.locationId !== selectedLocation) {
          return false;
        }
        return true;
      })
      .map((appointment) => {
        const start = new Date(appointment.scheduledAt);
        const end = new Date(start.getTime() + appointment.duration * 60 * 1000);

        // Color coding by status - using CSS variables for theme support
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

        const colors = statusColors[appointment.status] || statusColors.scheduled;

        // Title shows patient name and appointment type
        const title = `${appointment.patientName || 'Unknown Patient'} - ${appointment.type}`;

        return {
          id: appointment._id,
          title,
          start,
          end,
          resourceId: appointment.providerId, // For future resource timeline view support
          backgroundColor: colors.bg,
          borderColor: colors.border,
          extendedProps: {
            appointmentId: appointment._id,
            patientName: appointment.patientName || 'Unknown Patient',
            providerName: appointment.providerName || 'Unknown Provider',
            type: appointment.type,
            status: appointment.status,
            locationName: appointment.locationName || undefined,
          },
        };
      });
  }, [appointments, selectedLocation]);


  const handleEventClick = useCallback(
    (info: any) => {
      if (onEventClick) {
        onEventClick(info.event.extendedProps.appointmentId);
      } else {
        // Default: show appointment details
        const props = info.event.extendedProps;
        toast.info('Appointment Details', {
          description: `${props.patientName} with ${props.providerName} - ${props.type}`,
        });
      }
    },
    [onEventClick]
  );

  const handleDateClick = useCallback(
    (info: any) => {
      if (onDateClick) {
        const providerId = info.resource?.id;
        onDateClick(info.date, providerId);
      }
    },
    [onDateClick]
  );

  const handleEventDrop = useCallback(
    (info: any) => {
      if (onEventDrop) {
        onEventDrop(info.event.extendedProps.appointmentId, info.event.start);
      } else {
        toast.info('Appointment moved', {
          description: 'Appointment rescheduling functionality coming soon.',
        });
      }
    },
    [onEventDrop]
  );

  const handleViewChange = useCallback((view: any) => {
    setCurrentView(view.view.type);
    const viewStart = view.view.currentStart;
    setCurrentDate(viewStart);
    setDisplayDate(viewStart);
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

  const handleProviderToggle = useCallback((providerId: Id<'providers'>) => {
    setSelectedProviders((prev) => {
      if (prev.includes(providerId)) {
        return prev.filter((id) => id !== providerId);
      } else {
        return [...prev, providerId];
      }
    });
  }, []);

  const handleSelectAllProviders = useCallback(() => {
    if (providers && selectedProviders.length === providers.length) {
      setSelectedProviders([]); // Deselect all
    } else if (providers) {
      setSelectedProviders(providers.map((p) => p._id)); // Select all
    }
  }, [providers, selectedProviders]);

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Filters and Controls */}
        <div className="flex flex-col gap-4 mb-4">
          {/* Provider Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-text-primary">Filter by Provider</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllProviders}
              >
                {providers && selectedProviders.length === providers.length ? 'Deselect All' : 'Select All'}
              </Button>
              {providers?.map((provider) => (
                <div key={provider._id} className="flex items-center gap-2">
                  <Checkbox
                    id={`provider-${provider._id}`}
                    checked={selectedProviders.length === 0 || selectedProviders.includes(provider._id)}
                    onCheckedChange={() => handleProviderToggle(provider._id)}
                  />
                  <label
                    htmlFor={`provider-${provider._id}`}
                    className="text-sm text-text-secondary cursor-pointer"
                  >
                    {provider.firstName} {provider.lastName}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Location Filter */}
          {locations && locations.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-primary">Filter by Clinics</label>
              <Select value={selectedLocation} onValueChange={(value) => setSelectedLocation(value as Id<'locations'> | 'all')}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="All Clinics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clinics</SelectItem>
                  {locations.map((location: any) => (
                    <SelectItem key={location._id} value={location._id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Calendar Controls */}
        <div className="flex flex-col gap-4 mb-4">
          {/* Top row: Title on left, View switcher on right */}
          <div className="flex items-center justify-between">
            {/* Date Display */}
            <h2 className="text-lg font-semibold text-text-primary">
              {formatDateDisplay()}
            </h2>

            {/* View Switcher */}
            <div className="flex items-center gap-2">
              <Button
                variant={currentView === 'dayGridMonth' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('dayGridMonth')}
              >
                Month
              </Button>
              <Button
                variant={currentView === 'timeGridWeek' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('timeGridWeek')}
              >
                Week
              </Button>
              <Button
                variant={currentView === 'timeGridDay' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('timeGridDay')}
              >
                Day
              </Button>
            </div>
          </div>

          {/* Second row: Navigation buttons aligned under view switcher */}
          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevClick}
              >
                ← Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTodayClick}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextClick}
              >
                Next →
              </Button>
            </div>
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
            eventTimeFormat={timeFormatConfig.eventTimeFormat}
            slotLabelFormat={timeFormatConfig.slotLabelFormat}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
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

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <span className="text-sm font-medium text-text-secondary">Status:</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500 text-white border-blue-600">
              Scheduled
            </Badge>
            <Badge variant="outline" className="bg-green-500 text-white border-green-600">
              Confirmed
            </Badge>
            <Badge variant="outline" className="bg-yellow-500 text-white border-yellow-600">
              In Progress
            </Badge>
            <Badge variant="outline" className="bg-gray-500 text-white border-gray-600">
              Completed
            </Badge>
            <Badge variant="outline" className="bg-red-500 text-white border-red-600">
              Cancelled
            </Badge>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-text-tertiary">
            Showing {calendarEvents.length} appointment{calendarEvents.length !== 1 ? 's' : ''}
            {selectedProviders.length > 0 && ` for ${selectedProviders.length} selected provider${selectedProviders.length !== 1 ? 's' : ''}`}
            {selectedProviders.length === 0 && providers && ` for all ${providers.length} provider${providers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}


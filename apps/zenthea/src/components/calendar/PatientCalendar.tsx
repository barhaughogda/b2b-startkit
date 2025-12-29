'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadDateTimePreferences, formatDateWithPrefs, type DateTimePreferences, type DateFormat } from '@/lib/datetime/formatting';
import { getCSSVariable } from '@/lib/colors';

interface PatientAppointment {
  _id: string;
  scheduledAt: number;
  duration: number;
  type: 'consultation' | 'follow-up' | 'procedure' | 'emergency';
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  providerName?: string;
  providerSpecialty?: string;
  locationName?: string;
}

interface PatientCalendarProps {
  appointments: PatientAppointment[];
  isLoading?: boolean;
  onAppointmentClick?: (appointment: PatientAppointment) => void;
  onDateClick?: (date: Date) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    appointment: PatientAppointment;
    type: string;
    status: string;
  };
  classNames?: string[];
}

/**
 * Read-only calendar view for patients to see their appointments
 */
export function PatientCalendar({
  appointments,
  isLoading,
  onAppointmentClick,
  onDateClick,
}: PatientCalendarProps) {
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<PatientAppointment | null>(null);
  
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
  const calendarRef = React.useRef<any>(null);

  // Get color based on appointment status - using CSS variables for theme support
  const getStatusColor = useCallback((status: string) => {
    const resolveColor = (cssVar: string, fallback: string): string => {
      if (typeof window === 'undefined') return fallback;
      const resolved = getCSSVariable(cssVar);
      return resolved || fallback;
    };

    switch (status) {
      case 'confirmed':
        return { 
          bg: resolveColor('--zenthea-teal', 'rgb(95, 191, 175)'), 
          border: resolveColor('--zenthea-teal-600', 'rgb(75, 171, 155)'), 
          text: 'white' 
        };
      case 'scheduled':
        return { 
          bg: resolveColor('--color-status-info', 'rgb(95, 127, 191)'), 
          border: resolveColor('--color-status-info', 'rgb(75, 107, 171)'), 
          text: 'white' 
        };
      case 'completed':
        return { 
          bg: resolveColor('--color-status-success', 'rgb(107, 191, 95)'), 
          border: resolveColor('--color-status-success', 'rgb(87, 171, 75)'), 
          text: 'white' 
        };
      case 'cancelled':
        return { 
          bg: resolveColor('--color-status-error', 'rgb(191, 95, 95)'), 
          border: resolveColor('--color-status-error', 'rgb(171, 75, 75)'), 
          text: 'white' 
        };
      case 'in-progress':
        return { 
          bg: resolveColor('--color-status-warning', 'rgb(191, 175, 95)'), 
          border: resolveColor('--color-status-warning', 'rgb(171, 155, 75)'), 
          text: 'white' 
        };
      default:
        return { 
          bg: resolveColor('--color-text-secondary', 'rgb(156, 163, 175)'), 
          border: resolveColor('--color-text-secondary', 'rgb(136, 143, 155)'), 
          text: 'white' 
        };
    }
  }, []);

  // Get appointment type label
  const getTypeLabel = useCallback((type: string) => {
    switch (type) {
      case 'consultation':
        return 'Consultation';
      case 'follow-up':
        return 'Follow-up';
      case 'procedure':
        return 'Procedure';
      case 'emergency':
        return 'Emergency';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }, []);

  // Convert appointments to calendar events
  const calendarEvents = useMemo((): CalendarEvent[] => {
    return appointments.map((appointment) => {
      const startDate = new Date(appointment.scheduledAt);
      const endDate = new Date(appointment.scheduledAt + appointment.duration * 60 * 1000);
      const colors = getStatusColor(appointment.status);

      // Create title with provider name if available
      const title = appointment.providerName
        ? `${getTypeLabel(appointment.type)} with ${appointment.providerName}`
        : getTypeLabel(appointment.type);

      return {
        id: appointment._id,
        title,
        start: startDate,
        end: endDate,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: {
          appointment,
          type: appointment.type,
          status: appointment.status,
        },
      };
    });
  }, [appointments, getStatusColor, getTypeLabel]);

  // Handle event click
  const handleEventClick = useCallback(
    (info: any) => {
      const appointment = info.event.extendedProps.appointment;
      setSelectedAppointment(appointment);
      onAppointmentClick?.(appointment);
    },
    [onAppointmentClick]
  );

  // Handle date click
  const handleDateClick = useCallback(
    (info: any) => {
      onDateClick?.(info.date);
    },
    [onDateClick]
  );

  // Navigate calendar
  const goToToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
      setCurrentDate(new Date());
    }
  };

  const goToPrev = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.prev();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const goToNext = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.next();
      setCurrentDate(calendarApi.getDate());
    }
  };

  // Format current date for display using user preferences
  const currentDateDisplay = useMemo(() => {
    const locale = dateTimePrefs.language === 'en' ? 'en-US' : dateTimePrefs.language;
    return currentDate.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  }, [currentDate, dateTimePrefs]);

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-surface-elevated rounded w-48 mx-auto mb-4" />
            <div className="h-64 bg-surface-elevated rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Controls */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={goToNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-xl font-semibold text-text-primary">
                {currentDateDisplay}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={currentView === 'dayGridMonth' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCurrentView('dayGridMonth');
                  calendarRef.current?.getApi()?.changeView('dayGridMonth');
                }}
              >
                Month
              </Button>
              <Button
                variant={currentView === 'timeGridWeek' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCurrentView('timeGridWeek');
                  calendarRef.current?.getApi()?.changeView('timeGridWeek');
                }}
              >
                Week
              </Button>
              <Button
                variant={currentView === 'timeGridDay' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCurrentView('timeGridDay');
                  calendarRef.current?.getApi()?.changeView('timeGridDay');
                }}
              >
                Day
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <FullCalendar
            key={`calendar-${dateTimePrefs.dateFormat}`}
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            headerToolbar={false}
            events={calendarEvents}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            height="auto"
            aspectRatio={1.5}
            editable={false}
            selectable={false}
            eventDisplay="block"
            dayMaxEvents={3}
            moreLinkClick="popover"
            eventTimeFormat={timeFormatConfig.eventTimeFormat}
            slotLabelFormat={timeFormatConfig.slotLabelFormat}
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            nowIndicator={true}
            locale={dateTimePrefs.language || 'en'}
            dayHeaderContent={dayHeaderContent}
          />
        </CardContent>
      </Card>

      {/* Selected Appointment Details */}
      {selectedAppointment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Appointment Details</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedAppointment(null)}
              >
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-text-secondary" />
                <span className="text-sm">
                  {formatDateWithPrefs(new Date(selectedAppointment.scheduledAt), dateTimePrefs, true)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-secondary" />
                <span className="text-sm">
                  {new Date(selectedAppointment.scheduledAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                  {' '}({selectedAppointment.duration} min)
                </span>
              </div>
            </div>
            
            {selectedAppointment.providerName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-text-secondary" />
                <span className="text-sm">
                  {selectedAppointment.providerName}
                  {selectedAppointment.providerSpecialty && (
                    <span className="text-text-tertiary ml-1">
                      ({selectedAppointment.providerSpecialty})
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {getTypeLabel(selectedAppointment.type)}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  selectedAppointment.status === 'confirmed' && "bg-status-success/10 text-status-success",
                  selectedAppointment.status === 'scheduled' && "bg-status-info/10 text-status-info",
                  selectedAppointment.status === 'cancelled' && "bg-status-error/10 text-status-error",
                  selectedAppointment.status === 'completed' && "bg-zenthea-teal/10 text-zenthea-teal"
                )}
              >
                {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
              </Badge>
            </div>

            {selectedAppointment.notes && (
              <div className="bg-surface-elevated p-3 rounded-md">
                <p className="text-sm text-text-secondary">{selectedAppointment.notes}</p>
              </div>
            )}

            {selectedAppointment.locationName && (
              <div className="text-sm text-text-secondary">
                📍 {selectedAppointment.locationName}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(95, 191, 175)' }} />
              <span>Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(95, 127, 191)' }} />
              <span>Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(107, 191, 95)' }} />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(191, 95, 95)' }} />
              <span>Cancelled</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


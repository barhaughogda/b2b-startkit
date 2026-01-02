'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
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
import { useAppointments } from '@/hooks/useAppointments';
import { useClinics } from '@/hooks/useClinicProfile';
import { cn } from '@/lib/utils';

// Clinic colors for availability blocks (using brand palette)
const CLINIC_COLORS = [
  { bg: 'rgba(95, 191, 175, 0.15)', border: 'rgba(95, 191, 175, 0.4)' }, // Zenthea teal
  { bg: 'rgba(95, 40, 74, 0.15)', border: 'rgba(95, 40, 74, 0.4)' }, // Zenthea purple
  { bg: 'rgba(232, 122, 110, 0.15)', border: 'rgba(232, 122, 110, 0.4)' }, // Zenthea coral
];

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
  userId: string;
  tenantId: string;
  locationId?: string;
  clinicId?: string;
  sharedUserIds?: string[];
  onEventClick?: (appointmentId: string, appointmentData?: AppointmentEventData) => void;
  onDateClick?: (date: Date) => void;
  onEventDrop?: (appointmentId: string, newStart: Date) => void;
  selectionTimeBlock?: {
    start: Date;
    end: Date;
    date: string;
    time: string;
    duration: number;
  } | null;
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
    isSelection?: boolean;
    isAvailability?: boolean;
  };
}

export function ProviderCalendar({
  userId,
  tenantId,
  clinicId,
  sharedUserIds = [],
  onEventClick,
  onDateClick,
  onEventDrop,
  selectionTimeBlock,
}: ProviderCalendarProps) {
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const [showAvailability, setShowAvailability] = useState(true);
  const [focusHours, setFocusHours] = useState(true);
  
  const calendarRef = useRef<FullCalendar>(null);
  const isMobile = useIsMobile();
  const dateTimePrefs = useMemo(() => loadDateTimePreferences(), []);

  const { appointments, isLoading: appointmentsLoading } = useAppointments('all');
  const { clinics } = useClinics();

  // Availability migration pending
  const availabilityData = { windows: [], clinics: [] };

  const calendarEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    if (selectionTimeBlock) {
      events.push({
        id: '__selection__',
        title: 'New Appointment',
        start: selectionTimeBlock.start,
        end: selectionTimeBlock.end,
        backgroundColor: 'rgba(95, 191, 175, 0.3)',
        borderColor: '#5FBFAF',
        extendedProps: {
          appointmentId: '__selection__',
          patientId: '',
          patientName: 'New Appointment',
          type: 'selection',
          status: 'scheduled',
          isSelection: true,
        },
        display: 'block',
        classNames: ['appointment-selection'],
      });
    }

    if (appointments) {
      appointments.forEach((appointment) => {
        if (clinicId && appointment.clinicId !== clinicId) return;

        const start = new Date(appointment.scheduledAt);
        const end = new Date(start.getTime() + appointment.duration * 60 * 1000);

        const statusColors: Record<string, { bg: string; border: string }> = {
          scheduled: { bg: '#3b82f6', border: '#2563eb' },
          confirmed: { bg: '#10b981', border: '#059669' },
          'in-progress': { bg: '#f59e0b', border: '#d97706' },
          completed: { bg: '#6b7280', border: '#4b5563' },
          cancelled: { bg: '#ef4444', border: '#dc2626' },
        };

        const colors = statusColors[appointment.status] || statusColors['scheduled']!;

        events.push({
          id: appointment.id,
          title: `${appointment.patientName || 'Patient'} - ${appointment.type}`,
          start,
          end,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          extendedProps: {
            appointmentId: appointment.id,
            patientId: appointment.patientId,
            patientName: appointment.patientName || 'Patient',
            type: appointment.type,
            status: appointment.status,
            locationName: appointment.clinicName,
            locationId: appointment.clinicId,
            notes: appointment.notes,
          },
        });
      });
    }

    return events;
  }, [appointments, clinicId, selectionTimeBlock]);

  const handleEventClick = useCallback((info: any) => {
    if (info.event.id === '__selection__' || info.event.extendedProps?.isAvailability) return;
    
    if (onEventClick) {
      const event = info.event;
      const extendedProps = event.extendedProps;
      const data: AppointmentEventData = {
        patientId: extendedProps.patientId || '',
        patientName: extendedProps.patientName || 'Unknown Patient',
        time: event.start ? format(event.start, 'h:mm a') : '',
        date: event.start ? format(event.start, 'yyyy-MM-dd') : '',
        duration: event.end && event.start ? Math.round((event.end.getTime() - event.start.getTime()) / (60 * 1000)) : 30,
        type: extendedProps.type || 'consultation',
        status: extendedProps.status || 'scheduled',
        location: extendedProps.locationName,
        locationId: extendedProps.locationId,
        notes: extendedProps.notes,
      };
      onEventClick(extendedProps.appointmentId, data);
    }
  }, [onEventClick]);

  const handleDateClick = useCallback((info: any) => {
    if (onDateClick) onDateClick(info.date);
  }, [onDateClick]);

  const handleEventDrop = useCallback((info: any) => {
    if (onEventDrop) onEventDrop(info.event.extendedProps.appointmentId, info.event.start);
  }, [onEventDrop]);

  const handleViewChange = useCallback((view: any) => {
    setCurrentView(view.view.type);
    setDisplayDate(view.view.currentStart);
  }, []);

  const handleTodayClick = useCallback(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.today();
      setDisplayDate(api.getDate());
    }
  }, []);

  const handlePrevClick = useCallback(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.prev();
      setDisplayDate(api.getDate());
    }
  }, []);

  const handleNextClick = useCallback(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.next();
      setDisplayDate(api.getDate());
    }
  }, []);

  return (
    <Card className="w-full">
      <CardContent className="p-3 sm:p-6">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevClick}>←</Button>
              <Button variant="outline" size="sm" onClick={handleTodayClick}>Today</Button>
              <Button variant="outline" size="sm" onClick={handleNextClick}>→</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={currentView === 'timeGridDay' ? 'default' : 'outline'} size="sm" onClick={() => setCurrentView('timeGridDay')}>Day</Button>
              <Button variant={currentView === 'timeGridWeek' ? 'default' : 'outline'} size="sm" onClick={() => setCurrentView('timeGridWeek')}>Week</Button>
              <Button variant={currentView === 'dayGridMonth' ? 'default' : 'outline'} size="sm" onClick={() => setCurrentView('dayGridMonth')}>Month</Button>
            </div>
          </div>
          <div className="flex justify-center">
            <h2 className="text-lg font-semibold">{format(displayDate, 'MMMM yyyy')}</h2>
          </div>
        </div>

        <div className="calendar-container">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            headerToolbar={false}
            events={calendarEvents}
            editable={!!onEventDrop}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            eventDrop={handleEventDrop}
            viewDidMount={handleViewChange}
            height="auto"
            nowIndicator={true}
            allDaySlot={false}
            slotDuration="00:30:00"
          />
        </div>
      </CardContent>
    </Card>
  );
}

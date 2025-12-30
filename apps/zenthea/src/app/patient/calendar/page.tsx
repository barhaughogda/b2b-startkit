'use client';

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useRouter, useSearchParams } from 'next/navigation';
import { PatientCalendar } from '@/components/patient/PatientCalendar';
import { PatientDashboardContent } from '@/components/patient/PatientDashboardContent';
import { TimeSlot } from '@/hooks/useProviderAvailability';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, CalendarCheck, Plus } from 'lucide-react';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { CardType, Priority, TaskStatus } from '@/components/cards/types';

// Patient appointment data type
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

function PatientCalendarPageContent() {
  const { data: session, status: sessionStatus } = useZentheaSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openCard } = useCardSystem();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'today' | 'calendar'>('today');
  const tabInitializedRef = useRef(false);
  const mountedRef = useRef(false);

  // Component mounted flag
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Handle tab from URL query parameter - sync with URL changes
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const tab = searchParams.get('tab');
    
    if (tab === 'calendar') {
      setActiveTab('calendar');
    } else if (tab === 'today') {
      setActiveTab('today');
    } else if (!tab && !tabInitializedRef.current) {
      // No tab in URL on initial load - default to 'today' and update URL once
      setActiveTab('today');
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'today');
      router.replace(`/patient/calendar?${params.toString()}`, { scroll: false });
      tabInitializedRef.current = true;
      return;
    }
    
    tabInitializedRef.current = true;
  }, [searchParams, router]);

  // Handle tab change
  const handleTabChange = (tab: 'today' | 'calendar') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/patient/calendar?${params.toString()}`, { scroll: false });
  };

  // Handle appointment click (view existing appointment) - uses card system like Today tab
  const handleAppointmentClick = useCallback((appointmentData: PatientAppointmentData) => {
    // Transform to card data format (same as PatientDashboardContent)
    const appointmentCardData = {
      id: appointmentData.id,
      patientId: appointmentData.patientId,
      patientName: appointmentData.patientName || session?.user?.name || 'Patient',
      time: appointmentData.time,
      date: appointmentData.date,
      duration: appointmentData.duration || 30,
      type: appointmentData.type || 'consultation',
      status: appointmentData.status,
      location: appointmentData.location || '',
      provider: appointmentData.providerName || 'Unknown Provider',
      providerId: appointmentData.providerId, // Pass providerId for reschedule modal
      notes: appointmentData.notes || '',
      mode: 'view' as const,
    };

    // Map status to card status
    const cardStatus: TaskStatus = 
      appointmentData.status === 'completed' ? 'completed' :
      appointmentData.status === 'cancelled' ? 'cancelled' :
      appointmentData.status === 'confirmed' || appointmentData.status === 'scheduled' ? 'inProgress' : 'new';

    // Open the card using the card system
    openCard('appointment' as CardType, appointmentCardData, {
      patientId: appointmentData.patientId,
      patientName: appointmentData.patientName || session?.user?.name || 'Patient',
      priority: 'medium' as Priority,
      status: cardStatus,
    });
  }, [openCard, session?.user?.name]);

  // Handle available slot click (create new appointment)
  const handleSlotClick = useCallback(
    (slot: TimeSlot, providerId: string, providerName: string) => {
      // Open create card with prefilled data
      const slotDate = new Date(slot.dateTime);
      const appointmentCardData = {
        id: '',
        patientId: '',
        patientName: session?.user?.name || 'Patient',
        time: slotDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        date: slotDate.toISOString().split('T')[0]!,
        duration: 30,
        type: 'consultation',
        status: 'scheduled' as const,
        location: '',
        provider: providerName,
        notes: '',
        mode: 'create' as const,
        prefilledProviderId: providerId,
        prefilledDateTime: slot.dateTime,
      };

      openCard('appointment' as CardType, appointmentCardData, {
        patientId: '',
        patientName: session?.user?.name || 'Patient',
        priority: 'medium' as Priority,
        status: 'new' as TaskStatus,
      });
    },
    [openCard, session?.user?.name]
  );

  // Handle date click (open booking without prefilled slot)
  const handleDateClick = useCallback((date: Date) => {
    const appointmentCardData = {
      id: '',
      patientId: '',
      patientName: session?.user?.name || 'Patient',
      time: '',
      date: date.toISOString().split('T')[0]!,
      duration: 30,
      type: 'consultation',
      status: 'scheduled' as const,
      location: '',
      provider: '',
      notes: '',
      mode: 'create' as const,
    };

    openCard('appointment' as CardType, appointmentCardData, {
      patientId: '',
      patientName: session?.user?.name || 'Patient',
      priority: 'medium' as Priority,
      status: 'new' as TaskStatus,
    });
  }, [openCard, session?.user?.name]);

  // Handle new appointment button click
  const handleNewAppointment = useCallback(() => {
    const appointmentCardData = {
      id: '',
      patientId: '',
      patientName: session?.user?.name || 'Patient',
      time: '',
      date: new Date().toISOString().split('T')[0]!,
      duration: 30,
      type: 'consultation',
      status: 'scheduled' as const,
      location: '',
      provider: '',
      notes: '',
      mode: 'create' as const,
    };

    openCard('appointment' as CardType, appointmentCardData, {
      patientId: '',
      patientName: session?.user?.name || 'Patient',
      priority: 'medium' as Priority,
      status: 'new' as TaskStatus,
    });
  }, [openCard, session?.user?.name]);

  // Loading state
  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zenthea-teal" />
      </div>
    );
  }

  // Not authenticated
  if (sessionStatus === 'unauthenticated') {
    router.push('/login?callbackUrl=/patient/calendar');
    return null;
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-text-primary">
              Welcome back, {session?.user?.name?.split(' ')[0] || 'Patient'}
            </h1>
            <p className="text-text-secondary">
              Here&apos;s what&apos;s happening with your health today.
            </p>
          </div>
          <Button
            onClick={handleNewAppointment}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Schedule Appointment
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-end justify-center border-b relative min-h-[42px]">
          {/* Center: Today and Calendar */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'today' ? 'default' : 'ghost'}
              onClick={() => handleTabChange('today')}
              className="rounded-b-none"
            >
              <CalendarCheck className="mr-2 h-4 w-4" />
              Today
            </Button>
            <Button
              variant={activeTab === 'calendar' ? 'default' : 'ghost'}
              onClick={() => handleTabChange('calendar')}
              className="rounded-b-none"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </Button>
          </div>
        </div>

        {/* Today Tab Content */}
        {activeTab === 'today' && (
          <PatientDashboardContent />
        )}

        {/* Calendar Tab Content */}
        {activeTab === 'calendar' && (
          <PatientCalendar
            onAppointmentClick={handleAppointmentClick}
            onSlotClick={handleSlotClick}
            onDateClick={handleDateClick}
            showBookingMode
          />
        )}
      </div>
  );
}

export default function PatientCalendarPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zenthea-teal" />
      </div>
    }>
      <PatientCalendarPageContent />
    </Suspense>
  );
}


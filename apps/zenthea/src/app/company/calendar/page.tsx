'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect, Suspense, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { ProviderCalendar } from '@/components/calendar/ProviderCalendar';
import { CalendarSettingsPanel } from '@/components/calendar/CalendarSettingsPanel';
import { CalendarFiltersBar } from '@/components/calendar/CalendarFiltersBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Settings, CalendarCheck, Plus } from 'lucide-react';
import { canUseConvexQuery } from '@/lib/convexIdValidation';
import { toast } from 'sonner';
import { ConvexErrorBoundary } from '@/components/utils/ConvexErrorBoundary';
import { TodayContent } from '@/components/clinic/TodayContent';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { Priority, TaskStatus } from '@/components/cards/types';

function ClinicCalendarPageContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openCard, cards } = useCardSystem();
  const [selectedClinicId, setSelectedClinicId] = useState<Id<'clinics'> | undefined>(undefined);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'calendar' | 'sync'>('today');
  const processedParamsRef = useRef<string>('');
  const tabInitializedRef = useRef(false);
  const mountedRef = useRef(false);
  const isProcessingOAuthRef = useRef(false);

  // Find active appointment card in create/edit mode for visual selection
  const activeAppointmentSelection = useMemo(() => {
    const appointmentCard = cards.find(
      card => card.type === 'appointment' && 
      card.appointmentData && 
      (card.appointmentData.mode === 'create' || card.appointmentData.mode === 'edit')
    );
    
    if (!appointmentCard?.appointmentData) return null;
    
    const { date, time, duration } = appointmentCard.appointmentData;
    if (!date || !time) return null;
    
    // Calculate start and end times
    const startDate = new Date(`${date}T${time}`);
    const endDate = new Date(startDate.getTime() + (duration || 30) * 60 * 1000);
    
    return {
      start: startDate,
      end: endDate,
      date,
      time,
      duration: duration || 30,
    };
  }, [cards]);

  // Component mounted flag
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Handle tab from URL query parameter - sync with URL changes
  // Also handle migration from old availability/locations tabs to Settings panel
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const tab = searchParams.get('tab');
    
    // Migrate old tab URLs to Settings panel
    if (tab === 'availability' || tab === 'locations') {
      // Redirect to Settings tab and update URL
      setActiveTab('sync');
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'sync');
      router.replace(`/company/calendar?${params.toString()}`, { scroll: false });
      tabInitializedRef.current = true;
      return;
    }
    
    if (tab === 'sync') {
      setActiveTab('sync');
    } else if (tab === 'calendar') {
      setActiveTab('calendar');
    } else if (tab === 'today') {
      setActiveTab('today');
    } else if (!tab && !tabInitializedRef.current) {
      // No tab in URL on initial load - default to 'today' and update URL once
      setActiveTab('today');
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'today');
      router.replace(`/company/calendar?${params.toString()}`, { scroll: false });
    }
    tabInitializedRef.current = true;
  }, [searchParams, router]);

  // Handle OAuth callback success/error messages - only check once on mount
  useEffect(() => {
    if (!mountedRef.current) return;
    if (isProcessingOAuthRef.current) return;
    
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');
    const currentParamsString = searchParams.toString();
    
    // Skip if no success/error params
    if (!successParam && !errorParam) {
      return;
    }
    
    // Skip if we've already processed these exact params
    if (processedParamsRef.current === currentParamsString) {
      return;
    }

    // Set processing flag and mark params as processed
    isProcessingOAuthRef.current = true;
    processedParamsRef.current = currentParamsString;

    // Process the OAuth callback - use setTimeout to avoid updating during render
    setTimeout(() => {
      if (successParam === 'calendar_connected') {
        toast.success('Google Calendar connected', {
          description: 'Your Google Calendar has been successfully connected.',
        });
        router.replace('/company/calendar?tab=sync', { scroll: false });
        return;
      }

      if (errorParam) {
        const errorMessages: Record<string, string> = {
          oauth_cancelled: 'Google Calendar authorization was cancelled.',
          missing_code: 'Authorization code missing. Please try again.',
          expired_session: 'Session expired. Please try connecting again.',
          session_mismatch: 'Session verification failed. Please try again.',
          not_configured: 'Google Calendar integration is not configured.',
          oauth_failed: 'Failed to connect Google Calendar. Please try again.',
        };

        toast.error('Connection failed', {
          description: errorMessages[errorParam] || 'An error occurred while connecting Google Calendar.',
        });
        router.replace('/company/calendar?tab=sync', { scroll: false });
      }
      
      // Reset processing flag after a delay
      setTimeout(() => {
        isProcessingOAuthRef.current = false;
      }, 1000);
    }, 0);
    // Only run once on mount - OAuth callbacks should be handled server-side ideally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const tenantId = session?.user?.tenantId;
  const userId = session?.user?.id;

  // Check if we can use Convex queries
  const canQuery = canUseConvexQuery(userId, tenantId);

  // Convert userId to Convex ID format
  const finalUserId = useMemo(() => {
    if (canQuery && userId && typeof userId === 'string' && /^[jk][a-z0-9]{15,}$/.test(userId)) {
      return userId as Id<'users'>;
    }
    return undefined;
  }, [canQuery, userId]);

  // Get provider profile to find provider ID (for calendar functionality)
  // Use userId directly like in provider calendar page, not finalUserId
  const providerProfile = useQuery(
    api.providerProfiles.getProviderProfileByUserId,
    canQuery && userId && tenantId
      ? {
          userId: userId as Id<'users'>,
          tenantId: tenantId,
        }
      : 'skip'
  );

  // Get provider ID from profile
  const providerId = useMemo(() => {
    if (providerProfile?.providerId) {
      return providerProfile.providerId as Id<'providers'>;
    }
    return undefined;
  }, [providerProfile]);

  // Get provider by email as fallback
  const providerByEmail = useQuery(
    api.providers.getProviderByEmail,
    canQuery && session?.user?.email && tenantId && !providerId
      ? {
          email: session.user.email,
          tenantId: tenantId,
        }
      : 'skip'
  );

  // Use providerId from profile or from email lookup
  const finalProviderId = providerId || (providerByEmail?._id as Id<'providers'> | undefined);

  // Debug logging to understand what's happening (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && canQuery && userId && tenantId) {
      const debugInfo = {
        userId,
        tenantId,
        finalUserId,
        canQuery,
        providerProfile: providerProfile ? { hasProviderId: !!providerProfile.providerId, providerId: providerProfile.providerId } : null,
        providerByEmail: providerByEmail ? { hasId: !!providerByEmail._id, id: providerByEmail._id } : null,
        finalProviderId,
        providerProfileLoading: providerProfile === undefined,
        providerByEmailLoading: providerByEmail === undefined,
      };
      console.log('[Clinic Calendar] Availability Debug:', JSON.stringify(debugInfo, null, 2));
    }
  }, [canQuery, userId, tenantId, finalUserId, providerProfile, providerByEmail, finalProviderId]);

  // Get user's assigned clinics for the clinic filter dropdown
  const clinics = useQuery(
    api.clinics.getUserClinics,
    finalUserId && tenantId
      ? {
          userId: finalUserId,
          tenantId: tenantId,
        }
      : 'skip'
  );

  // Handle tab change - update both state and URL
  const handleTabChange = useCallback((tab: 'today' | 'calendar' | 'sync') => {
    setActiveTab(tab);
    // Update URL with tab query parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/company/calendar?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Handle clicking on an existing appointment - opens AppointmentCard in view mode
  const handleEventClick = (appointmentId: string, appointmentData?: {
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
  }) => {
    if (appointmentData) {
      const baseProps = {
        patientId: appointmentData.patientId,
        patientName: appointmentData.patientName,
        priority: 'medium' as Priority,
        status: appointmentData.status === 'completed' ? 'completed' : 'new' as TaskStatus,
      };

      openCard('appointment', {
        id: appointmentId,
        ...appointmentData,
        mode: 'view',
      }, baseProps);
    } else {
      // Fallback: navigate to appointment page if no data provided
      router.push(`/company/appointments/${appointmentId}`);
    }
  };

  // Handle clicking on a calendar date - opens AppointmentCard in create mode
  const handleDateClick = (date: Date) => {
    const baseProps = {
      patientId: '',
      patientName: 'New Appointment',
      priority: 'medium' as Priority,
      status: 'new' as TaskStatus,
    };

    openCard('appointment', {
      id: 'new',
      patientId: '',
      patientName: '',
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      date: date.toISOString().split('T')[0],
      duration: 30,
      type: 'consultation',
      status: 'scheduled',
      mode: 'create',
      prefilledDate: date,
    }, baseProps);
  };

  const handleEventDrop = (appointmentId: string, newStart: Date) => {
    toast.info('Appointment rescheduling coming soon', {
      description: 'This feature will be available in a future update.',
    });
  };

  if (!canQuery || !tenantId) {
    return (
      <ClinicLayout showSearch={true}>
        <div className="flex-1 pb-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-text-secondary">Please sign in to view your calendar.</p>
            </CardContent>
          </Card>
        </div>
      </ClinicLayout>
    );
  }

  if (!finalUserId) {
    return (
      <ClinicLayout showSearch={true}>
        <div className="flex-1 pb-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-text-secondary">
                Please sign in to view your calendar.
              </p>
            </CardContent>
          </Card>
        </div>
      </ClinicLayout>
    );
  }

  return (
    <ClinicLayout showSearch={true}>
      <div className="flex-1 pb-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Calendar</h1>
              <p className="text-text-secondary mt-1">Manage your appointments and availability</p>
            </div>
            {activeTab === 'calendar' && (
              <Button
                onClick={() => handleDateClick(new Date())}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Appointment
              </Button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between border-b relative">
            {/* Left spacer */}
            <div className="flex-1" />
            
            {/* Center: Today and Calendar */}
            <div className="flex gap-2 absolute left-1/2 transform -translate-x-1/2">
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
            
            {/* Right: Settings */}
            <div className="flex-1 flex justify-end">
              <Button
                variant={activeTab === 'sync' ? 'default' : 'ghost'}
                onClick={() => handleTabChange('sync')}
                className="rounded-b-none"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Today Tab Content */}
          {activeTab === 'today' && (
            <TodayContent />
          )}

          {/* Calendar Tab Content */}
          {activeTab === 'calendar' && (
            <>
              {/* Collapsible Filters Bar */}
              <CalendarFiltersBar
                userId={finalUserId}
                tenantId={tenantId}
                clinics={clinics as Array<{ _id: Id<'clinics'>; name: string }> | undefined}
                selectedClinicId={selectedClinicId}
                onClinicChange={(clinicId) => setSelectedClinicId(clinicId)}
                selectedUserIds={selectedUserIds}
                onSelectionChange={setSelectedUserIds}
              />

              {/* Main Calendar */}
              <ProviderCalendar
                userId={finalUserId}
                tenantId={tenantId}
                clinicId={selectedClinicId}
                sharedUserIds={selectedUserIds}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
                onEventDrop={handleEventDrop}
                selectionTimeBlock={activeAppointmentSelection}
              />
            </>
          )}

          {/* Settings Tab Content */}
          {activeTab === 'sync' && (
            finalUserId ? (
              <ConvexErrorBoundary
                fallback={
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-text-secondary">
                        Calendar settings are currently being deployed. Please check back in a few moments.
                      </p>
                    </CardContent>
                  </Card>
                }
                title="Calendar Settings Unavailable"
                description="The calendar settings feature requires additional setup. This is normal if the function hasn't been deployed yet."
              >
                <CalendarSettingsPanel
                  userId={finalUserId}
                  tenantId={tenantId}
                  providerId={finalProviderId}
                  clinicId={selectedClinicId}
                />
              </ConvexErrorBoundary>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-text-secondary">
                    Calendar settings require a valid user account. Please sign in to manage calendar settings.
                  </p>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>
    </ClinicLayout>
  );
}

export default function ClinicCalendarPage() {
  return (
    <ConvexErrorBoundary
      title="Calendar Error"
      description="Unable to load calendar data. This may happen if Convex functions are not deployed yet."
    >
      <Suspense
        fallback={
          <ClinicLayout showSearch={true}>
            <div className="flex-1 pb-6">
              <Card>
                <CardContent className="p-6">
                  <p className="text-text-secondary">Loading calendar...</p>
                </CardContent>
              </Card>
            </div>
          </ClinicLayout>
        }
      >
        <ClinicCalendarPageContent />
      </Suspense>
    </ConvexErrorBoundary>
  );
}


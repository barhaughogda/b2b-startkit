'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NotificationCenter } from '@/components/patient/NotificationCenter';
import { PatientAppointmentsList } from '@/components/patient/PatientAppointmentsList';
import { useAppointmentsStore } from '@/stores/appointmentsStore';
import { AppointmentsDebugInfo } from './debug-info';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { useAppointments, type ConvexAppointment } from '@/hooks/useAppointments';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { CardType, Priority, TaskStatus } from '@/components/cards/types';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Appointment {
  id: string;
  date: string;
  time: string;
  scheduledAt?: number;
  provider: {
    id: string;
    name: string;
    specialty: string;
  };
  type: string;
  status: string;
  location: string;
  locationId?: string;
  duration: string;
  durationMinutes?: number;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}

import { 
  Calendar, 
  Plus,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  Bell,
  CalendarDays,
} from 'lucide-react';

export default function PatientAppointmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  // Use the main card system for appointments
  const { openCard } = useCardSystem();

  // Use Convex hook for appointments
  const { 
    appointments: convexAppointments, 
    isLoading: convexLoading,
    patientId,
  } = useAppointments(filterStatus);

  // Transform Convex appointments to store format
  const appointments = useMemo(() => {
    if (!convexAppointments || convexAppointments.length === 0) {
      return [];
    }

    return convexAppointments.map((apt: ConvexAppointment) => {
      const scheduledDate = new Date(apt.scheduledAt);
      const dateStr = scheduledDate.toISOString().split('T')[0];
      const timeStr = scheduledDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const durationMinutes = apt.duration;
      const durationStr = `${durationMinutes} minutes`;

      return {
        id: apt._id,
        date: dateStr,
        time: timeStr,
        scheduledAt: apt.scheduledAt,
        provider: {
          id: apt.providerId ? String(apt.providerId) : '',
          name: apt.providerName || 'Unknown Provider',
          specialty: apt.providerSpecialty || 'General Medicine',
        },
        type: apt.type,
        status: apt.status,
        location: (apt as any).locationName || 'Main Office',
        locationId: apt.locationId ? String(apt.locationId) : undefined,
        duration: durationStr,
        durationMinutes: durationMinutes,
        notes: apt.notes,
        createdAt: apt.createdAt,
        updatedAt: apt.updatedAt,
      };
    });
  }, [convexAppointments]);

  // Use store for error handling
  const { 
    error, 
    clearError,
  } = useAppointmentsStore();

  const { unreadCount } = useNotificationsStore();

  // Use Convex loading state
  const isLoading = convexLoading;

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const filteredAppointments = appointments.filter((appointment: Appointment) => {
    const matchesSearch = appointment.provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || appointment.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Handle booking new appointment - opens AppointmentCard via main card system
  const handleBookAppointment = useCallback(() => {
    const baseProps = {
      patientId: patientId || '',
      patientName: session?.user?.name || '',
      priority: 'medium' as Priority,
      status: 'new' as TaskStatus,
    };

    openCard('appointment' as CardType, {
      id: 'new',
      patientId: patientId || '',
      patientName: session?.user?.name || '',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      date: new Date().toISOString().split('T')[0],
      duration: 30,
      type: 'consultation',
      status: 'scheduled',
      mode: 'create',
      prefilledDate: new Date(),
    }, baseProps);
  }, [openCard, patientId, session?.user?.name]);

  // Handle view/click appointment - opens AppointmentCard via main card system
  const handleAppointmentClick = useCallback((appointment: Appointment | { id: string; date?: string; originalDate?: string; time: string; provider: string | { id: string; name: string; specialty: string }; type?: string; title?: string; status: string; location?: string; duration?: string; notes?: string }) => {
    // Handle both FormattedAppointment (from PatientAppointmentsList) and StoreAppointment formats
    const isFormattedAppointment = 'originalDate' in appointment || 'title' in appointment || typeof appointment.provider === 'string';

    // Extract provider info
    const providerInfo = typeof appointment.provider === 'string' 
      ? { id: '', name: appointment.provider, specialty: '' }
      : appointment.provider as { id: string; name: string; specialty: string };

    // Get date/time values
    const aptDate = isFormattedAppointment 
      ? ((appointment as any).originalDate || appointment.date || '')
      : (appointment as Appointment).date;
    
    // Parse scheduledAt from the full appointment data if available
    const fullAppointment = convexAppointments?.find((apt: ConvexAppointment) => apt._id === appointment.id);

    // Get duration in minutes
    const durationStr = appointment.duration || '30';
    const durationMinutes = (appointment as Appointment).durationMinutes || 
      (typeof durationStr === 'string' ? parseInt(durationStr.match(/\d+/)?.[0] || '30', 10) : 30);

    // Map status for task card
    const taskStatus: TaskStatus = appointment.status === 'completed' ? 'completed' :
                                   appointment.status === 'cancelled' ? 'cancelled' :
                                   appointment.status === 'confirmed' || appointment.status === 'scheduled' ? 'inProgress' : 'new';

    // Open the appointment card via main card system
    openCard('appointment' as CardType, {
      id: appointment.id,
      patientId: patientId || '',
      patientName: session?.user?.name || '',
      time: appointment.time,
      date: aptDate,
      duration: durationMinutes,
      type: isFormattedAppointment ? ((appointment as any).title || appointment.type || 'consultation') : appointment.type || 'consultation',
      status: appointment.status,
      location: appointment.location || '',
      locationId: (appointment as Appointment).locationId || fullAppointment?.locationId,
      provider: providerInfo.name,
      providerId: fullAppointment?.providerId || providerInfo.id, // Pass providerId for reschedule modal
      notes: appointment.notes || '',
      mode: 'view',
    }, {
      patientId: patientId || '',
      patientName: session?.user?.name || '',
      priority: 'medium' as Priority,
      status: taskStatus,
    });
  }, [openCard, convexAppointments, patientId, session?.user?.name]);

  const handleRefresh = () => {
    // Convex queries are reactive and auto-update when data changes
    // No manual refresh needed - data will update automatically
  };

  return (
    <div className="space-y-6">
        {/* Debug Information (Development Only) */}
        <AppointmentsDebugInfo />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" id="appointments-heading">Appointments</h1>
            <p className="text-muted-foreground" id="appointments-description">
              Manage your scheduled appointments and visits
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
              aria-label="Refresh appointments list"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNotificationCenterOpen(true)}
              className="flex items-center gap-2 relative"
              aria-label={`View notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              Notifications
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  aria-label={`${unreadCount} unread notifications`}
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Link href="/patient/calendar">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                aria-label="View calendar"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Calendar
              </Button>
            </Link>
            <Button 
              variant="default"
              className="flex items-center gap-2"
              onClick={handleBookAppointment}
              aria-label="Schedule a new appointment"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Schedule Appointment
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="search-input"
                  placeholder="Search appointments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  aria-label="Search appointments by provider or type"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2" 
                  aria-label="Filter appointments"
                  data-testid="search-button"
                >
                  <Filter className="h-4 w-4" aria-hidden="true" />
                  Filter
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
                <select
                  data-testid="status-filter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-surface-elevated text-text-primary"
                  aria-label="Filter appointments by status"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-status-error bg-status-error-bg">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-status-error">
                <div className="text-sm font-medium">Error: {error}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="ml-auto text-status-error hover:text-status-error hover:opacity-80"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading appointments...</p>
            </CardContent>
          </Card>
        )}

        {/* Appointments List */}
        {!isLoading && (
          <div className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'You don\'t have any appointments scheduled yet'
                    }
                  </p>
                  <Button variant="default" onClick={handleBookAppointment}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Your First Appointment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <PatientAppointmentsList
                appointments={filteredAppointments}
                onAppointmentClick={handleAppointmentClick}
              />
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {appointments.filter((a: Appointment) => a.status === 'confirmed' || a.status === 'scheduled').length}
              </div>
              <div className="text-sm text-muted-foreground">Upcoming</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-status-success">
                {appointments.filter((a: Appointment) => a.status === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-status-warning">
                {appointments.filter((a: Appointment) => a.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Link href="/patient/calendar" className="contents">
            <Card className="cursor-pointer hover:bg-surface-elevated transition-colors">
              <CardContent className="p-4 text-center">
                <CalendarDays className="h-6 w-6 mx-auto text-zenthea-teal mb-1" />
                <div className="text-sm text-muted-foreground">View Calendar</div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Notification Center */}
        <NotificationCenter
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
        />
    </div>
  );
}

"use client";

// Force dynamic rendering - this page uses ClinicLayout which includes CardControlBar requiring CardSystemProvider context
export const dynamic = 'force-dynamic';

import { useMemo } from 'react';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin, Plus } from "lucide-react";
import { useAppointments, type ConvexAppointment } from '@/hooks/useAppointments';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { Priority, TaskStatus } from '@/components/cards/types';

// Helper function to get status color
function getStatusColor(status: string) {
  switch (status) {
    case 'confirmed':
      return 'bg-status-success text-white';
    case 'pending':
      return 'bg-status-warning text-white';
    case 'cancelled':
      return 'bg-status-error text-white';
    default:
      return 'bg-status-info text-white';
  }
}

export default function AppointmentsPage() {
  // Use Convex hook for appointments
  const { 
    appointments: convexAppointments, 
    isLoading,
  } = useAppointments('all');
  const { openCard } = useCardSystem();

  // Handle creating a new appointment - opens AppointmentCard in create mode
  const handleCreateAppointment = () => {
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
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      date: new Date().toISOString().split('T')[0]!,
      duration: 30,
      type: 'consultation',
      status: 'scheduled',
      mode: 'create',
      prefilledDate: new Date(),
    }, baseProps);
  };

  // Transform Convex appointments to display format
  const appointments = useMemo(() => {
    if (!convexAppointments || convexAppointments.length === 0) {
      return [];
    }

    return convexAppointments.map((apt: ConvexAppointment) => {
      const scheduledDate = new Date(apt.scheduledAt);
      const timeStr = scheduledDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const durationMinutes = apt.duration;
      const durationStr = `${durationMinutes} min`;

      return {
        id: apt._id,
        patientName: apt.patientName || 'Unknown Patient',
        time: timeStr,
        duration: durationStr,
        type: apt.type.charAt(0).toUpperCase() + apt.type.slice(1).replace('-', ' '),
        status: apt.status,
        // TODO: Add location field to Convex appointments schema
        // For now, using hardcoded default. Location should come from appointment data.
        location: 'Room 101',
      };
    });
  }, [convexAppointments]);

  if (isLoading) {
    return (
      <ClinicLayout showSearch={true}>
        <div className="flex-1 pb-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center py-12">
              <p className="text-text-secondary">Loading appointments...</p>
            </div>
          </div>
        </div>
      </ClinicLayout>
    );
  }

  return (
    <ClinicLayout showSearch={true}>
      <div className="flex-1 pb-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Appointments</h1>
            <p className="text-text-secondary mt-1">Manage your daily schedule and patient appointments</p>
          </div>

          {appointments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
                <p className="text-muted-foreground mb-4">
                  You don&apos;t have any appointments scheduled yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {appointments.map((appointment) => (
                <Card key={appointment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{appointment.patientName}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4" />
                          {appointment.time} • {appointment.duration}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Calendar className="h-4 w-4" />
                        {appointment.type}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <MapPin className="h-4 w-4" />
                        {appointment.location}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                      <Button size="sm">
                        Start Appointment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common appointment management tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="hover:text-white"
                  onClick={handleCreateAppointment}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Appointment
                </Button>
                <Button variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Add Patient
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClinicLayout>
  );
}


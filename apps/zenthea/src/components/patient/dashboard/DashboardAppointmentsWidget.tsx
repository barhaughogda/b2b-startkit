import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { CardType, Priority, TaskStatus } from '@/components/cards/types';

interface Appointment {
  id: number | string;
  date: string;
  time: string;
  provider: string;
  type: string;
  status: string;
}

interface DashboardAppointmentsWidgetProps {
  appointments: Appointment[];
  isLoading?: boolean;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export function DashboardAppointmentsWidget({ 
  appointments, 
  isLoading = false,
  onAppointmentClick 
}: DashboardAppointmentsWidgetProps) {
  const router = useRouter();
  const { openCard } = useCardSystem();
  const upcoming = appointments.slice(0, 2); // Show max 2

  const handleClick = (appointment: Appointment) => {
    if (onAppointmentClick) {
      onAppointmentClick(appointment);
    } else {
      // Fallback: navigate to appointments page if no handler provided
      router.push('/patient/appointments');
    }
  };

  // Handle scheduling new appointment via the main card system
  const handleScheduleAppointment = () => {
    const baseProps = {
      patientId: '',
      patientName: '',
      priority: 'medium' as Priority,
      status: 'new' as TaskStatus,
    };

    openCard('appointment' as CardType, {
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

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming Appointments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : upcoming.length > 0 ? (
          upcoming.map((apt) => (
            <div 
              key={apt.id} 
              onClick={() => handleClick(apt)}
              className="flex items-center justify-between p-3 rounded-lg border border-border-primary/50 bg-surface-elevated/30 hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <p className="font-medium text-sm text-text-primary">{apt.type}</p>
                <div className="flex items-center text-xs text-text-secondary gap-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {apt.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {apt.time}
                  </span>
                </div>
                <p className="text-xs text-text-tertiary">{apt.provider}</p>
              </div>
              <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs capitalize">
                {apt.status}
              </Badge>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-text-tertiary mb-2">No upcoming appointments</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleScheduleAppointment}
              className="mt-2"
            >
              Schedule one
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


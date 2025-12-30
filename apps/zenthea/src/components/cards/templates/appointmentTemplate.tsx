import React from 'react';
import { Calendar, MessageSquare } from 'lucide-react';
import { CardType, CardTemplate, BaseCardProps, CardEventHandlers } from '../types';
import { AppointmentCard, AppointmentFormData } from '../AppointmentCard';

// Extended props for appointment card with mode support
interface AppointmentCardExtendedProps extends BaseCardProps {
  appointmentData?: {
    id: string;
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
  };
  mode?: 'view' | 'edit' | 'create';
  prefilledDate?: Date;
  prefilledTime?: string;
  onSave?: (data: AppointmentFormData) => Promise<void>;
  onCancel?: () => void;
}

export const appointmentTemplate: CardTemplate = {
  type: 'appointment',
  config: {
    type: 'appointment',
    color: 'bg-blue-50 border-blue-200',
    icon: Calendar,
    size: {
      min: 300,
      max: 600,
      default: 400,
      current: 400
    },
    layout: 'horizontal',
    interactions: {
      resizable: true,
      draggable: true,
      stackable: true,
      minimizable: true,
      maximizable: true,
      closable: true
    },
    priority: {
      color: 'text-blue-600',
      borderColor: 'border-blue-500',
      icon: <MessageSquare className="h-4 w-4" />,
      badge: 'Appointment'
    }
  },
  render: (props: BaseCardProps) => {
    // Cast to extended props to access appointment-specific data
    const extendedProps = props as AppointmentCardExtendedProps;
    
    // Use provided appointment data or create default structure
    const rawAppointmentData = extendedProps.appointmentData || {
      id: props.id,
      patientId: props.patientId || '',
      patientName: props.patientName || '',
      time: extendedProps.prefilledTime || '10:00 AM',
      date: extendedProps.prefilledDate 
        ? extendedProps.prefilledDate.toISOString().split('T')[0]! 
        : new Date().toISOString().split('T')[0]!,
      duration: 30,
      type: 'consultation',
      status: 'scheduled' as const,
      location: 'Room 101',
      provider: 'Dr. Smith',
      notes: props.title || ''
    };
    
    // Extract mode, prefilledDate, and prefilledTime from appointmentData if they exist
    // (These are stored there when creating cards via openCard)
    const appointmentDataWithExtras = rawAppointmentData as any;
    // Priority: 1) mode from appointmentData, 2) mode from extendedProps, 3) default to 'view'
    // For new appointments, mode should be 'create' which will open in edit mode
    const mode = appointmentDataWithExtras?.mode ?? extendedProps.mode ?? 'view';
    const prefilledDate = appointmentDataWithExtras.prefilledDate 
      ? (appointmentDataWithExtras.prefilledDate instanceof Date 
          ? appointmentDataWithExtras.prefilledDate 
          : new Date(appointmentDataWithExtras.prefilledDate))
      : extendedProps.prefilledDate;
    const prefilledTime = appointmentDataWithExtras.prefilledTime || extendedProps.prefilledTime;
    
    // Clean appointmentData to remove non-appointment fields (mode, prefilledDate, prefilledTime)
    const appointmentData = {
      id: appointmentDataWithExtras.id,
      patientId: appointmentDataWithExtras.patientId,
      patientName: appointmentDataWithExtras.patientName,
      time: appointmentDataWithExtras.time,
      date: appointmentDataWithExtras.date,
      duration: appointmentDataWithExtras.duration,
      type: appointmentDataWithExtras.type,
      status: appointmentDataWithExtras.status,
      location: appointmentDataWithExtras.location,
      locationId: appointmentDataWithExtras.locationId,
      provider: appointmentDataWithExtras.provider,
      notes: appointmentDataWithExtras.notes,
      reminders: appointmentDataWithExtras.reminders,
      careTeam: appointmentDataWithExtras.careTeam,
      tags: appointmentDataWithExtras.tags,
      documents: appointmentDataWithExtras.documents,
      comments: appointmentDataWithExtras.comments,
    };
    
    return <AppointmentCard 
      {...props} 
      appointmentData={appointmentData}
      handlers={props.handlers || {} as CardEventHandlers}
      mode={mode}
      prefilledDate={prefilledDate}
      prefilledTime={prefilledTime}
      onSave={extendedProps.onSave}
      onCancel={extendedProps.onCancel}
    />;
  },
  validate: (props: BaseCardProps) => {
    // For create mode, we don't require patientId/patientName yet
    const extendedProps = props as AppointmentCardExtendedProps;
    if (extendedProps.mode === 'create') {
      return props.type === 'appointment';
    }
    // For view/edit mode, validate that required appointment data is present
    return props.type === 'appointment' && 
           Boolean(props.patientId) && 
           Boolean(props.patientName);
  }
};

/**
 * Appointments Hook
 * 
 * React hook for managing appointment data with Convex integration
 */

import { useQuery, useMutation } from 'convex/react';
import { useZentheaSession } from './useZentheaSession';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { canUseConvexQuery } from '@/lib/convexIdValidation';

export interface ConvexAppointment {
  _id: string;
  patientId: Id<'patients'>;
  providerId?: Id<'providers'>; // Optional for backward compatibility
  scheduledAt: number;
  duration: number;
  type: 'consultation' | 'follow-up' | 'procedure' | 'emergency';
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  locationId?: Id<'locations'>; // Optional location reference
  tenantId: string;
  createdAt: number;
  updatedAt: number;
  // Additional fields from queries
  providerName?: string;
  providerSpecialty?: string;
  patientName?: string;
  patientEmail?: string;
}

// Keep internal alias for backward compatibility
type Appointment = ConvexAppointment;

export function useAppointments(status: string = 'all') {
  const { data: session } = useZentheaSession();
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  const userEmail = session?.user?.email;
  const userRole = session?.user?.role;
  
  // Check if we can use Convex queries
  const canQuery = canUseConvexQuery(session?.user?.id, tenantId);
  
  // Get patient by email (for patient role)
  const patient = useQuery(
    api.patients.getPatientByEmail,
    canQuery && userRole === 'patient' && userEmail && tenantId
      ? { email: userEmail, tenantId }
      : 'skip'
  );
  
  // Get provider by email (for provider role)
  const provider = useQuery(
    api.providers.getProviderByEmail,
    canQuery && userRole === 'provider' && userEmail && tenantId
      ? { email: userEmail, tenantId }
      : 'skip'
  );
  
  // Fetch patient appointments
  const patientAppointments = useQuery(
    api.appointments.getPatientAppointments,
    canQuery && patient?._id && tenantId
      ? {
          patientId: patient._id as Id<'patients'>,
          tenantId,
          status: status !== 'all' ? status : undefined,
        }
      : 'skip'
  ) as ConvexAppointment[] | undefined;
  
  // Fetch provider appointments
  const providerAppointments = useQuery(
    api.appointments.getProviderAppointments,
    canQuery && provider?._id && tenantId
      ? {
          providerId: provider._id as Id<'providers'>,
          tenantId,
          status: status !== 'all' ? status : undefined,
        }
      : 'skip'
  ) as ConvexAppointment[] | undefined;
  
  // Determine which appointments to use based on role
  const appointments = userRole === 'patient' 
    ? (patientAppointments || [])
    : userRole === 'provider'
    ? (providerAppointments || [])
    : [];
  
  // Loading state: true if we're waiting for patient/provider lookup or appointments
  const isLoading = canQuery && (
    (userRole === 'patient' && (patient === undefined || patientAppointments === undefined)) ||
    (userRole === 'provider' && (provider === undefined || providerAppointments === undefined))
  );
  
  // Error state: if patient/provider not found when we have a valid session
  // Note: Convex query errors are handled by React error boundaries
  // This only handles the case where patient/provider record doesn't exist
  const error = canQuery && session?.user && (
    (userRole === 'patient' && patient === null) ||
    (userRole === 'provider' && provider === null)
  ) ? 'Patient/Provider record not found. Please contact support to set up your account.' : null;
  
  // Mutations
  const createAppointment = useMutation(api.appointments.createAppointment);
  const updateAppointment = useMutation(api.appointments.updateAppointment);
  const updateAppointmentStatus = useMutation(api.appointments.updateAppointmentStatus);
  const deleteAppointment = useMutation(api.appointments.deleteAppointment);
  
  return {
    appointments,
    isLoading,
    error,
    patientId: patient?._id as Id<'patients'> | undefined,
    providerId: provider?._id as Id<'providers'> | undefined,
    createAppointment,
    updateAppointment,
    updateAppointmentStatus,
    deleteAppointment,
  };
}


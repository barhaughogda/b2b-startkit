import useSWR from 'swr'
import { useZentheaSession } from './useZentheaSession'

/**
 * Core appointment data structure from the database
 */
export interface Appointment {
  id: string
  patientId: string
  clinicId?: string
  scheduledAt: string
  duration: number
  type: 'consultation' | 'follow-up' | 'procedure' | 'emergency'
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
  notes?: string
  patientName?: string
  clinicName?: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch appointments');
  }
  return res.json();
})

/**
 * Custom hook for fetching and managing appointment data from Postgres
 */
export function useAppointments(status: string = 'all') {
  const { data: session } = useZentheaSession()
  
  const queryParams = new URLSearchParams()
  if (status !== 'all') queryParams.append('status', status)

  const { data, error, isLoading, mutate } = useSWR<Appointment[]>(
    session ? `/api/appointments?${queryParams.toString()}` : null,
    fetcher
  )

  /**
   * Create a new appointment
   */
  const createAppointment = async (appointmentData: any) => {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to create appointment')
    }
    
    const newAppointment = await response.json()
    await mutate()
    return newAppointment
  }

  return {
    appointments: Array.isArray(data) ? data : [],
    isLoading,
    error,
    createAppointment,
    refreshAppointments: mutate,
  }
}

/**
 * Custom hook for a single appointment
 */
export function useAppointment(id: string) {
  const { data: session } = useZentheaSession()
  
  const { data, error, isLoading, mutate } = useSWR<Appointment & { members: any[] }>(
    session && id ? `/api/appointments/${id}` : null,
    fetcher
  )

  const updateAppointment = async (updateData: any) => {
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to update appointment')
    }
    
    const updated = await response.json()
    await mutate()
    return updated
  }

  const deleteAppointment = async () => {
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      throw new Error('Failed to delete appointment')
    }
    
    return await response.json()
  }

  return {
    appointment: data,
    isLoading,
    error,
    updateAppointment,
    deleteAppointment,
  }
}

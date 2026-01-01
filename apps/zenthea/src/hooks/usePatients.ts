import useSWR from 'swr'
import { useZentheaSession } from "./useZentheaSession"

/**
 * Core patient data structure from the database
 */
export interface Patient {
  /** Unique patient identifier (UUID) */
  id: string
  /** Patient's first name */
  firstName: string
  /** Patient's last name */
  lastName: string
  /** Date of birth as ISO string or timestamp */
  dateOfBirth: string | number
  /** Patient's email address */
  email?: string
  /** Patient's phone number */
  phone?: string
  /** Patient's address information */
  address?: any
  /** Patient's insurance information */
  insurance?: any
  /** Organization ID for multi-tenancy */
  organizationId: string
  /** Patient status */
  status: 'active' | 'inactive' | 'discharged'
  /** Primary provider ID */
  primaryProviderId?: string | null
  /** Record creation timestamp */
  createdAt: string
  /** Record last update timestamp */
  updatedAt: string
}

/**
 * Patient data with computed fields for display in the UI
 */
export interface PatientWithComputedFields extends Patient {
  /** Computed full name (firstName + lastName) */
  name: string
  /** Computed age from dateOfBirth */
  age: number
  /** Display status */
  displayStatus: string
  /** Patient avatar URL */
  avatar?: string
}

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch patients');
  }
  return res.json();
})

/**
 * Custom hook for fetching and managing patient data from Postgres
 */
export function usePatients() {
  const { data: session } = useZentheaSession()
  
  const { data, error, isLoading, mutate } = useSWR<Patient[]>(
    session ? '/api/patients' : null,
    fetcher
  )

  // Compute fields for display
  const safeData = Array.isArray(data) ? data : [];
  const patients: PatientWithComputedFields[] = safeData.map((patient) => {
    const dob = new Date(patient.dateOfBirth)
    const age = Math.floor((new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    
    return {
      ...patient,
      name: `${patient.firstName} ${patient.lastName}`,
      age,
      displayStatus: patient.status.charAt(0).toUpperCase() + patient.status.slice(1),
      avatar: (patient as any).avatarUrl, // Map avatarUrl from DB to avatar for UI
    }
  })

  /**
   * Create a new patient
   */
  const createPatient = async (patientData: Partial<Patient>) => {
    const response = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to create patient')
    }
    
    const newPatient = await response.json()
    await mutate() // Refresh the list
    return newPatient
  }

  return {
    patients,
    isLoading,
    error,
    createPatient,
    refreshPatients: mutate,
  }
}

/**
 * Custom hook for a single patient
 */
export function usePatient(id: string) {
  const { data: session } = useZentheaSession()
  
  const { data, error, isLoading, mutate } = useSWR<Patient>(
    session && id ? `/api/patients/${id}` : null,
    fetcher
  )

  const patient: PatientWithComputedFields | null = data ? {
    ...data,
    name: `${data.firstName} ${data.lastName}`,
    age: Math.floor((new Date().getTime() - new Date(data.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
    displayStatus: data.status.charAt(0).toUpperCase() + data.status.slice(1),
    avatar: (data as any).avatarUrl,
  } : null

  const updatePatient = async (updateData: Partial<Patient>) => {
    const response = await fetch(`/api/patients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to update patient')
    }
    
    const updated = await response.json()
    await mutate()
    return updated
  }

  return {
    patient,
    isLoading,
    error,
    updatePatient,
  }
}

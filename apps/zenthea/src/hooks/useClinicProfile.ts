import useSWR from 'swr'
import { useZentheaSession } from './useZentheaSession'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * Custom hook for fetching and managing clinic data from Postgres
 */
export function useClinics() {
  const { data: session } = useZentheaSession()
  
  const { data, error, isLoading, mutate } = useSWR<any[]>(
    session ? '/api/clinics' : null,
    fetcher
  )

  const createClinic = async (clinicData: any) => {
    const response = await fetch('/api/clinics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clinicData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to create clinic')
    }
    
    const newClinic = await response.json()
    await mutate()
    return newClinic
  }

  return {
    clinics: data || [],
    isLoading,
    error,
    createClinic,
    refreshClinics: mutate,
  }
}

/**
 * Custom hook for a single clinic
 */
export function useClinicProfile(id?: string) {
  const { data: session } = useZentheaSession()
  
  // If no ID is provided, we could potentially fetch the first clinic or handled differently.
  // For now, let's assume an ID is needed for specific clinic management.
  const { data, error, isLoading, mutate } = useSWR<any>(
    session && id ? `/api/clinics/${id}` : null,
    fetcher
  )

  const updateClinic = async (updateData: any) => {
    if (!id) throw new Error('Clinic ID is required for update')
    
    const response = await fetch(`/api/clinics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to update clinic')
    }
    
    const updated = await response.json()
    await mutate()
    return updated
  }

  return {
    clinic: data,
    isLoading,
    error,
    updateClinic,
  }
}

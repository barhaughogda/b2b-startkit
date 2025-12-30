import useSWR from 'swr'
import { useZentheaSession } from './useZentheaSession'

/**
 * Core medical record data structure
 */
export interface MedicalRecord {
  id: string
  patientId: string
  providerId: string
  appointmentId?: string
  recordType: string
  title: string
  description?: string
  data?: any
  dateRecorded: string
  status: string
  isConfidential: boolean
  tags?: string[]
  attachments?: any
  notes?: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch medical records');
  }
  return res.json();
})

/**
 * Custom hook for fetching and managing medical records from Postgres
 */
export function useMedicalRecords(patientId?: string) {
  const { data: session } = useZentheaSession()
  
  const { data, error, isLoading, mutate } = useSWR<MedicalRecord[]>(
    session && patientId ? `/api/medical-records?patientId=${patientId}` : null,
    fetcher
  )

  /**
   * Create a new medical record
   */
  const createRecord = async (recordData: Partial<MedicalRecord>) => {
    const response = await fetch('/api/medical-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...recordData, patientId }),
    })
    
    if (!response.ok) {
      throw new Error('Failed to create medical record')
    }
    
    const newRecord = await response.json()
    await mutate()
    return newRecord
  }

  return {
    records: Array.isArray(data) ? data : [],
    isLoading,
    error,
    createRecord,
    refreshRecords: mutate,
  }
}

/**
 * Custom hook for a single medical record
 */
export function useMedicalRecord(id: string) {
  const { data: session } = useZentheaSession()
  
  const { data, error, isLoading, mutate } = useSWR<MedicalRecord & { members: any[] }>(
    session && id ? `/api/medical-records/${id}` : null,
    fetcher
  )

  const updateRecord = async (updateData: Partial<MedicalRecord>) => {
    const response = await fetch(`/api/medical-records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    })
    
    if (!response.ok) {
      throw new Error('Failed to update medical record')
    }
    
    const updated = await response.json()
    await mutate()
    return updated
  }

  const deleteRecord = async () => {
    const response = await fetch(`/api/medical-records/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      throw new Error('Failed to delete medical record')
    }
    
    return await response.json()
  }

  return {
    record: data,
    isLoading,
    error,
    updateRecord,
    deleteRecord,
  }
}

import useSWR from 'swr'
import { useMemo } from 'react'
import { useZentheaSession } from './useZentheaSession'

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch clinics');
  }
  return res.json();
})

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
    clinics: Array.isArray(data) ? data : [],
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
  const { data: session, status } = useZentheaSession()
  const tenantId = session?.user?.tenantId
  
  // Use either the provided ID or the first clinic found for the tenant
  const { clinics, isLoading: isLoadingClinics } = useClinics()
  const effectiveId = id || clinics[0]?.id

  const { data, error, isLoading, mutate } = useSWR<any>(
    session && effectiveId ? `/api/clinics/${effectiveId}` : null,
    fetcher
  )

  // Transform data for compatibility with legacy components
  const transformedData = useMemo(() => {
    if (!data) return null;
    
    return {
      ...data,
      contactInfo: {
        phone: data.phone,
        email: data.email || '',
        website: data.website || '',
        address: data.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        }
      }
    };
  }, [data]);

  const updateClinic = async (updateData: any) => {
    const targetId = effectiveId || id
    if (!targetId) throw new Error('Clinic ID is required for update')
    
    const response = await fetch(`/api/clinics/${targetId}`, {
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

  // Compatibility mapping for legacy ClinicProfileEditor
  const updateContactInfo = async ({ contactInfo }: { contactInfo: any }) => {
    // Map contactInfo back to our clinic structure
    const mappedData = {
      type: contactInfo.type,
      phone: contactInfo.phone,
      email: contactInfo.email,
      website: contactInfo.website,
      address: contactInfo.address,
    }
    return updateClinic(mappedData)
  }

  // Compatibility mapping for branding updates
  const updateBranding = async (brandingData: any) => {
    // For now, map to a field that doesn't exist to avoid error but satisfy interface
    // In a real implementation, we'd add branding to the schema or use organization settings
    return updateClinic({ branding: brandingData })
  }

  // Compatibility mapping for slug updates
  const updateSlug = async ({ slug }: { slug: string }) => {
    return updateClinic({ slug })
  }

  // Compatibility mapping for domain updates
  const updateDomains = async (domainData: any) => {
    return updateClinic({ domains: domainData })
  }

  const updateOrganization = async ({ name }: { name: string }) => {
    const response = await fetch('/api/company/settings/organization', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update organization')
    }

    const result = await response.json()
    
    // Optimistically update the clinic profile data with the new organization name
    // This ensures the sidebar and other UI elements update immediately
    if (data) {
      await mutate({ ...data, name }, { revalidate: true })
    }

    return result
  }

  const canQuery = !!(session && tenantId)

  return {
    clinic: transformedData,
    tenantData: transformedData, // Compatibility alias
    tenantId: tenantId || null,
    isLoading: isLoading || isLoadingClinics,
    error,
    hasError: !!error,
    canQuery,
    updateClinic,
    updateContactInfo, // Compatibility alias
    updateBranding,    // Compatibility alias
    updateSlug,        // Compatibility alias
    updateDomains,     // Compatibility alias
    updateOrganization,
  }
}

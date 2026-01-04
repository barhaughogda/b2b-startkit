'use client';

import useSWR from 'swr'
import { useMemo } from 'react'
import { useZentheaSession } from './useZentheaSession'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

/**
 * Custom hook for fetching and managing clinic data
 */
export function useClinics() {
  const { data: session } = useZentheaSession()
  const tenantId = session?.user?.tenantId
  
  const clinicsData = useQuery(
    (api as any).clinics?.getClinicsByTenant,
    tenantId ? { tenantId } : 'skip'
  )

  const isLoading = clinicsData === undefined
  const error = clinicsData === null ? new Error('Failed to fetch clinics') : null

  // Map Convex data to expected format if needed
  const clinics = useMemo(() => {
    if (!clinicsData) return []
    return clinicsData.map((c: any) => ({
      ...c,
      id: c._id // Map _id to id for compatibility
    }))
  }, [clinicsData])

  return {
    clinics,
    isLoading,
    error,
    createClinic: async () => { throw new Error('Not implemented via Convex hook yet') },
    refreshClinics: () => {},
  }
}

/**
 * Custom hook for a single clinic
 */
export function useClinicProfile(id?: string) {
  const { data: session } = useZentheaSession()
  const tenantId = session?.user?.tenantId
  
  // Use either the provided ID or the first clinic found for the tenant
  const { clinics, isLoading: isLoadingClinics } = useClinics()
  const effectiveId = id || clinics[0]?.id

  const clinicData = useQuery(
    (api as any).clinics?.getClinic,
    effectiveId ? { clinicId: effectiveId as Id<'clinics'> } : 'skip'
  )

  const isLoading = clinicData === undefined
  const error = clinicData === null ? new Error('Clinic not found') : null

  // Transform data for compatibility with legacy components
  const transformedData = useMemo(() => {
    if (!clinicData) return null;
    
    return {
      ...clinicData,
      id: clinicData._id,
      contactInfo: {
        phone: clinicData.phone,
        email: clinicData.email || '',
        website: clinicData.website || '',
        address: clinicData.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        }
      }
    };
  }, [clinicData]);

  const updateClinic = async (updateData: any) => {
    // This would need a mutation
    throw new Error('Update not implemented via Convex hook yet')
  }

  // Compatibility mapping for legacy ClinicProfileEditor
  const updateContactInfo = async ({ contactInfo }: { contactInfo: any }) => {
    return updateClinic(contactInfo)
  }

  // Compatibility mapping for branding updates
  const updateBranding = async (brandingData: any) => {
    return updateClinic({ branding: brandingData })
  }

  // Compatibility mapping for slug updates
  const updateSlug = async ({ slug, tenantId: _tenantId }: { slug: string, tenantId?: string }) => {
    return updateClinic({ slug })
  }

  // Compatibility mapping for domain updates
  const updateDomains = async (domainData: any) => {
    const { tenantId: _tenantId, ...data } = domainData;
    return updateClinic({ domains: data })
  }

  const updateOrganization = async ({ name }: { name: string }) => {
    throw new Error('Update organization not implemented via Convex hook yet')
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

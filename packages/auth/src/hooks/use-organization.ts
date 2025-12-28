'use client'

import { useOrganization as useClerkOrganization, useOrganizationList } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { OrganizationContext } from '../types'

/**
 * Hook for accessing organization context in client components
 *
 * Features:
 * - Restores last selected organization from localStorage
 * - Handles organization deletion gracefully
 * - Persists organization selection across sessions
 *
 * @example
 * function OrgHeader() {
 *   const { organization, isLoaded, role } = useOrganization()
 *   if (!isLoaded) return <Skeleton />
 *   return <div>{organization?.name}</div>
 * }
 */
export function useOrganization() {
  const router = useRouter()
  const { organization, isLoaded, membership } = useClerkOrganization()
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })
  const hasRestoredRef = useRef(false)

  const role = membership?.role as 'owner' | 'admin' | 'member' | undefined

  const orgContext: OrganizationContext | null = organization
    ? {
        organizationId: organization.id, // TODO: Map to internal ID
        clerkOrgId: organization.id,
        name: organization.name,
        slug: organization.slug ?? '',
        role: role ?? 'member',
        plan: 'free', // TODO: Fetch from subscription
      }
    : null

  // Restore last organization from localStorage on mount
  useEffect(() => {
    if (!isLoaded || hasRestoredRef.current) return
    if (organization) {
      // Already have an org selected - update localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lastOrganizationId', organization.id)
        } catch (error) {
          console.warn('Failed to persist organization to localStorage:', error)
        }
      }
      hasRestoredRef.current = true
      return
    }

    // No org selected - try to restore from localStorage
    if (typeof window !== 'undefined' && userMemberships?.data && userMemberships.data.length > 0) {
      try {
        const lastOrgId = localStorage.getItem('lastOrganizationId')
        if (lastOrgId) {
          // Check if the last org still exists in user's memberships
          const lastOrgExists = userMemberships.data.some((m) => m.organization.id === lastOrgId)
          if (lastOrgExists) {
            setActive?.({ organization: lastOrgId })
            hasRestoredRef.current = true
            return
          } else {
            // Last org was deleted - clear from localStorage
            localStorage.removeItem('lastOrganizationId')
          }
        }

        // If no last org or it was deleted, select the first available org
        if (userMemberships.data.length > 0) {
          const firstOrg = userMemberships.data[0].organization.id
          setActive?.({ organization: firstOrg })
          localStorage.setItem('lastOrganizationId', firstOrg)
        }
      } catch (error) {
        console.warn('Failed to restore organization from localStorage:', error)
      }
      hasRestoredRef.current = true
    }
  }, [isLoaded, organization, userMemberships, setActive])

  // Handle organization deletion - redirect if current org was deleted
  useEffect(() => {
    if (!isLoaded || !organization) return

    const orgStillExists = userMemberships?.data?.some(
      (m) => m.organization.id === organization.id
    )

    if (!orgStillExists && userMemberships?.data) {
      // Current org was deleted
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lastOrganizationId')
      }

      // Redirect to org selector or first available org
      if (userMemberships.data.length > 0) {
        const firstOrg = userMemberships.data[0].organization.id
        setActive?.({ organization: firstOrg })
        router.refresh()
      } else {
        // No orgs left - redirect to create org page
        router.push('/create-organization')
      }
    }
  }, [isLoaded, organization, userMemberships, setActive, router])

  const switchOrganization = async (organizationId: string) => {
    await setActive?.({ organization: organizationId })

    // Persist to localStorage for next session
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lastOrganizationId', organizationId)
      } catch (error) {
        // localStorage may be disabled or full
        console.warn('Failed to persist organization to localStorage:', error)
      }
    }
  }

  return {
    organization: orgContext,
    isLoaded,
    role,
    memberships: userMemberships?.data ?? [],
    switchOrganization,
  }
}

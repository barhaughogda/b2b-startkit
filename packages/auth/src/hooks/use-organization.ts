'use client'

import { useOrganization as useClerkOrganization, useOrganizationList } from '@clerk/nextjs'
import type { OrganizationContext } from '../types'

/**
 * Hook for accessing organization context in client components
 *
 * @example
 * function OrgHeader() {
 *   const { organization, isLoaded, role } = useOrganization()
 *   if (!isLoaded) return <Skeleton />
 *   return <div>{organization?.name}</div>
 * }
 */
export function useOrganization() {
  const { organization, isLoaded, membership } = useClerkOrganization()
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })

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

  const switchOrganization = async (organizationId: string) => {
    await setActive?.({ organization: organizationId })
  }

  return {
    organization: orgContext,
    isLoaded,
    role,
    memberships: userMemberships?.data ?? [],
    switchOrganization,
  }
}

'use client'

import React from 'react'
import { useUser, useOrganization, useAuth, useClerk } from '@clerk/nextjs'
import type { PermissionTree, ZentheaSession } from '@/types'

/**
 * Compatibility hook to replace next-auth's useSession
 * Maps Clerk user and organization data to the legacy Zenthea session structure
 */
export function useZentheaSession() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const { organization, membership, isLoaded: isOrgLoaded } = useOrganization()
  const { userId, orgId, orgRole, isLoaded: isAuthLoaded } = useAuth()

  const isLoaded = isUserLoaded && isOrgLoaded && isAuthLoaded

  if (!isLoaded || !userId) {
    return {
      data: null,
      status: isLoaded ? 'unauthenticated' : ('loading' as const),
      update: () => Promise.resolve(null),
    }
  }

  // Map Clerk data to Zenthea legacy session structure
  const session: ZentheaSession = {
    user: {
      id: userId,
      email: user?.primaryEmailAddress?.emailAddress || '',
      name: user?.fullName || '',
      role: (membership?.publicMetadata?.role as string) || (orgRole === 'org:admin' ? 'admin' : 'clinic_user'),
      tenantId: orgId || undefined,
      image: user?.imageUrl,
      isOwner: membership?.publicMetadata?.isOwner === true || orgRole === 'org:admin',
      clinics: (membership?.publicMetadata?.clinics as string[]) || [],
      permissions: (membership?.publicMetadata?.permissions as PermissionTree) || undefined,
      originalRole: (membership?.publicMetadata?.role as string) || undefined,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mock expiration
  }

  return {
    data: session,
    status: 'authenticated' as const,
    update: () => Promise.resolve(session),
  }
}

/**
 * Compatibility wrapper for next-auth's SessionProvider
 * Since Clerk uses its own ClerkProvider at the root, this component is now a no-op
 * that just renders its children to avoid breaking existing component trees.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/**
 * Compatibility wrapper for next-auth's signIn
 * Redirects to the Clerk sign-in page
 */
export async function signIn(provider?: string, options?: any) {
  if (typeof window !== 'undefined') {
    // In a real migration, we might want to map some options to Clerk's redirect params
    window.location.href = '/sign-in'
  }
  return { error: null, ok: true, url: '/sign-in' }
}

/**
 * Compatibility wrapper for next-auth's signOut
 * Calls Clerk's signOut and redirects
 */
export async function signOut(options?: { redirectUrl?: string; callbackUrl?: string }) {
  // Handle both Clerk's redirectUrl and NextAuth's callbackUrl
  const url = options?.redirectUrl || options?.callbackUrl || '/'
  
  if (typeof window !== 'undefined') {
    // We can't call useClerk() here as it's not a hook, but we can redirect
    // To properly use Clerk's signOut, components should use the useClerk() hook directly.
    // This is a fallback.
    window.location.href = `/sign-out?redirectUrl=${encodeURIComponent(url)}`
  }
}

/**
 * Compatibility wrapper for next-auth's getSession
 * Returns the session data if available
 */
export async function getSession() {
  // This is hard to implement client-side without hooks.
  // For now, we'll return null or suggest using useZentheaSession
  console.warn('getSession() called. Please use useZentheaSession() hook instead for Clerk integration.')
  return null
}

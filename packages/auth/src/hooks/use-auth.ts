'use client'

import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs'
import type { AuthContext } from '../types'

/**
 * Hook for accessing auth context in client components
 *
 * @example
 * function UserProfile() {
 *   const { user, isLoaded, isSuperadmin } = useAuth()
 *   if (!isLoaded) return <Skeleton />
 *   return <div>{user.name}</div>
 * }
 */
export function useAuth() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerkAuth()

  const isSuperadmin = (user?.publicMetadata?.role as string) === 'superadmin'
  const isImpersonating = !!(user?.publicMetadata?.impersonatedBy as string)

  const authContext: AuthContext | null =
    user && isSignedIn
      ? {
          userId: user.id, // TODO: Map to internal ID
          clerkUserId: user.id,
          email: user.emailAddresses[0]?.emailAddress ?? '',
          name: user.fullName,
          avatarUrl: user.imageUrl,
          isSuperadmin,
          isImpersonating,
          impersonatorId: (user.publicMetadata?.impersonatedBy as string) || null,
        }
      : null

  return {
    user: authContext,
    isLoaded,
    isSignedIn,
    isSuperadmin,
    isImpersonating,
    signOut,
  }
}

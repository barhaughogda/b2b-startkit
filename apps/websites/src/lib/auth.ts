import { auth, currentUser } from '@clerk/nextjs/server'
import type { PermissionTree, ZentheaSession } from '@/types'

/**
 * Server-side compatibility utility to replace next-auth's getServerSession
 */
export async function getZentheaServerSession(): Promise<ZentheaSession | null> {
  try {
    const authObject = await auth()
    const user = await currentUser()

    if (!authObject.userId) {
      return null
    }

    const { userId, orgId, orgRole, sessionClaims } = authObject

    const session: ZentheaSession = {
      user: {
        id: userId,
        email: user?.emailAddresses[0]?.emailAddress || '',
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        role: (sessionClaims?.role as string) || (orgRole === 'org:admin' ? 'admin' : 'clinic_user'),
        tenantId: orgId || undefined,
        image: user?.imageUrl,
        isOwner: sessionClaims?.isOwner === true || orgRole === 'org:admin',
        clinics: (sessionClaims?.clinics as string[]) || [],
        permissions: (sessionClaims?.permissions as PermissionTree) || undefined,
        originalRole: (sessionClaims?.role as string) || undefined,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }

    return session
  } catch (error) {
    console.error('[auth.ts] Error in getZentheaServerSession:', error);
    throw error;
  }
}

export const getServerSession = getZentheaServerSession;

import { auth, currentUser } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { superadminDb } from '@startkit/database'
import { users } from '@startkit/database/schema'

/**
 * Superadmin context type
 */
export interface SuperadminContext {
  userId: string
  clerkUserId: string
  email: string
  name: string | null
  avatarUrl: string | null
}

/**
 * Require superadmin access
 * 
 * This function checks:
 * 1. User is authenticated via Clerk
 * 2. User exists in our database
 * 3. User has isSuperadmin = true
 * 
 * @throws {Error} If user is not a superadmin
 */
export async function requireSuperadmin(): Promise<SuperadminContext> {
  const { userId: clerkUserId } = await auth()
  
  if (!clerkUserId) {
    throw new Error('Authentication required')
  }
  
  const clerkUser = await currentUser()
  if (!clerkUser) {
    throw new Error('Authentication required')
  }
  
  // Fetch user from database
  const [dbUser] = await superadminDb
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1)
  
  if (!dbUser) {
    throw new Error('User not found in database')
  }
  
  // Check superadmin flag
  if (!dbUser.isSuperadmin) {
    throw new Error('Superadmin access required')
  }
  
  return {
    userId: dbUser.id,
    clerkUserId: dbUser.clerkId,
    email: dbUser.email,
    name: dbUser.name,
    avatarUrl: dbUser.avatarUrl,
  }
}

/**
 * Check if current user is a superadmin (non-throwing)
 */
export async function isSuperadmin(): Promise<boolean> {
  try {
    await requireSuperadmin()
    return true
  } catch {
    return false
  }
}

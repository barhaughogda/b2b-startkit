import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getServerAuth } from '@startkit/auth/server'
import { AppShell } from '@/components/layouts/app-shell'
import { AccountSetupCard } from './account-setup-card'
import { OrgSyncCard } from './org-sync-card'

/**
 * Authenticated app layout
 *
 * This layout wraps all authenticated pages.
 * It provides the sidebar navigation and handles auth checks.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // First check Clerk authentication
  const { userId, orgId: clerkOrgId } = await auth()
  
  // If not authenticated in Clerk, redirect to sign-in
  if (!userId) {
    redirect('/sign-in')
  }

  // Try to get full auth context (includes database sync)
  // Wrap in try-catch to handle database connection errors
  let authContext = null
  let dbError: string | null = null
  
  try {
    authContext = await getServerAuth()
  } catch (error) {
    console.error('Database error in getServerAuth:', error)
    dbError = error instanceof Error ? error.message : 'Database connection error'
  }

  // User is authenticated in Clerk but not synced to database yet
  // OR there was a database error
  if (!authContext) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50">
        <AccountSetupCard errorMessage={dbError} />
      </div>
    )
  }

  // User has an organization selected in Clerk but it's not synced to database
  // Show org sync card to sync the organization
  if (clerkOrgId && !authContext.organization) {
    return (
      <AppShell>
        <OrgSyncCard clerkOrgId={clerkOrgId} />
      </AppShell>
    )
  }

  return <AppShell>{children}</AppShell>
}

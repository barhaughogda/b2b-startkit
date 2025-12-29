import { redirect } from 'next/navigation'
import { requireAuth } from '@startkit/auth/server'
import { superadminDb } from '@startkit/database'
import { organizationMembers } from '@startkit/database/schema'
import { eq, and } from 'drizzle-orm'
import { AdminShell } from '@/components/layouts/admin-shell'

/**
 * App Admin Layout
 * 
 * This layout wraps all /admin/* routes and ensures:
 * 1. User is authenticated
 * 2. User is either a platform superadmin OR app admin for this product
 * 
 * @ai-context App admins have product-level admin access.
 * Platform superadmins automatically have app admin access.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, organization } = await requireAuth()

  // Platform superadmins always have access
  if (user.isSuperadmin) {
    return <AdminShell admin={user}>{children}</AdminShell>
  }

  // Check if user is an app admin for this organization
  if (organization) {
    const [membership] = await superadminDb
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.organizationId, organization.organizationId)
        )
      )
      .limit(1)

    if (membership?.isAppAdmin) {
      return <AdminShell admin={user}>{children}</AdminShell>
    }
  }

  // User is not authorized - redirect to dashboard
  redirect('/dashboard')
}

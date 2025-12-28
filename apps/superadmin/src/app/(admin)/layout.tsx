import { redirect } from 'next/navigation'
import { requireSuperadmin } from '@/lib/auth'
import { AdminShell } from '@/components/layouts/admin-shell'

/**
 * Admin Layout
 * 
 * This layout wraps all authenticated admin pages.
 * It enforces superadmin access and provides the admin shell.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    const admin = await requireSuperadmin()
    return <AdminShell admin={admin}>{children}</AdminShell>
  } catch {
    // Not a superadmin - redirect to sign-in
    redirect('/sign-in')
  }
}

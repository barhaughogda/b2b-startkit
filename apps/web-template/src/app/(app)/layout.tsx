import { redirect } from 'next/navigation'
import { requireAuth } from '@startkit/auth/server'
import { AppShell } from '@/components/layouts/app-shell'

/**
 * Authenticated app layout
 *
 * This layout wraps all authenticated pages.
 * It provides the sidebar navigation and handles auth checks.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Require authentication for all app routes
  try {
    await requireAuth()
  } catch {
    redirect('/sign-in')
  }

  return <AppShell>{children}</AppShell>
}

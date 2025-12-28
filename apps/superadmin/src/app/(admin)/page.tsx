import { redirect } from 'next/navigation'

/**
 * Root admin page - redirects to dashboard
 */
export default function AdminRootPage() {
  redirect('/dashboard')
}

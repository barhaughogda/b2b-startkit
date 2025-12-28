import { redirect } from 'next/navigation'

/**
 * Root page - redirects to dashboard or sign-in
 */
export default function RootPage() {
  redirect('/dashboard')
}

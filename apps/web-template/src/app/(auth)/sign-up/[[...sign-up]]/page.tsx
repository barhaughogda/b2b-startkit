import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { SignUp } from '@startkit/auth'

export default async function SignUpPage() {
  // Redirect authenticated users to dashboard
  // Only check Clerk auth here - database sync check happens in app layout
  const { userId } = await auth()
  if (userId) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-lg',
          },
        }}
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  )
}

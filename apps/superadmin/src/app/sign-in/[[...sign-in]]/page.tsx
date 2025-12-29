import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs/server'
import { SignIn } from '@clerk/nextjs'
import { superadminDb } from '@startkit/database'
import { users } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'
import { Button } from '@startkit/ui'
import Link from 'next/link'

/**
 * Superadmin Sign-In Page
 * 
 * Uses the same Clerk instance but styled for admin context
 * If user is already signed in, check if they're a superadmin and redirect accordingly
 */
export default async function SignInPage() {
  // Check if user is already authenticated
  const { userId } = await auth()
  
  if (userId) {
    // User is signed in - check if they're a superadmin
    const [dbUser] = await superadminDb
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)

    if (dbUser?.isSuperadmin) {
      // User is a superadmin - redirect to dashboard
      redirect('/dashboard')
    } else {
      // User is signed in but not a superadmin - show message
      return (
        <div className="min-h-screen bg-background bg-grid flex items-center justify-center">
          <div className="w-full max-w-md space-y-8 text-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-primary">Start</span>Kit Admin
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Platform Administration Dashboard
              </p>
            </div>
            
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-sm text-muted-foreground">
                You are signed in, but your account does not have superadmin access.
              </p>
              <p className="text-sm text-muted-foreground">
                Contact a platform administrator to grant superadmin access to your account.
              </p>
              <div className="flex gap-2 justify-center pt-4">
                <Link href="/api/auth/sign-out">
                  <Button variant="outline">Sign Out</Button>
                </Link>
                <Link href="http://localhost:4500">
                  <Button>Go to App</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
    }
  }

  // User is not signed in - show sign-in form
  return (
    <div className="min-h-screen bg-background bg-grid flex items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-primary">Start</span>Kit Admin
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Platform Administration Dashboard
          </p>
        </div>
        
        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-card border border-border shadow-xl',
              headerTitle: 'text-foreground',
              headerSubtitle: 'text-muted-foreground',
              socialButtonsBlockButton: 'bg-secondary hover:bg-secondary/80',
              formFieldInput: 'bg-input border-border',
              footerActionLink: 'text-primary hover:text-primary/80',
            },
          }}
          fallbackRedirectUrl="/dashboard"
        />
        
        <p className="text-center text-xs text-muted-foreground">
          Only superadmin accounts can access this dashboard.
        </p>
      </div>
    </div>
  )
}

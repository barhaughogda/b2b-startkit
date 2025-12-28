import { SignIn } from '@clerk/nextjs'

/**
 * Superadmin Sign-In Page
 * 
 * Uses the same Clerk instance but styled for admin context
 */
export default function SignInPage() {
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
          forceRedirectUrl="/dashboard"
        />
        
        <p className="text-center text-xs text-muted-foreground">
          Only superadmin accounts can access this dashboard.
        </p>
      </div>
    </div>
  )
}

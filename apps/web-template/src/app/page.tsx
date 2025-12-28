import Link from 'next/link'
import { SignedIn, SignedOut } from '@startkit/auth'
import { Button } from '@startkit/ui'

/**
 * Landing page - shown to unauthenticated users
 *
 * @ai-context This is the marketing homepage.
 * Customize this for each product.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="container mx-auto flex items-center justify-between p-6">
        <div className="text-xl font-bold">StartKit</div>
        <div className="flex items-center gap-4">
          <SignedOut>
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button>Dashboard</Button>
            </Link>
          </SignedIn>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-24 text-center">
        <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
          Build Your SaaS
          <span className="text-primary"> Faster</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
          StartKit gives you everything you need to launch a production-ready B2B SaaS product.
          Authentication, billing, teams, and more - all set up and ready to go.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg">Start Free Trial</Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline">
              View Pricing
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid gap-8 md:grid-cols-3">
          <FeatureCard
            title="Authentication"
            description="Clerk-powered auth with organizations, SSO, and magic links out of the box."
          />
          <FeatureCard
            title="Billing"
            description="Stripe subscriptions with per-seat and usage-based pricing support."
          />
          <FeatureCard
            title="Multi-tenancy"
            description="Built-in organization management with role-based access control."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto border-t px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} StartKit. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 text-left">
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { Button } from '@startkit/ui'
import { ArrowRight, Sparkles } from 'lucide-react'

/**
 * Hero section for landing page
 * Features animated gradient background and prominent CTAs
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient orbs */}
        <div className="absolute left-1/4 top-0 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent blur-3xl animate-pulse-subtle" />
        <div className="absolute right-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-violet-500/15 via-purple-500/5 to-transparent blur-3xl animate-pulse-subtle animation-delay-300" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      <div className="container mx-auto px-6 pt-20 pb-32 lg:pt-32 lg:pb-40">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm font-medium mb-8 animate-fade-in-down">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Now with AI-powered workflows</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl animate-fade-in-up">
            Build Your B2B SaaS
            <span className="block mt-2 text-gradient-accent">10x Faster</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-8 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            StartKit gives you everything you need to launch a production-ready B2B product.{' '}
            <span className="text-foreground font-medium">Authentication, billing, teams, RBAC</span> — 
            all configured and ready to go.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
            <Link href="/sign-up">
              <Button size="lg" className="h-12 px-8 text-base group">
                Start Building Free
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="#pricing">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                View Pricing
              </Button>
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-16 flex flex-col items-center gap-4 animate-fade-in-up animation-delay-500">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full border-2 border-background bg-gradient-to-br from-muted to-muted-foreground/30"
                  style={{ zIndex: 5 - i }}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Trusted by <span className="font-semibold text-foreground">500+</span> founders and teams
            </p>
          </div>
        </div>

        {/* Dashboard preview mockup */}
        <div className="mt-20 relative animate-fade-in-up animation-delay-600">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
          <div className="relative mx-auto max-w-5xl">
            <div className="rounded-xl border border-border/50 bg-card shadow-2xl shadow-black/5 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-border/50 bg-muted/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 rounded-md bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 0a10 10 0 100 20 10 10 0 000-20zM5 10a5 5 0 0110 0H5z" clipRule="evenodd" />
                    </svg>
                    app.startkit.io/dashboard
                  </div>
                </div>
              </div>
              
              {/* Dashboard mockup content */}
              <div className="p-8 bg-gradient-to-b from-background to-muted/30">
                <div className="grid gap-4 md:grid-cols-4 mb-6">
                  {[
                    { label: 'Total Revenue', value: '$45,231' },
                    { label: 'Active Users', value: '2,350' },
                    { label: 'Subscriptions', value: '573' },
                    { label: 'Growth', value: '+23%' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-border/50 bg-card p-4">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="h-40 rounded-lg border border-border/50 bg-card/50" />
                  <div className="h-40 rounded-lg border border-border/50 bg-card/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

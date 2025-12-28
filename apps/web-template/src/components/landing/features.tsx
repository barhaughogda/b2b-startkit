'use client'

import {
  Shield,
  CreditCard,
  Users,
  Lock,
  Zap,
  BarChart3,
  Palette,
  Globe,
} from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Authentication',
    description:
      'Clerk-powered auth with organizations, SSO, MFA, and magic links. Ready out of the box.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    icon: CreditCard,
    title: 'Billing & Subscriptions',
    description:
      'Stripe integration with per-seat pricing, usage-based billing, and customer portal.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Users,
    title: 'Multi-Tenancy',
    description:
      'Built-in organization management with role-based access control and team invitations.',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    icon: Lock,
    title: 'Row-Level Security',
    description:
      'Automatic data isolation with Supabase RLS. Tenants can never see each other\'s data.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    icon: Zap,
    title: 'Feature Flags',
    description:
      'Plan-based feature gating and per-organization overrides. Ship confidently.',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description:
      'PostHog integration for product analytics, user tracking, and feature adoption metrics.',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: Palette,
    title: 'Beautiful UI',
    description:
      'shadcn/ui components with a cohesive design system. Dark mode included.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: Globe,
    title: 'Production Ready',
    description:
      'TypeScript, Turborepo, and best practices built-in. Deploy to Vercel in minutes.',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
]

/**
 * Features section showcasing key capabilities
 */
export function Features() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-4">
            Everything You Need
          </p>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6">
            Build faster with batteries included
          </h2>
          <p className="text-xl text-muted-foreground">
            Stop rebuilding the same infrastructure. Start with a foundation that scales.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-lg hover:shadow-black/5"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className={`inline-flex rounded-xl ${feature.bgColor} p-3 mb-4`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              
              {/* Content */}
              <h3 className="text-lg font-semibold mb-2 group-hover:text-amber-500 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Code showcase */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-lg">
            {/* Code header */}
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                apps/my-product/src/app/api/projects/route.ts
              </span>
            </div>
            
            {/* Code content */}
            <div className="p-6 font-mono text-sm overflow-x-auto">
              <pre className="text-muted-foreground">
                <code>
                  <span className="text-violet-400">import</span> {'{'} requireOrganization {'}'} <span className="text-violet-400">from</span> <span className="text-amber-400">&apos;@startkit/auth/server&apos;</span>
                  {'\n'}
                  <span className="text-violet-400">import</span> {'{'} can {'}'} <span className="text-violet-400">from</span> <span className="text-amber-400">&apos;@startkit/rbac&apos;</span>
                  {'\n'}
                  <span className="text-violet-400">import</span> {'{'} withTenant {'}'} <span className="text-violet-400">from</span> <span className="text-amber-400">&apos;@startkit/database&apos;</span>
                  {'\n\n'}
                  <span className="text-violet-400">export async function</span> <span className="text-blue-400">POST</span>(req: Request) {'{'}
                  {'\n'}  <span className="text-slate-500">// Auth + org context in one line</span>
                  {'\n'}  <span className="text-violet-400">const</span> {'{'} user, organization {'}'} = <span className="text-violet-400">await</span> <span className="text-blue-400">requireOrganization</span>()
                  {'\n\n'}
                  <span className="text-slate-500">  // Permission check</span>
                  {'\n'}  <span className="text-violet-400">if</span> (!<span className="text-blue-400">can</span>(user, <span className="text-amber-400">&apos;create&apos;</span>, <span className="text-amber-400">&apos;project&apos;</span>)) {'{'}
                  {'\n'}    <span className="text-violet-400">return</span> Response.<span className="text-blue-400">json</span>({'{'} error: <span className="text-amber-400">&apos;Forbidden&apos;</span> {'}'}, {'{'} status: <span className="text-cyan-400">403</span> {'}'})
                  {'\n'}  {'}'}
                  {'\n\n'}
                  <span className="text-slate-500">  // Auto-scoped to organization</span>
                  {'\n'}  <span className="text-violet-400">const</span> project = <span className="text-violet-400">await</span> <span className="text-blue-400">withTenant</span>(organization.id)
                  {'\n'}    .insert(projects)
                  {'\n'}    .values(data)
                  {'\n'}    .returning()
                  {'\n\n'}
                  <span className="text-violet-400">  return</span> Response.<span className="text-blue-400">json</span>(project)
                  {'\n'}
                  {'}'}
                </code>
              </pre>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Clean, type-safe APIs with built-in security. No boilerplate.
          </p>
        </div>
      </div>
    </section>
  )
}

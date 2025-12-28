'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, cn } from '@startkit/ui'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Up to 3 team members',
      '1,000 API calls/month',
      '1 GB storage',
      'Basic features',
      'Community support',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Starter',
    description: 'For small teams',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      'Up to 10 team members',
      '10,000 API calls/month',
      '10 GB storage',
      'All basic features',
      'Email support',
      'Advanced analytics',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    description: 'For growing businesses',
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: [
      'Up to 50 team members',
      '100,000 API calls/month',
      '100 GB storage',
      'All starter features',
      'Priority support',
      'Advanced integrations',
      'Custom branding',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'For large organizations',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    features: [
      'Unlimited team members',
      'Unlimited API calls',
      'Unlimited storage',
      'All pro features',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'On-premise deployment',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

/**
 * Pricing section with plan comparison
 */
export function Pricing() {
  const [isYearly, setIsYearly] = useState(true)

  return (
    <section id="pricing" className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-4">
            Simple Pricing
          </p>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6">
            Choose the plan that fits
          </h2>
          <p className="text-xl text-muted-foreground">
            Start free, upgrade when you need more. All plans include a 14-day trial.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={cn('text-sm font-medium', !isYearly && 'text-foreground')}>
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={cn(
              'relative h-7 w-12 rounded-full transition-colors',
              isYearly ? 'bg-primary' : 'bg-muted'
            )}
          >
            <div
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-white transition-transform',
                isYearly ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
          <span className={cn('text-sm font-medium', isYearly && 'text-foreground')}>
            Yearly
            <span className="ml-1.5 text-xs text-amber-500 font-semibold">Save 17%</span>
          </span>
        </div>

        {/* Pricing cards */}
        <div className="grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative rounded-2xl border p-6 transition-all',
                plan.highlighted
                  ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-transparent shadow-lg shadow-amber-500/10 scale-105 lg:-my-4'
                  : 'border-border/50 bg-card hover:border-border'
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-black">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    ${isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                {isYearly && plan.yearlyPrice > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Billed ${plan.yearlyPrice}/year
                  </p>
                )}
              </div>

              {/* CTA */}
              <Link href={plan.name === 'Enterprise' ? '/contact' : '/sign-up'}>
                <Button
                  className={cn(
                    'w-full',
                    plan.highlighted && 'bg-amber-500 hover:bg-amber-600 text-black'
                  )}
                  variant={plan.highlighted ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </Link>

              {/* Features */}
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className={cn(
                      'h-4 w-4 mt-0.5 shrink-0',
                      plan.highlighted ? 'text-amber-500' : 'text-muted-foreground'
                    )} />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Need a custom solution?{' '}
            <Link href="/contact" className="text-foreground font-medium hover:text-amber-500 underline underline-offset-4">
              Contact our sales team
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}

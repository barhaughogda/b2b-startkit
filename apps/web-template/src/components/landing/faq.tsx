'use client'

import { useState } from 'react'
import { cn } from '@startkit/ui'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'What do I get with StartKit?',
    answer:
      "StartKit is a complete B2B SaaS foundation including authentication (Clerk), billing (Stripe), multi-tenancy, RBAC permissions, feature flags, and a beautiful UI component library. You get a production-ready mono-repo that you can customize for your product.",
  },
  {
    question: 'Is it really production-ready?',
    answer:
      "Yes! StartKit includes row-level security (RLS) policies, proper error handling, audit logging, and follows security best practices. It's built with TypeScript for type safety and includes comprehensive testing patterns.",
  },
  {
    question: 'Can I use this for multiple products?',
    answer:
      "Absolutely. StartKit is designed as a SaaS factory. The mono-repo architecture lets you create multiple products that share the same infrastructure. Just run `pnpm create-product` to scaffold a new app.",
  },
  {
    question: 'What tech stack does it use?',
    answer:
      'Next.js 14+ with App Router, TypeScript, Tailwind CSS, Drizzle ORM with Supabase/PostgreSQL, Clerk for auth, Stripe for billing, and shadcn/ui for components. All managed with Turborepo.',
  },
  {
    question: 'Do I need to pay for external services?',
    answer:
      "You'll need accounts with Clerk (free tier available), Stripe (only pay when you make money), and Supabase (generous free tier). StartKit itself is a one-time purchase with no ongoing fees.",
  },
  {
    question: 'How do I get support?',
    answer:
      'We have an active Discord community for questions and discussions. Pro and Enterprise customers get priority support via email and dedicated channels.',
  },
]

/**
 * FAQ section with accordion
 */
export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-4">
            FAQ
          </p>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6">
            Frequently asked questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about StartKit.
          </p>
        </div>

        {/* FAQ accordion */}
        <div className="max-w-3xl mx-auto divide-y divide-border">
          {faqs.map((faq, index) => (
            <div key={faq.question} className="py-6">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-lg font-medium pr-8">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
                    openIndex === index && 'rotate-180'
                  )}
                />
              </button>
              <div
                className={cn(
                  'grid transition-all duration-200',
                  openIndex === index ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'
                )}
              >
                <div className="overflow-hidden">
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Still have questions?{' '}
            <a
              href="mailto:support@startkit.io"
              className="text-foreground font-medium hover:text-amber-500 underline underline-offset-4"
            >
              Get in touch
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

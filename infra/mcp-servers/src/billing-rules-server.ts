#!/usr/bin/env node
/**
 * MCP Server: Billing Rules Server
 *
 * Provides tools for AI assistants to understand billing plans, subscription states,
 * and validate billing-related changes in B2B StartKit.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// ============================================
// Plan Configuration
// ============================================

type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise'
type BillingInterval = 'monthly' | 'yearly'

interface PlanFeature {
  name: string
  included: boolean
  limit?: number
}

interface PlanLimits {
  seats?: number
  apiCallsPerMonth?: number
  storageGb?: number
  tokensPerMonth?: number
}

interface PlanInfo {
  tier: PlanTier
  name: string
  description: string
  monthlyPrice: number // in cents
  yearlyPrice: number // in cents
  features: PlanFeature[]
  limits: PlanLimits
  recommended?: boolean
}

const PLANS: Record<PlanTier, PlanInfo> = {
  free: {
    tier: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      { name: 'Up to 3 team members', included: true, limit: 3 },
      { name: 'Basic features', included: true },
      { name: 'Community support', included: true },
      { name: 'API access', included: true, limit: 1000 },
      { name: 'Priority support', included: false },
      { name: 'Advanced analytics', included: false },
      { name: 'Custom integrations', included: false },
    ],
    limits: {
      seats: 3,
      apiCallsPerMonth: 1000,
      storageGb: 1,
    },
  },
  starter: {
    tier: 'starter',
    name: 'Starter',
    description: 'For small teams',
    monthlyPrice: 2900, // $29
    yearlyPrice: 29000, // $290 (~$24.17/month)
    features: [
      { name: 'Up to 10 team members', included: true, limit: 10 },
      { name: 'All basic features', included: true },
      { name: 'Email support', included: true },
      { name: 'API access', included: true, limit: 10000 },
      { name: 'Advanced analytics', included: true },
      { name: 'Priority support', included: false },
      { name: 'Custom integrations', included: false },
    ],
    limits: {
      seats: 10,
      apiCallsPerMonth: 10000,
      storageGb: 10,
    },
    recommended: true,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    monthlyPrice: 9900, // $99
    yearlyPrice: 99000, // $990 (~$82.50/month)
    features: [
      { name: 'Up to 50 team members', included: true, limit: 50 },
      { name: 'All starter features', included: true },
      { name: 'Priority support', included: true },
      { name: 'API access', included: true, limit: 100000 },
      { name: 'Advanced integrations', included: true },
      { name: 'Custom branding', included: true },
      { name: 'SLA guarantee', included: false },
    ],
    limits: {
      seats: 50,
      apiCallsPerMonth: 100000,
      storageGb: 100,
    },
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    monthlyPrice: 29900, // $299
    yearlyPrice: 299000, // $2,990 (~$249.17/month)
    features: [
      { name: 'Unlimited team members', included: true },
      { name: 'All pro features', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Unlimited API access', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'SLA guarantee', included: true },
      { name: 'On-premise deployment', included: true },
    ],
    limits: {
      seats: undefined, // Unlimited
      apiCallsPerMonth: undefined, // Unlimited
      storageGb: undefined, // Unlimited
    },
  },
}

// ============================================
// Subscription State Machine
// ============================================

type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'

interface StateTransition {
  from: SubscriptionStatus
  to: SubscriptionStatus
  trigger: string
  description: string
  autoTransition: boolean
  gracePeriodDays?: number
}

const STATE_TRANSITIONS: StateTransition[] = [
  // Trialing transitions
  {
    from: 'trialing',
    to: 'active',
    trigger: 'trial_ended_payment_succeeded',
    description: 'Trial ends and payment method is valid',
    autoTransition: true,
  },
  {
    from: 'trialing',
    to: 'incomplete',
    trigger: 'trial_ended_payment_failed',
    description: 'Trial ends but payment fails',
    autoTransition: true,
  },
  {
    from: 'trialing',
    to: 'canceled',
    trigger: 'customer_cancels',
    description: 'Customer cancels during trial',
    autoTransition: false,
  },

  // Active transitions
  {
    from: 'active',
    to: 'past_due',
    trigger: 'payment_failed',
    description: 'Recurring payment fails',
    autoTransition: true,
    gracePeriodDays: 7,
  },
  {
    from: 'active',
    to: 'canceled',
    trigger: 'customer_cancels_immediately',
    description: 'Customer cancels immediately (no grace)',
    autoTransition: false,
  },
  {
    from: 'active',
    to: 'canceled',
    trigger: 'period_end_cancellation',
    description: 'Customer set to cancel at period end',
    autoTransition: true,
  },
  {
    from: 'active',
    to: 'paused',
    trigger: 'customer_pauses',
    description: 'Customer pauses subscription (if enabled)',
    autoTransition: false,
  },

  // Past due transitions
  {
    from: 'past_due',
    to: 'active',
    trigger: 'payment_succeeded',
    description: 'Payment retry succeeds',
    autoTransition: true,
  },
  {
    from: 'past_due',
    to: 'unpaid',
    trigger: 'all_retries_failed',
    description: 'All payment retries exhausted',
    autoTransition: true,
    gracePeriodDays: 14,
  },
  {
    from: 'past_due',
    to: 'canceled',
    trigger: 'customer_cancels',
    description: 'Customer cancels while past due',
    autoTransition: false,
  },

  // Unpaid transitions
  {
    from: 'unpaid',
    to: 'active',
    trigger: 'payment_succeeded',
    description: 'Customer updates payment and pays',
    autoTransition: false,
  },
  {
    from: 'unpaid',
    to: 'canceled',
    trigger: 'grace_period_expired',
    description: 'Grace period expires with no payment',
    autoTransition: true,
  },

  // Incomplete transitions
  {
    from: 'incomplete',
    to: 'active',
    trigger: 'payment_succeeded',
    description: 'Customer completes payment',
    autoTransition: false,
  },
  {
    from: 'incomplete',
    to: 'incomplete_expired',
    trigger: 'payment_window_expired',
    description: '24-hour payment window expires',
    autoTransition: true,
  },

  // Paused transitions
  {
    from: 'paused',
    to: 'active',
    trigger: 'customer_resumes',
    description: 'Customer resumes subscription',
    autoTransition: false,
  },
  {
    from: 'paused',
    to: 'canceled',
    trigger: 'max_pause_exceeded',
    description: 'Maximum pause duration exceeded',
    autoTransition: true,
  },

  // Canceled (terminal state - no transitions out except re-subscribe)
]

// ============================================
// Billing Validation Rules
// ============================================

interface ValidationRule {
  name: string
  check: (context: ValidationContext) => ValidationResult
}

interface ValidationContext {
  currentPlan: PlanTier
  targetPlan?: PlanTier
  currentStatus: SubscriptionStatus
  currentSeats: number
  requestedSeats?: number
  currentUsage?: Record<string, number>
}

interface ValidationResult {
  valid: boolean
  message: string
  severity: 'error' | 'warning' | 'info'
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    name: 'upgrade_allowed',
    check: (ctx) => {
      if (!ctx.targetPlan) return { valid: true, message: '', severity: 'info' }
      const planOrder: PlanTier[] = ['free', 'starter', 'pro', 'enterprise']
      const currentIndex = planOrder.indexOf(ctx.currentPlan)
      const targetIndex = planOrder.indexOf(ctx.targetPlan)
      if (targetIndex > currentIndex) {
        return { valid: true, message: 'Upgrade allowed - will prorate', severity: 'info' }
      }
      return { valid: true, message: '', severity: 'info' }
    },
  },
  {
    name: 'downgrade_seat_check',
    check: (ctx) => {
      if (!ctx.targetPlan) return { valid: true, message: '', severity: 'info' }
      const targetPlan = PLANS[ctx.targetPlan]
      if (targetPlan.limits.seats && ctx.currentSeats > targetPlan.limits.seats) {
        return {
          valid: false,
          message: `Cannot downgrade: current seats (${ctx.currentSeats}) exceeds target plan limit (${targetPlan.limits.seats})`,
          severity: 'error',
        }
      }
      return { valid: true, message: '', severity: 'info' }
    },
  },
  {
    name: 'downgrade_usage_check',
    check: (ctx) => {
      if (!ctx.targetPlan || !ctx.currentUsage) {
        return { valid: true, message: '', severity: 'info' }
      }
      const targetPlan = PLANS[ctx.targetPlan]
      const warnings: string[] = []

      if (targetPlan.limits.apiCallsPerMonth && ctx.currentUsage.apiCalls) {
        if (ctx.currentUsage.apiCalls > targetPlan.limits.apiCallsPerMonth) {
          warnings.push(`API usage (${ctx.currentUsage.apiCalls}) exceeds new limit (${targetPlan.limits.apiCallsPerMonth})`)
        }
      }

      if (targetPlan.limits.storageGb && ctx.currentUsage.storageGb) {
        if (ctx.currentUsage.storageGb > targetPlan.limits.storageGb) {
          warnings.push(`Storage (${ctx.currentUsage.storageGb}GB) exceeds new limit (${targetPlan.limits.storageGb}GB)`)
        }
      }

      if (warnings.length) {
        return {
          valid: true, // Allow but warn
          message: `Downgrade warning: ${warnings.join('; ')}. Usage will be limited.`,
          severity: 'warning',
        }
      }
      return { valid: true, message: '', severity: 'info' }
    },
  },
  {
    name: 'status_allows_change',
    check: (ctx) => {
      const blockedStatuses: SubscriptionStatus[] = ['canceled', 'incomplete_expired', 'unpaid']
      if (blockedStatuses.includes(ctx.currentStatus)) {
        return {
          valid: false,
          message: `Cannot modify subscription in "${ctx.currentStatus}" status. Customer must resubscribe.`,
          severity: 'error',
        }
      }
      return { valid: true, message: '', severity: 'info' }
    },
  },
  {
    name: 'seat_within_limits',
    check: (ctx) => {
      if (ctx.requestedSeats === undefined) return { valid: true, message: '', severity: 'info' }
      const plan = PLANS[ctx.currentPlan]
      if (plan.limits.seats && ctx.requestedSeats > plan.limits.seats) {
        return {
          valid: false,
          message: `Requested seats (${ctx.requestedSeats}) exceeds plan limit (${plan.limits.seats}). Upgrade required.`,
          severity: 'error',
        }
      }
      return { valid: true, message: '', severity: 'info' }
    },
  },
]

// ============================================
// MCP Server Implementation
// ============================================

const server = new Server(
  {
    name: 'startkit-billing-rules',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_plans',
        description: 'List all available pricing plans with their features and limits.',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: 'Output format',
              enum: ['summary', 'detailed', 'comparison'],
            },
          },
          required: [],
        },
      },
      {
        name: 'explain_plan',
        description: 'Get detailed information about a specific pricing plan.',
        inputSchema: {
          type: 'object',
          properties: {
            plan: {
              type: 'string',
              description: 'Plan tier to explain',
              enum: ['free', 'starter', 'pro', 'enterprise'],
            },
          },
          required: ['plan'],
        },
      },
      {
        name: 'get_billing_states',
        description: 'Show the subscription state machine - all possible states and transitions.',
        inputSchema: {
          type: 'object',
          properties: {
            currentState: {
              type: 'string',
              description: 'Filter to show transitions from a specific state',
              enum: ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'],
            },
          },
          required: [],
        },
      },
      {
        name: 'validate_billing_change',
        description: 'Check if a billing change is valid (plan change, seat change, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            currentPlan: {
              type: 'string',
              description: 'Current plan tier',
              enum: ['free', 'starter', 'pro', 'enterprise'],
            },
            targetPlan: {
              type: 'string',
              description: 'Target plan tier (for plan change)',
              enum: ['free', 'starter', 'pro', 'enterprise'],
            },
            currentStatus: {
              type: 'string',
              description: 'Current subscription status',
              enum: ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'],
            },
            currentSeats: {
              type: 'number',
              description: 'Current number of seats',
            },
            requestedSeats: {
              type: 'number',
              description: 'Requested number of seats (for seat change)',
            },
          },
          required: ['currentPlan', 'currentStatus', 'currentSeats'],
        },
      },
      {
        name: 'get_billing_code_patterns',
        description: 'Get code patterns for common billing operations.',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              description: 'Billing operation',
              enum: ['checkout', 'portal', 'cancel', 'resume', 'upgrade', 'downgrade', 'usage_tracking', 'webhook_handling'],
            },
          },
          required: ['operation'],
        },
      },
      {
        name: 'explain_proration',
        description: 'Explain how proration works for plan changes.',
        inputSchema: {
          type: 'object',
          properties: {
            fromPlan: {
              type: 'string',
              description: 'Current plan',
              enum: ['free', 'starter', 'pro', 'enterprise'],
            },
            toPlan: {
              type: 'string',
              description: 'Target plan',
              enum: ['free', 'starter', 'pro', 'enterprise'],
            },
            daysRemaining: {
              type: 'number',
              description: 'Days remaining in current billing period',
            },
          },
          required: ['fromPlan', 'toPlan'],
        },
      },
    ],
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'list_plans': {
      const format = (args as { format?: string }).format || 'summary'

      if (format === 'comparison') {
        const headers = '| Feature | Free | Starter | Pro | Enterprise |'
        const separator = '|---------|------|---------|-----|------------|'

        const features = [
          'Team members',
          'API calls/month',
          'Storage',
          'Support',
          'Analytics',
          'Custom branding',
          'SLA',
        ]

        const rows = features.map(f => {
          const getFeatureValue = (plan: PlanInfo): string => {
            if (f === 'Team members') return plan.limits.seats?.toString() ?? 'Unlimited'
            if (f === 'API calls/month') return plan.limits.apiCallsPerMonth?.toLocaleString() ?? 'Unlimited'
            if (f === 'Storage') return plan.limits.storageGb ? `${plan.limits.storageGb}GB` : 'Unlimited'
            const feature = plan.features.find(pf => pf.name.toLowerCase().includes(f.toLowerCase()))
            return feature?.included ? '✅' : '❌'
          }
          return `| ${f} | ${getFeatureValue(PLANS.free)} | ${getFeatureValue(PLANS.starter)} | ${getFeatureValue(PLANS.pro)} | ${getFeatureValue(PLANS.enterprise)} |`
        })

        const prices = `| **Monthly price** | $0 | $29 | $99 | $299 |`
        const yearlyPrices = `| **Yearly price** | $0 | $290 | $990 | $2,990 |`

        return {
          content: [
            {
              type: 'text',
              text: `# Plan Comparison\n\n${headers}\n${separator}\n${rows.join('\n')}\n${separator}\n${prices}\n${yearlyPrices}`,
            },
          ],
        }
      }

      if (format === 'detailed') {
        const planDetails = Object.values(PLANS).map(plan => {
          const features = plan.features.map(f =>
            `  - ${f.included ? '✅' : '❌'} ${f.name}${f.limit ? ` (${f.limit})` : ''}`
          ).join('\n')

          return `## ${plan.name} ${plan.recommended ? '⭐ Recommended' : ''}
**${plan.description}**
- Monthly: $${(plan.monthlyPrice / 100).toFixed(0)}/mo
- Yearly: $${(plan.yearlyPrice / 100).toFixed(0)}/yr (save ${Math.round((1 - (plan.yearlyPrice / 12) / plan.monthlyPrice) * 100) || 0}%)

**Limits:**
- Seats: ${plan.limits.seats ?? 'Unlimited'}
- API calls: ${plan.limits.apiCallsPerMonth?.toLocaleString() ?? 'Unlimited'}/month
- Storage: ${plan.limits.storageGb ?? 'Unlimited'}GB

**Features:**
${features}`
        }).join('\n\n---\n\n')

        return {
          content: [
            {
              type: 'text',
              text: `# Pricing Plans\n\n${planDetails}`,
            },
          ],
        }
      }

      // Summary format
      const summary = Object.values(PLANS).map(plan =>
        `- **${plan.name}**: $${(plan.monthlyPrice / 100).toFixed(0)}/mo - ${plan.description}`
      ).join('\n')

      return {
        content: [
          {
            type: 'text',
            text: `# Pricing Plans\n\n${summary}\n\nUse format "detailed" or "comparison" for more information.`,
          },
        ],
      }
    }

    case 'explain_plan': {
      const planTier = (args as { plan: PlanTier }).plan
      const plan = PLANS[planTier]

      const features = plan.features.map(f =>
        `- ${f.included ? '✅' : '❌'} ${f.name}${f.limit ? ` (limit: ${f.limit})` : ''}`
      ).join('\n')

      // Show upgrade/downgrade paths
      const planOrder: PlanTier[] = ['free', 'starter', 'pro', 'enterprise']
      const currentIndex = planOrder.indexOf(planTier)
      const upgradeTo = planOrder[currentIndex + 1]
      const downgradeFrom = planOrder[currentIndex - 1]

      return {
        content: [
          {
            type: 'text',
            text: `# ${plan.name} Plan ${plan.recommended ? '⭐ Recommended' : ''}

**Description:** ${plan.description}
**Tier:** ${plan.tier}

## Pricing
- Monthly: **$${(plan.monthlyPrice / 100).toFixed(2)}**/month
- Yearly: **$${(plan.yearlyPrice / 100).toFixed(2)}**/year (${plan.monthlyPrice > 0 ? `~$${((plan.yearlyPrice / 12) / 100).toFixed(2)}/mo` : 'free'})

## Limits
- **Seats:** ${plan.limits.seats ?? 'Unlimited'}
- **API calls:** ${plan.limits.apiCallsPerMonth?.toLocaleString() ?? 'Unlimited'} per month
- **Storage:** ${plan.limits.storageGb ?? 'Unlimited'} GB

## Features
${features}

## Plan Changes
${upgradeTo ? `- **Upgrade to:** ${PLANS[upgradeTo].name} (+$${((PLANS[upgradeTo].monthlyPrice - plan.monthlyPrice) / 100).toFixed(0)}/mo)` : '- *This is the highest tier*'}
${downgradeFrom ? `- **Downgrade to:** ${PLANS[downgradeFrom].name} (-$${((plan.monthlyPrice - PLANS[downgradeFrom].monthlyPrice) / 100).toFixed(0)}/mo)` : '- *This is the lowest tier*'}

## Feature Flags
Plans can be associated with feature flags. For ${plan.tier}:
- Features with \`minimumPlan: "${plan.tier}"\` or lower are enabled
- Use \`hasFeature(org, 'flag_key')\` to check availability`,
          },
        ],
      }
    }

    case 'get_billing_states': {
      const currentState = (args as { currentState?: SubscriptionStatus }).currentState

      let transitions = STATE_TRANSITIONS
      if (currentState) {
        transitions = transitions.filter(t => t.from === currentState)
      }

      // Group by from state
      const byState: Record<string, StateTransition[]> = {}
      for (const t of transitions) {
        if (!byState[t.from]) byState[t.from] = []
        byState[t.from].push(t)
      }

      const stateOutput = Object.entries(byState).map(([state, stateTransitions]) => {
        const transText = stateTransitions.map(t => {
          const auto = t.autoTransition ? '(auto)' : '(manual)'
          const grace = t.gracePeriodDays ? ` [${t.gracePeriodDays}d grace]` : ''
          return `  → **${t.to}** ${auto}${grace}\n    Trigger: ${t.trigger}\n    ${t.description}`
        }).join('\n')
        return `### ${state}\n${transText}`
      }).join('\n\n')

      return {
        content: [
          {
            type: 'text',
            text: `# Subscription State Machine

${stateOutput}

---

## State Descriptions

- **trialing**: Free trial period (typically 14 days)
- **active**: Subscription is paid and active
- **past_due**: Payment failed, retry in progress
- **unpaid**: All payment retries failed
- **canceled**: Subscription ended
- **incomplete**: Initial payment not completed
- **incomplete_expired**: Payment window expired
- **paused**: Subscription temporarily paused (if enabled)

## Grace Periods

- **past_due → unpaid**: 7 days of payment retries
- **unpaid → canceled**: 14 day grace period

## Key Points

- ⚠️ Never manually update subscription status in DB - let Stripe webhooks handle it
- Stripe is the source of truth for all subscription state
- Use \`cancelSubscription()\` to schedule cancellation at period end
- Use \`resumeSubscription()\` to undo scheduled cancellation`,
          },
        ],
      }
    }

    case 'validate_billing_change': {
      const ctx = args as unknown as ValidationContext

      const results = VALIDATION_RULES.map(rule => ({
        name: rule.name,
        ...rule.check(ctx),
      })).filter(r => r.message)

      const errors = results.filter(r => r.severity === 'error')
      const warnings = results.filter(r => r.severity === 'warning')
      const infos = results.filter(r => r.severity === 'info' && r.message)

      const valid = errors.length === 0

      return {
        content: [
          {
            type: 'text',
            text: `# Billing Change Validation: ${valid ? '✅ VALID' : '❌ INVALID'}

## Context
- Current Plan: ${ctx.currentPlan}
- Target Plan: ${ctx.targetPlan ?? '(no change)'}
- Current Status: ${ctx.currentStatus}
- Current Seats: ${ctx.currentSeats}
- Requested Seats: ${ctx.requestedSeats ?? '(no change)'}

## Errors
${errors.length ? errors.map(e => `❌ ${e.message}`).join('\n') : '✅ None'}

## Warnings
${warnings.length ? warnings.map(w => `⚠️ ${w.message}`).join('\n') : '✅ None'}

## Info
${infos.length ? infos.map(i => `ℹ️ ${i.message}`).join('\n') : 'None'}

## Recommended Action
${valid
              ? ctx.targetPlan
                ? `Proceed with plan change using \`changeSubscription(organizationId, newPriceId)\``
                : ctx.requestedSeats
                  ? `Proceed with seat change using \`updateSubscriptionQuantity(organizationId, ${ctx.requestedSeats})\``
                  : 'No changes needed'
              : 'Resolve errors before proceeding'}`,
          },
        ],
      }
    }

    case 'get_billing_code_patterns': {
      const operation = (args as { operation: string }).operation

      const patterns: Record<string, string> = {
        checkout: `// Create Stripe Checkout Session
import { createCheckoutSession } from '@startkit/billing'

// In your API route or server action
const { url } = await createCheckoutSession({
  organizationId: ctx.organizationId,
  priceId: env.STRIPE_PRO_PRICE_ID, // or get from request
  quantity: 1, // seats
  successUrl: \`\${baseUrl}/billing/success\`,
  cancelUrl: \`\${baseUrl}/billing\`,
  trialDays: 14, // optional
  promotionCode: promoCode, // optional
})

// Redirect user to Stripe
redirect(url)`,

        portal: `// Open Stripe Customer Portal
import { createBillingPortalSession } from '@startkit/billing'

// Get customer ID from subscription
const subscription = await getSubscription(ctx.organizationId)
if (!subscription) throw new Error('No subscription')

const { url } = await createBillingPortalSession(
  subscription.stripeCustomerId,
  \`\${baseUrl}/billing\` // return URL
)

// Redirect user
redirect(url)`,

        cancel: `// Cancel Subscription at Period End
import { cancelSubscription } from '@startkit/billing'
import { can, authorize } from '@startkit/rbac'

// Check permission first
authorize(ctx.user, 'manage', 'billing')

// Cancel at period end (customer keeps access until period ends)
await cancelSubscription(ctx.organizationId)

// Optionally log to audit
await logAuditEvent({
  action: 'subscription.canceled',
  resourceType: 'subscription',
  metadata: { reason: 'customer_request' },
})`,

        resume: `// Resume Canceled Subscription
import { resumeSubscription } from '@startkit/billing'
import { authorize } from '@startkit/rbac'

authorize(ctx.user, 'manage', 'billing')

// Only works if cancel_at_period_end was set
await resumeSubscription(ctx.organizationId)`,

        upgrade: `// Upgrade Subscription
import { changeSubscription, getSubscription } from '@startkit/billing'
import { authorize } from '@startkit/rbac'

authorize(ctx.user, 'manage', 'billing')

// Validate the change first
const subscription = await getSubscription(ctx.organizationId)
// ... validation logic ...

// Change to new price (prorated automatically)
await changeSubscription(
  ctx.organizationId,
  env.STRIPE_PRO_PRICE_ID // new plan's price ID
)`,

        downgrade: `// Downgrade Subscription
import { changeSubscription, getSubscription } from '@startkit/billing'
import { authorize } from '@startkit/rbac'

authorize(ctx.user, 'manage', 'billing')

// IMPORTANT: Validate seat count before downgrade
const subscription = await getSubscription(ctx.organizationId)
const targetPlanLimits = { seats: 10 } // starter plan

if (subscription.seatCount > targetPlanLimits.seats) {
  throw new Error('Remove team members before downgrading')
}

// Downgrade (change happens at period end by default in Stripe)
await changeSubscription(ctx.organizationId, env.STRIPE_STARTER_PRICE_ID)`,

        usage_tracking: `// Track Usage for Metered Billing
import { trackUsage, getUsage, checkUsageLimit } from '@startkit/billing'

// Track usage event
await trackUsage({
  organizationId: ctx.organizationId,
  userId: ctx.user.id,
  metric: 'api_calls', // or 'tokens', 'storage_gb'
  value: 1,
  timestamp: new Date(),
  idempotencyKey: requestId, // prevent duplicates
})

// Check current usage
const usage = await getUsage({
  organizationId: ctx.organizationId,
  metric: 'api_calls',
  period: 'current_month',
})

// Enforce limits
const { allowed, remaining } = await checkUsageLimit(
  ctx.organizationId,
  'api_calls'
)
if (!allowed) {
  throw new Error('API limit reached. Upgrade your plan.')
}`,

        webhook_handling: `// Stripe Webhook Handler
// Located at: apps/[product]/src/app/api/webhooks/stripe/route.ts

import { handleStripeWebhook } from '@startkit/billing'
import { headers } from 'next/headers'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  try {
    const result = await handleStripeWebhook(body, signature)
    return Response.json({ received: true, ...result })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Webhook error', { status: 400 })
  }
}

// Webhook events handled:
// - checkout.session.completed → Create subscription
// - customer.subscription.updated → Sync status
// - customer.subscription.deleted → Mark canceled
// - invoice.paid → Update billing history
// - invoice.payment_failed → Trigger grace period`,
      }

      return {
        content: [
          {
            type: 'text',
            text: `# Billing Pattern: ${operation}

\`\`\`typescript
${patterns[operation] || 'Unknown operation'}
\`\`\``,
          },
        ],
      }
    }

    case 'explain_proration': {
      const { fromPlan, toPlan, daysRemaining } = args as {
        fromPlan: PlanTier
        toPlan: PlanTier
        daysRemaining?: number
      }

      const from = PLANS[fromPlan]
      const to = PLANS[toPlan]
      const days = daysRemaining ?? 15 // default assumption

      const isUpgrade = to.monthlyPrice > from.monthlyPrice
      const priceDiff = to.monthlyPrice - from.monthlyPrice

      // Calculate proration
      const daysInMonth = 30
      const dailyRateFrom = from.monthlyPrice / daysInMonth
      const dailyRateTo = to.monthlyPrice / daysInMonth
      const creditFromOld = Math.round(dailyRateFrom * days)
      const chargeForNew = Math.round(dailyRateTo * days)
      const netCharge = chargeForNew - creditFromOld

      return {
        content: [
          {
            type: 'text',
            text: `# Proration: ${from.name} → ${to.name}

## Change Type: ${isUpgrade ? '⬆️ Upgrade' : '⬇️ Downgrade'}

### Pricing
- **${from.name}:** $${(from.monthlyPrice / 100).toFixed(2)}/month ($${(dailyRateFrom / 100).toFixed(2)}/day)
- **${to.name}:** $${(to.monthlyPrice / 100).toFixed(2)}/month ($${(dailyRateTo / 100).toFixed(2)}/day)
- **Difference:** ${priceDiff >= 0 ? '+' : ''}$${(priceDiff / 100).toFixed(2)}/month

### Proration Calculation (${days} days remaining)

${isUpgrade ? `
**Immediate charge:**
1. Credit for unused ${from.name} time: -$${(creditFromOld / 100).toFixed(2)}
2. Charge for ${to.name} time remaining: +$${(chargeForNew / 100).toFixed(2)}
3. **Net charge today:** $${(netCharge / 100).toFixed(2)}

User gets immediate access to ${to.name} features.
Next billing cycle will be full ${to.name} price.
` : `
**Downgrade behavior (Stripe default):**
- Change takes effect at **end of current period**
- No refund for current period
- User keeps ${from.name} access until period ends

**To force immediate downgrade:**
- Credit for unused ${from.name} time: -$${(creditFromOld / 100).toFixed(2)}
- Charge for ${to.name} time remaining: +$${(chargeForNew / 100).toFixed(2)}
- **Net credit:** $${(Math.abs(netCharge) / 100).toFixed(2)} (applied to next invoice)
`}

### Code Implementation

\`\`\`typescript
import { changeSubscription } from '@startkit/billing'

// Stripe handles proration automatically
await changeSubscription(organizationId, newPriceId)

// Proration behavior is set in Stripe:
// - 'create_prorations' (default) - charge/credit immediately
// - 'none' - no proration, change takes effect at period end
// - 'always_invoice' - invoice immediately for the difference
\`\`\``,
          },
        ],
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
})

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('StartKit Billing Rules MCP Server running')
}

main().catch(console.error)

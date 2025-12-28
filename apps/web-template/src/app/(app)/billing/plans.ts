/**
 * Client-safe plan utilities
 * These don't require database access and can be used in client components
 */
import type { PlanTier, PlanConfig } from '@startkit/config'

/**
 * Default pricing plans (copy from @startkit/billing/pricing to avoid
 * importing server-only database code through the barrel export)
 */
const defaultPlans: Record<PlanTier, PlanConfig> = {
  free: {
    tier: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    pricing: { monthly: 0, yearly: 0, currency: 'usd' },
    features: [
      { name: 'Up to 3 team members', included: true },
      { name: 'Basic features', included: true },
      { name: 'Community support', included: true },
    ],
    limits: { seats: 3, apiCallsPerMonth: 1000, storageGb: 1 },
    available: true,
  },
  starter: {
    tier: 'starter',
    name: 'Starter',
    description: 'For small teams',
    pricing: { monthly: 2900, yearly: 29000, currency: 'usd' },
    features: [
      { name: 'Up to 10 team members', included: true },
      { name: 'All basic features', included: true },
      { name: 'Email support', included: true },
      { name: 'Advanced analytics', included: true },
    ],
    limits: { seats: 10, apiCallsPerMonth: 10000, storageGb: 10 },
    available: true,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    pricing: { monthly: 9900, yearly: 99000, currency: 'usd' },
    features: [
      { name: 'Up to 50 team members', included: true },
      { name: 'All starter features', included: true },
      { name: 'Priority support', included: true },
      { name: 'Advanced integrations', included: true },
      { name: 'Custom branding', included: true },
    ],
    limits: { seats: 50, apiCallsPerMonth: 100000, storageGb: 100 },
    available: true,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    pricing: { monthly: 29900, yearly: 299000, currency: 'usd' },
    features: [
      { name: 'Unlimited team members', included: true },
      { name: 'All pro features', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'SLA guarantee', included: true },
      { name: 'On-premise deployment', included: true },
    ],
    limits: { seats: undefined, apiCallsPerMonth: undefined, storageGb: undefined },
    available: true,
  },
}

/**
 * Get all available plans for upgrade/downgrade
 */
export function getAvailablePlans() {
  return Object.entries(defaultPlans)
    .filter(([_, plan]) => plan.available)
    .map(([tier, plan]) => ({
      tier: tier as PlanTier,
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.pricing.monthly ?? 0,
      yearlyPrice: plan.pricing.yearly ?? 0,
      features: plan.features.filter(f => f.included).map(f => f.name),
    }))
}

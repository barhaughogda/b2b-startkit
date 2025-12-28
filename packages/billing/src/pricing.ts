import type { PlanConfig, PlanTier } from '@startkit/config'
import type { PriceConfig } from './types'

/**
 * Default pricing plans for StartKit products
 * Products can override these with their own configuration
 */
export const defaultPlans: Record<PlanTier, PlanConfig> = {
  free: {
    tier: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    pricing: {
      monthly: 0,
      yearly: 0,
      currency: 'usd',
    },
    features: [
      { name: 'Up to 3 team members', included: true },
      { name: 'Basic features', included: true },
      { name: 'Community support', included: true },
    ],
    limits: {
      seats: 3,
      apiCallsPerMonth: 1000,
      storageGb: 1,
    },
    available: true,
  },
  starter: {
    tier: 'starter',
    name: 'Starter',
    description: 'For small teams',
    pricing: {
      monthly: 2900, // $29/month
      yearly: 29000, // $290/year (~$24.17/month)
      currency: 'usd',
    },
    features: [
      { name: 'Up to 10 team members', included: true },
      { name: 'All basic features', included: true },
      { name: 'Email support', included: true },
      { name: 'Advanced analytics', included: true },
    ],
    limits: {
      seats: 10,
      apiCallsPerMonth: 10000,
      storageGb: 10,
    },
    available: true,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    pricing: {
      monthly: 9900, // $99/month
      yearly: 99000, // $990/year (~$82.50/month)
      currency: 'usd',
    },
    features: [
      { name: 'Up to 50 team members', included: true },
      { name: 'All starter features', included: true },
      { name: 'Priority support', included: true },
      { name: 'Advanced integrations', included: true },
      { name: 'Custom branding', included: true },
    ],
    limits: {
      seats: 50,
      apiCallsPerMonth: 100000,
      storageGb: 100,
    },
    available: true,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    pricing: {
      monthly: 29900, // $299/month
      yearly: 299000, // $2,990/year (~$249.17/month)
      currency: 'usd',
    },
    features: [
      { name: 'Unlimited team members', included: true },
      { name: 'All pro features', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'SLA guarantee', included: true },
      { name: 'On-premise deployment', included: true },
    ],
    limits: {
      seats: undefined, // Unlimited
      apiCallsPerMonth: undefined, // Unlimited
      storageGb: undefined, // Unlimited
    },
    available: true,
  },
}

/**
 * Get plan configuration by tier
 */
export function getPlanConfig(tier: PlanTier): PlanConfig {
  return defaultPlans[tier]
}

/**
 * Get all available plans
 */
export function getAvailablePlans(): PlanConfig[] {
  return Object.values(defaultPlans).filter((plan) => plan.available)
}

/**
 * Convert PlanConfig to PriceConfig format
 * Used for Stripe integration
 */
export function planToPriceConfig(plan: PlanConfig, stripePriceIds: {
  monthly?: string
  yearly?: string
}): PriceConfig {
  return {
    id: plan.tier,
    productId: '', // Should be set by product configuration
    name: plan.name,
    plan: plan.tier,
    monthlyPrice: plan.pricing.monthly ?? 0,
    yearlyPrice: plan.pricing.yearly ?? 0,
    features: plan.features.map((f) => f.name),
    limits: plan.limits ?? {},
  }
}

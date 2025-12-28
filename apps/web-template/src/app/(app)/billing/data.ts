import { getSubscription, getUsageSummary } from '@startkit/billing'
import { defaultPlans } from '@startkit/billing'
import type { PlanTier } from '@startkit/config'

export interface BillingData {
  subscription: {
    id: string | null
    stripeCustomerId: string | null
    plan: PlanTier
    status: string
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
    seatCount: number
    maxSeats: number | null
  } | null
  planConfig: {
    name: string
    description: string
    monthlyPrice: number
    yearlyPrice: number
    features: { name: string; included: boolean }[]
    limits: {
      seats?: number
      apiCallsPerMonth?: number
      storageGb?: number
    }
  }
  usage: {
    apiCalls: { current: number; limit: number }
    storage: { current: number; limit: number }
    seats: { current: number; limit: number }
  }
  invoices: Array<{
    id: string
    date: Date
    amount: number
    status: string
    pdfUrl?: string
  }>
}

/**
 * Fetch billing data for an organization
 */
export async function getBillingData(organizationId: string): Promise<BillingData> {
  // Fetch subscription from database (synced from Stripe)
  const subscription = await getSubscription(organizationId)
  
  // Get plan configuration
  const planTier = subscription?.plan ?? 'free'
  const planConfig = defaultPlans[planTier]

  // Get usage data
  let usageData = {
    apiCalls: { current: 0, limit: planConfig.limits?.apiCallsPerMonth ?? 1000 },
    storage: { current: 0, limit: planConfig.limits?.storageGb ?? 1 },
    seats: { 
      current: subscription?.seatCount ?? 1, 
      limit: planConfig.limits?.seats ?? 3 
    },
  }

  try {
    // Fetch actual usage from billing system
    const usage = await getUsageSummary(organizationId)
    if (usage) {
      usageData = {
        apiCalls: { 
          current: usage.apiCalls ?? 0, 
          limit: planConfig.limits?.apiCallsPerMonth ?? 1000 
        },
        storage: { 
          current: usage.storageGb ?? 0, 
          limit: planConfig.limits?.storageGb ?? 1 
        },
        seats: { 
          current: subscription?.seatCount ?? 1, 
          limit: subscription?.maxSeats ?? planConfig.limits?.seats ?? 3 
        },
      }
    }
  } catch (error) {
    // Usage tracking not set up yet, use defaults
    console.log('Usage tracking not available:', error)
  }

  // TODO: Fetch real invoices from Stripe
  const invoices: BillingData['invoices'] = []

  return {
    subscription: subscription
      ? {
          id: subscription.id,
          stripeCustomerId: subscription.stripeCustomerId,
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          seatCount: subscription.seatCount,
          maxSeats: subscription.maxSeats,
        }
      : null,
    planConfig: {
      name: planConfig.name,
      description: planConfig.description,
      monthlyPrice: planConfig.pricing.monthly ?? 0,
      yearlyPrice: planConfig.pricing.yearly ?? 0,
      features: planConfig.features,
      limits: planConfig.limits ?? {},
    },
    usage: usageData,
    invoices,
  }
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

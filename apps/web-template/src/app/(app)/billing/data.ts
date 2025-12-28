import 'server-only'
import { getSubscription, getUsageSummary } from '@startkit/billing'
import { defaultPlans } from '@startkit/billing'
import type { BillingData } from './types'

// Re-export the type for backwards compatibility
export type { BillingData } from './types'

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

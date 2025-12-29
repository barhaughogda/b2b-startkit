import 'server-only'

import { superadminDb } from '@startkit/database'
import { 
  productSubscriptions, 
  billingEvents, 
  products, 
  customers,
  productOrgs,
} from '@startkit/database/schema'
import { eq, desc, sql, and, gte, count, sum } from 'drizzle-orm'

/**
 * Get billing dashboard summary
 */
export async function getBillingSummary() {
  // Get current MRR (Monthly Recurring Revenue)
  const activeSubscriptions = await superadminDb
    .select({
      amount: productSubscriptions.amount,
      currency: productSubscriptions.currency,
      interval: productSubscriptions.interval,
    })
    .from(productSubscriptions)
    .where(eq(productSubscriptions.status, 'active'))

  // Calculate MRR (normalize yearly to monthly)
  let totalMRR = 0
  for (const sub of activeSubscriptions) {
    const amount = parseInt(sub.amount, 10) || 0
    if (sub.interval === 'year') {
      totalMRR += Math.round(amount / 12)
    } else {
      totalMRR += amount
    }
  }

  // Get total active subscriptions count
  const [activeCount] = await superadminDb
    .select({ count: count() })
    .from(productSubscriptions)
    .where(eq(productSubscriptions.status, 'active'))

  // Get total trialing subscriptions
  const [trialingCount] = await superadminDb
    .select({ count: count() })
    .from(productSubscriptions)
    .where(eq(productSubscriptions.status, 'trialing'))

  // Get revenue by product (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const revenueByProduct = await superadminDb
    .select({
      productId: billingEvents.productId,
      productName: products.displayName,
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${billingEvents.amount} AS bigint)), 0)`,
      eventCount: count(),
    })
    .from(billingEvents)
    .leftJoin(products, eq(billingEvents.productId, products.id))
    .where(
      and(
        eq(billingEvents.eventType, 'invoice.paid'),
        gte(billingEvents.occurredAt, thirtyDaysAgo)
      )
    )
    .groupBy(billingEvents.productId, products.displayName)

  // Get recent billing events
  const recentEvents = await superadminDb
    .select({
      id: billingEvents.id,
      eventType: billingEvents.eventType,
      amount: billingEvents.amount,
      currency: billingEvents.currency,
      occurredAt: billingEvents.occurredAt,
      productId: billingEvents.productId,
      productName: products.displayName,
      customerName: customers.name,
    })
    .from(billingEvents)
    .leftJoin(products, eq(billingEvents.productId, products.id))
    .leftJoin(customers, eq(billingEvents.customerId, customers.id))
    .orderBy(desc(billingEvents.occurredAt))
    .limit(20)

  return {
    mrr: totalMRR,
    activeSubscriptions: activeCount?.count ?? 0,
    trialingSubscriptions: trialingCount?.count ?? 0,
    revenueByProduct: revenueByProduct.map(r => ({
      productId: r.productId,
      productName: r.productName || 'Unknown',
      totalRevenue: parseInt(r.totalRevenue || '0', 10),
      eventCount: r.eventCount,
    })),
    recentEvents: recentEvents.map(e => ({
      id: e.id,
      eventType: e.eventType,
      amount: e.amount ? parseInt(e.amount, 10) : null,
      currency: e.currency,
      occurredAt: e.occurredAt,
      productName: e.productName || 'Unknown',
      customerName: e.customerName,
    })),
  }
}

/**
 * Get subscriptions with filters
 */
export async function getSubscriptions(filters?: {
  productId?: string
  status?: string
  search?: string
}) {
  let query = superadminDb
    .select({
      id: productSubscriptions.id,
      stripeSubscriptionId: productSubscriptions.stripeSubscriptionId,
      stripeCustomerId: productSubscriptions.stripeCustomerId,
      status: productSubscriptions.status,
      priceId: productSubscriptions.priceId,
      productName: productSubscriptions.productName,
      amount: productSubscriptions.amount,
      currency: productSubscriptions.currency,
      interval: productSubscriptions.interval,
      currentPeriodStart: productSubscriptions.currentPeriodStart,
      currentPeriodEnd: productSubscriptions.currentPeriodEnd,
      cancelAt: productSubscriptions.cancelAt,
      trialEnd: productSubscriptions.trialEnd,
      createdAt: productSubscriptions.createdAt,
      product: {
        id: products.id,
        name: products.name,
        displayName: products.displayName,
      },
      customer: {
        id: customers.id,
        name: customers.name,
      },
      productOrg: {
        id: productOrgs.id,
        name: productOrgs.name,
      },
    })
    .from(productSubscriptions)
    .leftJoin(products, eq(productSubscriptions.productId, products.id))
    .leftJoin(customers, eq(productSubscriptions.customerId, customers.id))
    .leftJoin(productOrgs, eq(productSubscriptions.productOrgId, productOrgs.id))
    .orderBy(desc(productSubscriptions.createdAt))

  // Note: For proper filtering, we would need to add where clauses
  // This is a simplified version

  const subscriptions = await query

  return subscriptions.map(s => ({
    id: s.id,
    stripeSubscriptionId: s.stripeSubscriptionId,
    stripeCustomerId: s.stripeCustomerId,
    status: s.status,
    priceId: s.priceId,
    planName: s.productName || 'Unknown Plan',
    amount: parseInt(s.amount, 10),
    currency: s.currency,
    interval: s.interval,
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    cancelAt: s.cancelAt,
    trialEnd: s.trialEnd,
    createdAt: s.createdAt,
    product: s.product?.displayName ? {
      id: s.product.id,
      name: s.product.name,
      displayName: s.product.displayName,
    } : null,
    customer: s.customer?.name ? {
      id: s.customer.id,
      name: s.customer.name,
    } : null,
    productOrg: s.productOrg?.name ? {
      id: s.productOrg.id,
      name: s.productOrg.name,
    } : null,
  }))
}

/**
 * Get MRR over time (last 6 months)
 */
export async function getMRROverTime() {
  // For a real implementation, we'd calculate historical MRR
  // This is a simplified version that returns current snapshot
  const months: { month: string; mrr: number }[] = []
  
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      mrr: 0, // Would need historical data tracking
    })
  }

  // Get current MRR for the latest month
  const activeSubscriptions = await superadminDb
    .select({
      amount: productSubscriptions.amount,
      interval: productSubscriptions.interval,
    })
    .from(productSubscriptions)
    .where(eq(productSubscriptions.status, 'active'))

  let currentMRR = 0
  for (const sub of activeSubscriptions) {
    const amount = parseInt(sub.amount, 10) || 0
    if (sub.interval === 'year') {
      currentMRR += Math.round(amount / 12)
    } else {
      currentMRR += amount
    }
  }

  if (months.length > 0) {
    months[months.length - 1].mrr = currentMRR
  }

  return months
}

/**
 * Get subscription status distribution
 */
export async function getSubscriptionStatusDistribution() {
  const distribution = await superadminDb
    .select({
      status: productSubscriptions.status,
      count: count(),
    })
    .from(productSubscriptions)
    .groupBy(productSubscriptions.status)

  return distribution.map(d => ({
    status: d.status,
    count: d.count,
  }))
}

import { superadminDb } from '@startkit/database'
import { subscriptions, organizations } from '@startkit/database/schema'
import { eq, desc, count, sql, and, gte, lte, between } from 'drizzle-orm'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

/**
 * Subscription list item
 */
export interface SubscriptionListItem {
  id: string
  organizationId: string
  organizationName: string
  organizationSlug: string
  stripeCustomerId: string
  stripeSubscriptionId: string | null
  plan: string
  status: string
  seatCount: number
  maxSeats: number | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: Date | null
  createdAt: Date
}

/**
 * Subscription metrics
 */
export interface SubscriptionMetrics {
  totalSubscriptions: number
  activeSubscriptions: number
  trialingSubscriptions: number
  canceledSubscriptions: number
  mrr: number
  arr: number
  byPlan: { plan: string; count: number; mrr: number }[]
  byStatus: { status: string; count: number }[]
  monthlyTrend: { month: string; mrr: number; subscriptions: number }[]
}

/**
 * Price mapping for MRR calculations
 * In production, this would come from Stripe
 */
const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 29,
  pro: 79,
  enterprise: 299,
}

/**
 * Get subscription metrics
 */
export async function getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
  // Get counts by status
  const statusCounts = await superadminDb
    .select({
      status: subscriptions.status,
      count: count(),
    })
    .from(subscriptions)
    .groupBy(subscriptions.status)

  // Get counts by plan
  const planCounts = await superadminDb
    .select({
      plan: subscriptions.plan,
      count: count(),
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))
    .groupBy(subscriptions.plan)

  // Calculate MRR by plan
  const byPlan = planCounts.map((p) => ({
    plan: p.plan,
    count: p.count,
    mrr: p.count * (PLAN_PRICES[p.plan] || 0),
  }))

  const mrr = byPlan.reduce((sum, p) => sum + p.mrr, 0)
  const arr = mrr * 12

  // Get monthly trend (last 6 months)
  const monthlyTrend: { month: string; mrr: number; subscriptions: number }[] = []
  
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i))
    const monthEnd = endOfMonth(subMonths(new Date(), i))
    
    const monthData = await superadminDb
      .select({
        plan: subscriptions.plan,
        count: count(),
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'active'),
          lte(subscriptions.createdAt, monthEnd)
        )
      )
      .groupBy(subscriptions.plan)

    const monthMrr = monthData.reduce(
      (sum, p) => sum + p.count * (PLAN_PRICES[p.plan] || 0),
      0
    )
    const totalSubs = monthData.reduce((sum, p) => sum + p.count, 0)

    monthlyTrend.push({
      month: format(monthStart, 'MMM yyyy'),
      mrr: monthMrr,
      subscriptions: totalSubs,
    })
  }

  // Extract totals
  const byStatus = statusCounts.map((s) => ({ status: s.status, count: s.count }))
  const totalSubscriptions = byStatus.reduce((sum, s) => sum + s.count, 0)
  const activeSubscriptions = byStatus.find((s) => s.status === 'active')?.count || 0
  const trialingSubscriptions = byStatus.find((s) => s.status === 'trialing')?.count || 0
  const canceledSubscriptions = byStatus.find((s) => s.status === 'canceled')?.count || 0

  return {
    totalSubscriptions,
    activeSubscriptions,
    trialingSubscriptions,
    canceledSubscriptions,
    mrr,
    arr,
    byPlan,
    byStatus,
    monthlyTrend,
  }
}

/**
 * Search parameters for subscriptions list
 */
export interface SubscriptionSearchParams {
  plan?: string
  status?: string
  page?: number
  limit?: number
}

/**
 * Get paginated list of subscriptions
 */
export async function getSubscriptions(params: SubscriptionSearchParams = {}) {
  const { plan, status, page = 1, limit = 20 } = params
  const offset = (page - 1) * limit

  // Build query
  let query = superadminDb
    .select({
      id: subscriptions.id,
      organizationId: subscriptions.organizationId,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      stripeCustomerId: subscriptions.stripeCustomerId,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      plan: subscriptions.plan,
      status: subscriptions.status,
      seatCount: subscriptions.seatCount,
      maxSeats: subscriptions.maxSeats,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .leftJoin(organizations, eq(subscriptions.organizationId, organizations.id))
    .$dynamic()

  // Apply filters
  if (plan && plan !== 'all') {
    query = query.where(eq(subscriptions.plan, plan as 'free' | 'starter' | 'pro' | 'enterprise'))
  }

  if (status && status !== 'all') {
    query = query.where(eq(subscriptions.status, status as 'active' | 'trialing' | 'canceled' | 'past_due'))
  }

  // Get total count
  const countResult = await superadminDb.select({ count: count() }).from(subscriptions)

  // Execute query with pagination
  const items = await query
    .orderBy(desc(subscriptions.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    items: items.map((item) => ({
      ...item,
      organizationName: item.organizationName || 'Unknown',
      organizationSlug: item.organizationSlug || 'unknown',
    })),
    total: countResult[0]?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
  }
}

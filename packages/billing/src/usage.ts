import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { superadminDb } from '@startkit/database'
import { usageRecords, subscriptions } from '@startkit/database/schema'
import { getStripe } from './stripe'
import { getSubscription } from './subscriptions'
import type { UsageEvent, UsageSummary } from './types'
import type { UsageMetric } from '@startkit/config'

/**
 * Idempotency tracking for usage events
 * In production, use Redis or database for distributed idempotency
 */
const processedKeys = new Set<string>()

/**
 * Track a usage event
 *
 * Writes directly to database for persistence.
 * In production, consider buffering in Redis for better performance.
 *
 * @example
 * await trackUsage({
 *   organizationId: org.id,
 *   userId: user.id,
 *   metric: 'api_calls',
 *   value: 1,
 *   timestamp: new Date(),
 * })
 */
export async function trackUsage(event: UsageEvent): Promise<void> {
  // Idempotency check
  if (event.idempotencyKey) {
    if (processedKeys.has(event.idempotencyKey)) {
      return // Already processed
    }
    processedKeys.add(event.idempotencyKey)

    // Clean up old keys periodically (simplified - use Redis in production)
    if (processedKeys.size > 10000) {
      const keysArray = Array.from(processedKeys)
      processedKeys.clear()
      // Keep last 1000 keys
      keysArray.slice(-1000).forEach((key) => processedKeys.add(key))
    }
  }

  // Determine period (monthly billing cycle)
  const periodStart = new Date(event.timestamp.getFullYear(), event.timestamp.getMonth(), 1)
  const periodEnd = new Date(
    event.timestamp.getFullYear(),
    event.timestamp.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  )

  // Check if record exists for this period
  const [existing] = await superadminDb
    .select()
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.organizationId, event.organizationId),
        eq(usageRecords.metric, event.metric),
        eq(usageRecords.periodStart, periodStart),
        eq(usageRecords.periodEnd, periodEnd)
      )
    )
    .limit(1)

  if (existing) {
    // Update existing record - increment value
    await superadminDb
      .update(usageRecords)
      .set({
        value: existing.value + event.value,
      })
      .where(eq(usageRecords.id, existing.id))
  } else {
    // Create new record
    await superadminDb.insert(usageRecords).values({
      organizationId: event.organizationId,
      metric: event.metric,
      value: event.value,
      periodStart,
      periodEnd,
    })
  }
}

/**
 * Get usage summary for an organization
 *
 * @example
 * const summary = await getUsageSummary(org.id, 'api_calls', startOfMonth, now)
 */
export async function getUsageSummary(
  organizationId: string,
  metric: UsageMetric,
  periodStart: Date,
  periodEnd: Date
): Promise<UsageSummary> {
  // Query database for usage records in the period
  const records = await superadminDb
    .select({
      value: usageRecords.value,
    })
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.organizationId, organizationId),
        eq(usageRecords.metric, metric),
        gte(usageRecords.periodStart, periodStart),
        lte(usageRecords.periodEnd, periodEnd)
      )
    )

  const totalValue = records.reduce((sum, r) => sum + r.value, 0)

  // Get subscription to check limits
  const subscription = await getSubscription(organizationId)
  const limit = subscription?.usageLimits?.[`${metric}PerMonth` as keyof typeof subscription.usageLimits] as number | undefined

  return {
    organizationId,
    metric,
    totalValue,
    periodStart,
    periodEnd,
    limit,
    percentUsed: limit ? (totalValue / limit) * 100 : undefined,
  }
}

/**
 * Report usage to Stripe for metered billing
 *
 * Call this on a schedule (e.g., hourly) to sync usage with Stripe.
 * This aggregates usage records and reports them to Stripe.
 *
 * @ai-context This should be called by a background job, not in request handlers.
 */
export async function reportUsageToStripe(): Promise<{ reported: number; errors: number }> {
  const stripe = getStripe()
  let reported = 0
  let errors = 0

  // Get all unreported usage records
  const unreportedRecords = await superadminDb
    .select()
    .from(usageRecords)
    .where(sql`${usageRecords.reportedToStripe} IS NULL`)
    .orderBy(usageRecords.organizationId)

  // Group by organization, metric, and period
  const grouped = new Map<
    string,
    Map<string, Map<string, { recordId: string; value: number }>>
  >()

  for (const record of unreportedRecords) {
    const orgMap = grouped.get(record.organizationId) ?? new Map()
    const metricMap = orgMap.get(record.metric) ?? new Map()
    const periodKey = `${record.periodStart.toISOString()}_${record.periodEnd.toISOString()}`
    const existing = metricMap.get(periodKey)

    if (existing) {
      existing.value += record.value
    } else {
      metricMap.set(periodKey, {
        recordId: record.id,
        value: record.value,
      })
    }
    orgMap.set(record.metric, metricMap)
    grouped.set(record.organizationId, orgMap)
  }

  // Report to Stripe
  for (const [orgId, metrics] of grouped) {
    const subscription = await getSubscription(orgId)
    if (!subscription?.stripeSubscriptionId) {
      continue // No active subscription
    }

    // Get subscription items from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    )

    for (const [metric, periods] of metrics) {
      for (const [periodKey, { recordId, value }] of periods) {
        // Find matching subscription item for this metric
        // In a real implementation, you'd map metrics to subscription items
        const subscriptionItem = stripeSubscription.items.data[0]
        if (!subscriptionItem) {
          continue
        }

        try {
          // Report usage to Stripe
          await stripe.subscriptionItems.createUsageRecord(subscriptionItem.id, {
            quantity: value,
            timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
            action: 'increment',
          })

          // Mark as reported
          await superadminDb
            .update(usageRecords)
            .set({
              reportedToStripe: new Date(),
            })
            .where(eq(usageRecords.id, recordId))

          reported++
        } catch (error) {
          console.error(`Failed to report usage for ${orgId}/${metric}:`, error)
          errors++
        }
      }
    }
  }

  return { reported, errors }
}

/**
 * Check if organization has exceeded usage limits
 */
export async function checkUsageLimits(
  organizationId: string,
  metric: UsageMetric,
  limits: { soft?: number; hard?: number }
): Promise<{ withinLimits: boolean; percentUsed: number; message?: string }> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const summary = await getUsageSummary(organizationId, metric, startOfMonth, now)

  const limit = limits.hard ?? limits.soft ?? summary.limit ?? Infinity
  const percentUsed = limit === Infinity ? 0 : (summary.totalValue / limit) * 100

  if (limits.hard && summary.totalValue >= limits.hard) {
    return {
      withinLimits: false,
      percentUsed,
      message: `Hard limit reached for ${metric}`,
    }
  }

  if (limits.soft && summary.totalValue >= limits.soft) {
    return {
      withinLimits: true, // Soft limit allows continued usage
      percentUsed,
      message: `Soft limit reached for ${metric} - overage charges may apply`,
    }
  }

  return { withinLimits: true, percentUsed }
}

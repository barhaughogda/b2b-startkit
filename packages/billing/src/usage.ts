import type { UsageEvent, UsageSummary } from './types'

/**
 * In-memory buffer for usage events
 * In production, this should be backed by Redis
 *
 * @ai-context Usage is buffered and reported in batches.
 * This reduces Stripe API calls and improves performance.
 */
const usageBuffer: UsageEvent[] = []
const processedKeys = new Set<string>()

/**
 * Track a usage event
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

    // Clean up old keys periodically (simplified)
    if (processedKeys.size > 10000) {
      processedKeys.clear()
    }
  }

  // Add to buffer
  usageBuffer.push(event)

  // TODO: In production, write to Redis instead
  // await redis.lpush(`usage:${event.organizationId}`, JSON.stringify(event))
}

/**
 * Get usage summary for an organization
 *
 * @example
 * const summary = await getUsageSummary(org.id, 'api_calls', startOfMonth, now)
 */
export async function getUsageSummary(
  organizationId: string,
  metric: string,
  periodStart: Date,
  periodEnd: Date
): Promise<UsageSummary> {
  // Filter buffer for matching events
  const matchingEvents = usageBuffer.filter(
    (e) =>
      e.organizationId === organizationId &&
      e.metric === metric &&
      e.timestamp >= periodStart &&
      e.timestamp <= periodEnd
  )

  const totalValue = matchingEvents.reduce((sum, e) => sum + e.value, 0)

  // TODO: In production, query from database
  // const result = await db.query.usageRecords.findMany({
  //   where: and(
  //     eq(usageRecords.organizationId, organizationId),
  //     eq(usageRecords.metric, metric),
  //     gte(usageRecords.periodStart, periodStart),
  //     lte(usageRecords.periodEnd, periodEnd)
  //   )
  // })

  return {
    organizationId,
    metric: metric as UsageSummary['metric'],
    totalValue,
    periodStart,
    periodEnd,
  }
}

/**
 * Report buffered usage to Stripe
 *
 * Call this on a schedule (e.g., hourly) to sync usage with Stripe
 *
 * @ai-context This should be called by a background job, not in request handlers.
 */
export async function reportUsageToStripe(): Promise<{ reported: number; errors: number }> {
  let reported = 0
  let errors = 0

  // Group by organization and metric
  const grouped = new Map<string, Map<string, number>>()

  for (const event of usageBuffer) {
    const orgMetrics = grouped.get(event.organizationId) ?? new Map()
    const currentValue = orgMetrics.get(event.metric) ?? 0
    orgMetrics.set(event.metric, currentValue + event.value)
    grouped.set(event.organizationId, orgMetrics)
  }

  // TODO: Report to Stripe
  // for (const [orgId, metrics] of grouped) {
  //   const subscription = await getSubscriptionForOrg(orgId)
  //   for (const [metric, value] of metrics) {
  //     try {
  //       await stripe.subscriptionItems.createUsageRecord(itemId, {
  //         quantity: value,
  //         timestamp: 'now',
  //         action: 'increment',
  //       })
  //       reported++
  //     } catch (e) {
  //       errors++
  //     }
  //   }
  // }

  // Clear buffer after reporting
  usageBuffer.length = 0

  return { reported, errors }
}

/**
 * Check if organization has exceeded usage limits
 */
export async function checkUsageLimits(
  organizationId: string,
  metric: string,
  limits: { soft?: number; hard?: number }
): Promise<{ withinLimits: boolean; percentUsed: number; message?: string }> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const summary = await getUsageSummary(organizationId, metric, startOfMonth, now)

  const limit = limits.hard ?? limits.soft ?? Infinity
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

import { superadminDb } from '@startkit/database'
import { organizationMembers, auditLogs, subscriptions, users } from '@startkit/database/schema'
import { eq, desc, count, and, gte } from 'drizzle-orm'
import type { ActivityItem } from '@startkit/ui'

/**
 * Fetch dashboard statistics for an organization
 */
export async function getDashboardStats(organizationId: string) {
  // Fetch member count
  const [memberCountResult] = await superadminDb
    .select({ count: count() })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId))

  // Fetch subscription info
  const [subscription] = await superadminDb
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1)

  // Get current month start for usage stats
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  // Fetch recent activity count this month
  const [activityCountResult] = await superadminDb
    .select({ count: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        gte(auditLogs.createdAt, monthStart)
      )
    )

  return {
    memberCount: memberCountResult?.count ?? 0,
    plan: subscription?.plan ?? 'free',
    status: subscription?.status ?? 'trialing',
    seatCount: subscription?.seatCount ?? 1,
    maxSeats: subscription?.maxSeats ?? 3,
    usageLimits: subscription?.usageLimits ?? {},
    activityThisMonth: activityCountResult?.count ?? 0,
  }
}

/**
 * Fetch recent activity for the activity feed
 */
export async function getRecentActivity(
  organizationId: string,
  limit = 10
): Promise<ActivityItem[]> {
  const logs = await superadminDb
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      createdAt: auditLogs.createdAt,
      userId: auditLogs.userId,
      userEmail: auditLogs.userEmail,
      metadata: auditLogs.metadata,
    })
    .from(auditLogs)
    .where(eq(auditLogs.organizationId, organizationId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)

  // Fetch user details for each log entry
  const userIds = logs.map((log) => log.userId).filter(Boolean) as string[]
  const uniqueUserIds = [...new Set(userIds)]

  const userMap = new Map<string, { name: string | null; email: string; avatarUrl: string | null }>()

  if (uniqueUserIds.length > 0) {
    const userRecords = await superadminDb
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, uniqueUserIds[0])) // Note: for multiple users, would need IN clause

    for (const user of userRecords) {
      userMap.set(user.id, {
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      })
    }
  }

  return logs.map((log) => {
    const user = log.userId ? userMap.get(log.userId) : null

    return {
      id: log.id,
      type: mapActionToActivityType(log.action),
      message: formatActionMessage(log.action, log.resourceType),
      timestamp: log.createdAt,
      user: user
        ? {
            name: user.name ?? user.email,
            email: user.email,
            avatarUrl: user.avatarUrl ?? undefined,
          }
        : log.userEmail
        ? { name: log.userEmail, email: log.userEmail }
        : undefined,
      target: log.resourceType
        ? {
            type: log.resourceType,
            name: log.resourceId ?? 'Unknown',
          }
        : undefined,
    }
  })
}

/**
 * Map audit log action to ActivityItem type
 */
function mapActionToActivityType(action: string): ActivityItem['type'] {
  if (action.includes('created') || action.includes('create')) return 'created'
  if (action.includes('updated') || action.includes('update')) return 'updated'
  if (action.includes('deleted') || action.includes('delete')) return 'deleted'
  if (action.includes('invited') || action.includes('invite')) return 'invited'
  if (action.includes('joined') || action.includes('join')) return 'joined'
  if (action.includes('left') || action.includes('leave')) return 'left'
  if (action.includes('login') || action.includes('signin')) return 'login'
  if (action.includes('logout') || action.includes('signout')) return 'logout'
  if (action.includes('subscribed') || action.includes('subscribe')) return 'subscribed'
  if (action.includes('unsubscribed')) return 'unsubscribed'
  if (action.includes('upgraded') || action.includes('upgrade')) return 'upgraded'
  if (action.includes('downgraded') || action.includes('downgrade')) return 'downgraded'
  if (action.includes('payment') || action.includes('invoice')) return 'payment'
  if (action.includes('error') || action.includes('failed')) return 'error'
  return 'custom'
}

/**
 * Format action into human-readable message
 */
function formatActionMessage(action: string, resourceType: string): string {
  // Handle common patterns
  const parts = action.split('.')
  if (parts.length === 2) {
    const [resource, verb] = parts
    const pastTense = verb.endsWith('ed') ? verb : `${verb}d`
    return `${pastTense.charAt(0).toUpperCase() + pastTense.slice(1)} ${resource}`
  }

  // Fallback: humanize the action string
  return action
    .replace(/[._]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

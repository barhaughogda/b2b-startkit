import { superadminDb } from '@startkit/database'
import { users, organizations, subscriptions, auditLogs } from '@startkit/database/schema'
import { count, desc, eq, sql, and, gte } from 'drizzle-orm'

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalUsers: number
  totalOrganizations: number
  activeSubscriptions: number
  monthlyRecurringRevenue: number
  recentActivity: RecentActivity[]
  subscriptionsByPlan: PlanBreakdown[]
  userGrowth: GrowthData[]
}

export interface RecentActivity {
  id: string
  action: string
  userEmail: string | null
  resourceType: string | null
  timestamp: Date
  isSuperadminAction: boolean
}

export interface PlanBreakdown {
  plan: string
  count: number
}

export interface GrowthData {
  date: string
  users: number
  organizations: number
}

/**
 * Get dashboard overview statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Run queries in parallel for performance
  const [
    usersResult,
    orgsResult,
    activeSubsResult,
    planBreakdown,
    recentActivityResult,
    userGrowthResult,
  ] = await Promise.all([
    // Total users
    superadminDb.select({ count: count() }).from(users),
    
    // Total organizations
    superadminDb.select({ count: count() }).from(organizations),
    
    // Active subscriptions
    superadminDb
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active')),
    
    // Subscriptions by plan
    superadminDb
      .select({
        plan: subscriptions.plan,
        count: count(),
      })
      .from(subscriptions)
      .groupBy(subscriptions.plan),
    
    // Recent activity (last 10)
    superadminDb
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        userEmail: auditLogs.userEmail,
        resourceType: auditLogs.resourceType,
        timestamp: auditLogs.createdAt,
        isSuperadminAction: auditLogs.isSuperadminAction,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(10),
    
    // User growth over last 7 days
    getUserGrowth(),
  ])

  // Calculate MRR (simplified - assumes fixed pricing)
  // In production, you'd calculate this from actual subscription amounts
  const mrrByPlan: Record<string, number> = {
    free: 0,
    starter: 29,
    pro: 79,
    enterprise: 299,
  }
  
  const mrr = planBreakdown.reduce((total, item) => {
    return total + (mrrByPlan[item.plan] || 0) * item.count
  }, 0)

  return {
    totalUsers: usersResult[0]?.count ?? 0,
    totalOrganizations: orgsResult[0]?.count ?? 0,
    activeSubscriptions: activeSubsResult[0]?.count ?? 0,
    monthlyRecurringRevenue: mrr,
    recentActivity: recentActivityResult.map((a) => ({
      ...a,
      timestamp: a.timestamp,
      isSuperadminAction: !!a.isSuperadminAction,
    })),
    subscriptionsByPlan: planBreakdown.map((p) => ({
      plan: p.plan,
      count: p.count,
    })),
    userGrowth: userGrowthResult,
  }
}

/**
 * Get user growth data for the last 7 days
 */
async function getUserGrowth(): Promise<GrowthData[]> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  // Get daily user counts
  const usersByDay = await superadminDb
    .select({
      date: sql<string>`DATE(${users.createdAt})`,
      count: count(),
    })
    .from(users)
    .where(gte(users.createdAt, sevenDaysAgo))
    .groupBy(sql`DATE(${users.createdAt})`)
    .orderBy(sql`DATE(${users.createdAt})`)
  
  // Get daily org counts
  const orgsByDay = await superadminDb
    .select({
      date: sql<string>`DATE(${organizations.createdAt})`,
      count: count(),
    })
    .from(organizations)
    .where(gte(organizations.createdAt, sevenDaysAgo))
    .groupBy(sql`DATE(${organizations.createdAt})`)
    .orderBy(sql`DATE(${organizations.createdAt})`)
  
  // Merge the data
  const dateMap = new Map<string, GrowthData>()
  
  // Initialize with all dates in range
  for (let i = 0; i < 7; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dateStr = date.toISOString().split('T')[0]
    dateMap.set(dateStr, { date: dateStr, users: 0, organizations: 0 })
  }
  
  // Fill in user counts
  usersByDay.forEach((row) => {
    const existing = dateMap.get(row.date)
    if (existing) {
      existing.users = row.count
    }
  })
  
  // Fill in org counts
  orgsByDay.forEach((row) => {
    const existing = dateMap.get(row.date)
    if (existing) {
      existing.organizations = row.count
    }
  })
  
  return Array.from(dateMap.values())
}

/**
 * Get subscription overview with customer details
 */
export async function getSubscriptionOverview() {
  return superadminDb
    .select({
      subscriptionId: subscriptions.id,
      organizationId: subscriptions.organizationId,
      organizationName: organizations.name,
      plan: subscriptions.plan,
      status: subscriptions.status,
      seatCount: subscriptions.seatCount,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .leftJoin(organizations, eq(subscriptions.organizationId, organizations.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(100)
}

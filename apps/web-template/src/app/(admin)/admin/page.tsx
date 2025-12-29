import { requireAuth } from '@startkit/auth/server'
import { superadminDb } from '@startkit/database'
import { users, organizations, subscriptions, auditLogs } from '@startkit/database/schema'
import { count, desc, eq, and, gte } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle, StatCard, StatCardGrid } from '@startkit/ui'
import { Users as UsersIcon, Building2, CreditCard, Activity } from 'lucide-react'

/**
 * App Admin Dashboard
 * 
 * Overview of users, organizations, and activity for this product
 */
export default async function AdminDashboardPage() {
  const { user } = await requireAuth()

  // Fetch stats in parallel
  const [usersResult, orgsResult, activeSubsResult, recentActivity] = await Promise.all([
    // Total users
    superadminDb.select({ count: count() }).from(users),
    
    // Total organizations
    superadminDb.select({ count: count() }).from(organizations),
    
    // Active subscriptions
    superadminDb
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active')),
    
    // Recent activity (last 10)
    superadminDb
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        userEmail: auditLogs.userEmail,
        resourceType: auditLogs.resourceType,
        timestamp: auditLogs.createdAt,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(10),
  ])

  const totalUsers = usersResult[0]?.count ?? 0
  const totalOrgs = orgsResult[0]?.count ?? 0
  const activeSubs = activeSubsResult[0]?.count ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">App Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, organizations, and settings for this product
        </p>
      </div>

      {/* Stats */}
      <StatCardGrid columns={4}>
        <StatCard
          label="Total Users"
          value={totalUsers}
          description="All users in this product"
          icon={<UsersIcon />}
          variant="default"
        />
        <StatCard
          label="Organizations"
          value={totalOrgs}
          description="Active organizations"
          icon={<Building2 />}
          variant="default"
        />
        <StatCard
          label="Active Subscriptions"
          value={activeSubs}
          description="Paying customers"
          icon={<CreditCard />}
          variant="default"
        />
        <StatCard
          label="Recent Activity"
          value={recentActivity.length}
          description="Last 10 actions"
          icon={<Activity />}
          variant="default"
        />
      </StatCardGrid>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.userEmail || 'System'} • {activity.resourceType || 'N/A'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Use the sidebar to navigate to different admin sections:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Manage users and grant app admin access</li>
            <li>View and manage organizations</li>
            <li>Monitor subscriptions and billing</li>
            <li>Configure feature flags</li>
            <li>View activity logs</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

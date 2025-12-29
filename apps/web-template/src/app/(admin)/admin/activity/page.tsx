import { superadminDb } from '@startkit/database'
import { auditLogs } from '@startkit/database/schema'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@startkit/ui'
import { Activity } from 'lucide-react'

/**
 * Activity Admin Page
 * 
 * View all activity logs for this product
 */
export default async function ActivityAdminPage() {
  // Fetch recent activity (limited to 100)
  const recentActivity = await superadminDb
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      userEmail: auditLogs.userEmail,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      timestamp: auditLogs.createdAt,
      isSuperadminAction: auditLogs.isSuperadminAction,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(100)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground">
          View all activity across this product
        </p>
      </div>

      {/* Activity logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity ({recentActivity.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity logs found</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{activity.action}</p>
                      {activity.isSuperadminAction && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Superadmin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activity.userEmail || 'System'} • {activity.resourceType || 'N/A'}
                      {activity.resourceId && ` • ${activity.resourceId.slice(0, 8)}...`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

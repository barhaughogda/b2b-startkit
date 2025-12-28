'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@startkit/ui'
import { Users, Building2, CreditCard, DollarSign, Activity, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { DashboardStats } from './data'

interface DashboardContentProps {
  stats: DashboardStats
}

export function DashboardContent({ stats }: DashboardContentProps) {
  return (
    <div className="space-y-8">
      {/* Key metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          description="Registered accounts"
          icon={Users}
          trend="+12% from last month"
        />
        <MetricCard
          title="Organizations"
          value={stats.totalOrganizations.toLocaleString()}
          description="Active tenants"
          icon={Building2}
          trend="+8% from last month"
        />
        <MetricCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions.toLocaleString()}
          description="Paid customers"
          icon={CreditCard}
          trend="+5% from last month"
        />
        <MetricCard
          title="MRR"
          value={`$${stats.monthlyRecurringRevenue.toLocaleString()}`}
          description="Monthly recurring revenue"
          icon={DollarSign}
          trend="+15% from last month"
          highlight
        />
      </div>

      {/* Charts and tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Subscriptions by Plan
            </CardTitle>
            <CardDescription>Distribution of customers across pricing tiers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.subscriptionsByPlan.map((item) => (
                <PlanBar
                  key={item.plan}
                  plan={item.plan}
                  count={item.count}
                  total={stats.subscriptionsByPlan.reduce((sum, p) => sum + p.count, 0)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No recent activity
                </p>
              ) : (
                stats.recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth chart placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Growth Trend</CardTitle>
          <CardDescription>New users and organizations over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-end justify-between gap-2">
            {stats.userGrowth.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/80 rounded-t"
                    style={{ height: `${Math.max(20, day.users * 20)}px` }}
                    title={`${day.users} users`}
                  />
                  <div
                    className="w-full bg-emerald-500/80 rounded-t"
                    style={{ height: `${Math.max(10, day.organizations * 20)}px` }}
                    title={`${day.organizations} orgs`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/80" />
              <span className="text-xs text-muted-foreground">Users</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500/80" />
              <span className="text-xs text-muted-foreground">Organizations</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  trend?: string
  highlight?: boolean
}

function MetricCard({ title, value, description, icon: Icon, trend, highlight }: MetricCardProps) {
  return (
    <Card className={highlight ? 'border-primary/50 glow-admin' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <p className="text-xs text-emerald-400 mt-1">
            <TrendingUp className="inline h-3 w-3 mr-1" />
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface PlanBarProps {
  plan: string
  count: number
  total: number
}

function PlanBar({ plan, count, total }: PlanBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0
  const planColors: Record<string, string> = {
    free: 'bg-zinc-500',
    starter: 'bg-blue-500',
    pro: 'bg-primary',
    enterprise: 'bg-amber-500',
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="capitalize font-medium">{plan}</span>
        <span className="text-muted-foreground">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full ${planColors[plan] || 'bg-primary'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface ActivityItemProps {
  activity: {
    id: string
    action: string
    userEmail: string | null
    resourceType: string | null
    timestamp: Date
    isSuperadminAction: boolean
  }
}

function ActivityItem({ activity }: ActivityItemProps) {
  const actionLabels: Record<string, string> = {
    'user.created': 'User signed up',
    'user.updated': 'User updated',
    'organization.created': 'Organization created',
    'subscription.created': 'Subscription started',
    'subscription.updated': 'Subscription changed',
    'subscription.canceled': 'Subscription canceled',
    'impersonation.started': 'Impersonation started',
    'impersonation.ended': 'Impersonation ended',
  }

  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          {actionLabels[activity.action] || activity.action}
          {activity.isSuperadminAction && (
            <Badge variant="outline" className="ml-2 text-xs border-primary text-primary">
              Admin
            </Badge>
          )}
        </p>
        <p className="text-muted-foreground truncate">
          {activity.userEmail || 'System'}
          {activity.resourceType && ` • ${activity.resourceType}`}
        </p>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
      </span>
    </div>
  )
}

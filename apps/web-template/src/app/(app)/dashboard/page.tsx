import Link from 'next/link'
import { requireAuth } from '@startkit/auth/server'
import {
  StatCard,
  StatCardGrid,
  ActivityFeed,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  PageHeader,
  PageHeaderContent,
  PageHeaderTitle,
  PageHeaderDescription,
} from '@startkit/ui'
import { Users, CreditCard, Activity, TrendingUp, Plus, Settings, FileText } from 'lucide-react'
import { getDashboardStats, getRecentActivity } from './data'

/**
 * Dashboard page - main landing page for authenticated users
 */
export default async function DashboardPage() {
  const { user, organization } = await requireAuth()

  // Fetch dashboard data if organization is selected
  const stats = organization ? await getDashboardStats(organization.organizationId) : null
  const recentActivity = organization ? await getRecentActivity(organization.organizationId, 5) : []

  return (
    <div className="space-y-8">
      {/* Page header */}
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>
            Welcome back, {user.name?.split(' ')[0] ?? 'there'}
          </PageHeaderTitle>
          <PageHeaderDescription>
            {organization
              ? `Here's what's happening with ${organization.name}`
              : 'Select an organization to get started'}
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      {organization ? (
        <>
          {/* Quick stats */}
          <StatCardGrid columns={4}>
            <StatCard
              label="Team Members"
              value={stats?.memberCount ?? 0}
              description={`of ${stats?.maxSeats ?? 'unlimited'} seats used`}
              icon={<Users />}
              variant="default"
            />
            <StatCard
              label="Current Plan"
              value={capitalize(stats?.plan ?? 'Free')}
              description={stats?.status === 'active' ? 'Active subscription' : 'Upgrade available'}
              icon={<CreditCard />}
              variant="default"
            />
            <StatCard
              label="Activities"
              value={stats?.activityThisMonth ?? 0}
              description="This month"
              icon={<Activity />}
              trend={stats?.activityThisMonth ? { value: 12, label: 'vs last month' } : undefined}
              variant="default"
            />
            <StatCard
              label="API Usage"
              value={formatNumber(stats?.usageLimits?.apiCallsPerMonth ?? 1000)}
              description="Calls available"
              icon={<TrendingUp />}
              variant="default"
            />
          </StatCardGrid>

          {/* Main content grid */}
          <div className="grid gap-6 lg:grid-cols-7">
            {/* Recent Activity */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityFeed
                  items={recentActivity}
                  showTimeline
                  emptyMessage="No recent activity. Actions you take will appear here."
                  maxItems={5}
                />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickAction
                  href="/team"
                  icon={<Plus className="h-4 w-4" />}
                  title="Invite team members"
                  description="Add people to your organization"
                />
                <QuickAction
                  href="/billing"
                  icon={<CreditCard className="h-4 w-4" />}
                  title="Manage billing"
                  description="View usage and upgrade your plan"
                />
                <QuickAction
                  href="/settings"
                  icon={<Settings className="h-4 w-4" />}
                  title="Organization settings"
                  description="Configure your workspace"
                />
                <QuickAction
                  href="/docs"
                  icon={<FileText className="h-4 w-4" />}
                  title="View documentation"
                  description="Learn how to use the platform"
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* No organization selected state */
        <Card className="py-16">
          <CardContent className="flex flex-col items-center text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Organization Selected</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Create or join an organization to start collaborating with your team.
              Use the organization switcher in the sidebar to get started.
            </p>
            <Button>Create Organization</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border border-transparent p-3 transition-colors hover:bg-muted hover:border-border"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </Link>
  )
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
  return num.toString()
}

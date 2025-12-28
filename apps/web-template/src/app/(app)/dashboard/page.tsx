import { requireAuth } from '@startkit/auth/server'

/**
 * Dashboard page - main landing page for authenticated users
 */
export default async function DashboardPage() {
  const { user, organization } = await requireAuth()

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name ?? user.email}
          {organization && ` - ${organization.name}`}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value="--" description="Team members" />
        <StatCard title="Active Projects" value="--" description="In progress" />
        <StatCard title="API Calls" value="--" description="This month" />
        <StatCard title="Storage Used" value="--" description="GB" />
      </div>

      {/* Main content area */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
          <p className="text-sm text-muted-foreground">No recent activity to show.</p>
        </div>
        <div className="col-span-3 rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
          <p className="text-sm text-muted-foreground">Get started by creating your first project.</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  )
}

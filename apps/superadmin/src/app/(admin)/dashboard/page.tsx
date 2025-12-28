import { getDashboardStats } from './data'
import { DashboardContent } from './components'

/**
 * Superadmin Dashboard Page
 */
export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Platform overview and key metrics
        </p>
      </div>

      <DashboardContent stats={stats} />
    </div>
  )
}

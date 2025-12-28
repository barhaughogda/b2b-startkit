import { getSubscriptionMetrics, getSubscriptions } from './data'
import { SubscriptionsContent } from './components'

interface PageProps {
  searchParams: Promise<{
    plan?: string
    status?: string
    page?: string
  }>
}

/**
 * Subscriptions Overview Page
 */
export default async function SubscriptionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = params.page ? parseInt(params.page, 10) : 1

  const [metrics, subscriptionsResult] = await Promise.all([
    getSubscriptionMetrics(),
    getSubscriptions({
      plan: params.plan,
      status: params.status,
      page,
      limit: 20,
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground">
          Revenue metrics and subscription management
        </p>
      </div>

      <SubscriptionsContent
        metrics={metrics}
        subscriptions={subscriptionsResult.items}
        total={subscriptionsResult.total}
        page={subscriptionsResult.page}
        totalPages={subscriptionsResult.totalPages}
        filters={{
          plan: params.plan,
          status: params.status,
        }}
      />
    </div>
  )
}

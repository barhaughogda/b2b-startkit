import { Suspense } from 'react'
import { getBillingSummary, getSubscriptions, getSubscriptionStatusDistribution } from './data'
import { 
  BillingSummaryCards, 
  RevenueByProductChart, 
  RecentBillingEvents,
  SubscriptionsTable,
  BillingPageSkeleton,
} from './components'

export default async function BillingPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Platform-wide billing overview and revenue metrics
        </p>
      </div>

      <Suspense fallback={<BillingPageSkeleton />}>
        <BillingContent />
      </Suspense>
    </div>
  )
}

async function BillingContent() {
  const [summary, subscriptions, statusDistribution] = await Promise.all([
    getBillingSummary(),
    getSubscriptions(),
    getSubscriptionStatusDistribution(),
  ])

  return (
    <>
      {/* Summary Cards */}
      <BillingSummaryCards 
        mrr={summary.mrr}
        activeSubscriptions={summary.activeSubscriptions}
        trialingSubscriptions={summary.trialingSubscriptions}
        statusDistribution={statusDistribution}
      />

      {/* Revenue by Product */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueByProductChart data={summary.revenueByProduct} />
        <RecentBillingEvents events={summary.recentEvents} />
      </div>

      {/* Subscriptions Table */}
      <SubscriptionsTable subscriptions={subscriptions} />
    </>
  )
}

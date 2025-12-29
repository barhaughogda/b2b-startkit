'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@startkit/ui/components/card'
import { Badge } from '@startkit/ui/components/badge'
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface BillingSummaryCardsProps {
  mrr: number
  activeSubscriptions: number
  trialingSubscriptions: number
  statusDistribution: Array<{ status: string; count: number }>
}

interface RevenueByProductChartProps {
  data: Array<{
    productId: string | null
    productName: string
    totalRevenue: number
    eventCount: number
  }>
}

interface RecentBillingEventsProps {
  events: Array<{
    id: string
    eventType: string
    amount: number | null
    currency: string | null
    occurredAt: Date
    productName: string
    customerName: string | null
  }>
}

interface Subscription {
  id: string
  stripeSubscriptionId: string
  stripeCustomerId: string
  status: string
  priceId: string
  planName: string
  amount: number
  currency: string
  interval: string
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAt: Date | null
  trialEnd: Date | null
  createdAt: Date
  product: { id: string; name: string; displayName: string } | null
  customer: { id: string; name: string } | null
  productOrg: { id: string; name: string } | null
}

interface SubscriptionsTableProps {
  subscriptions: Subscription[]
}

// ============================================================================
// SUMMARY CARDS
// ============================================================================

export function BillingSummaryCards({ 
  mrr, 
  activeSubscriptions, 
  trialingSubscriptions,
  statusDistribution,
}: BillingSummaryCardsProps) {
  const canceledCount = statusDistribution.find(s => s.status === 'canceled')?.count ?? 0
  const pastDueCount = statusDistribution.find(s => s.status === 'past_due')?.count ?? 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">
            ${(mrr / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            Normalized monthly revenue
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeSubscriptions}</div>
          <p className="text-xs text-muted-foreground">
            Paying customers
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trialing</CardTitle>
          <Clock className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{trialingSubscriptions}</div>
          <p className="text-xs text-muted-foreground">
            In trial period
          </p>
        </CardContent>
      </Card>

      <Card className={pastDueCount > 0 ? 'border-amber-500/20 bg-amber-500/5' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">At Risk</CardTitle>
          <AlertCircle className={`h-4 w-4 ${pastDueCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pastDueCount + canceledCount}</div>
          <p className="text-xs text-muted-foreground">
            {pastDueCount} past due, {canceledCount} canceled
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// REVENUE BY PRODUCT
// ============================================================================

export function RevenueByProductChart({ data }: RevenueByProductChartProps) {
  const totalRevenue = data.reduce((sum, p) => sum + p.totalRevenue, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Revenue by Product
        </CardTitle>
        <CardDescription>Last 30 days invoice payments</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No revenue data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue will appear here as products send billing events
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((product) => {
              const percentage = totalRevenue > 0 
                ? Math.round((product.totalRevenue / totalRevenue) * 100) 
                : 0
              
              return (
                <div key={product.productId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{product.productName}</span>
                    <span className="text-muted-foreground">
                      ${(product.totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {product.eventCount} payment{product.eventCount !== 1 ? 's' : ''} • {percentage}% of total
                  </p>
                </div>
              )
            })}
            
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total (30 days)</span>
                <span className="font-semibold text-emerald-500">
                  ${(totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// RECENT BILLING EVENTS
// ============================================================================

export function RecentBillingEvents({ events }: RecentBillingEventsProps) {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'invoice.paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'subscription.created':
        return <Users className="h-4 w-4 text-blue-500" />
      case 'subscription.updated':
        return <ArrowRight className="h-4 w-4 text-amber-500" />
      case 'subscription.deleted':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'charge.failed':
      case 'invoice.payment_failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <CreditCard className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case 'invoice.paid':
        return 'Invoice Paid'
      case 'subscription.created':
        return 'New Subscription'
      case 'subscription.updated':
        return 'Subscription Updated'
      case 'subscription.deleted':
        return 'Subscription Canceled'
      case 'charge.succeeded':
        return 'Charge Succeeded'
      case 'charge.failed':
        return 'Charge Failed'
      case 'invoice.payment_failed':
        return 'Payment Failed'
      default:
        return eventType.replace('.', ' ').replace(/_/g, ' ')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest billing events across all products</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No billing events yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Events will appear here as products sync billing data
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="mt-0.5">{getEventIcon(event.eventType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {getEventLabel(event.eventType)}
                    </span>
                    {event.amount !== null && (
                      <span className="text-sm font-medium text-emerald-500 shrink-0">
                        ${(event.amount / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{event.productName}</span>
                    {event.customerName && (
                      <>
                        <span>•</span>
                        <span>{event.customerName}</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.occurredAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SUBSCRIPTIONS TABLE
// ============================================================================

export function SubscriptionsTable({ subscriptions }: SubscriptionsTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Trialing</Badge>
      case 'past_due':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Past Due</Badge>
      case 'canceled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Canceled</Badge>
      case 'incomplete':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Incomplete</Badge>
      case 'paused':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Paused</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Subscriptions</CardTitle>
        <CardDescription>
          Aggregated subscription data from all products
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No subscriptions found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Subscriptions will appear here as products sync billing data
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Customer / Org</th>
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="text-sm">
                    <td className="py-3">
                      <div>
                        <div className="font-medium">
                          {sub.customer?.name || sub.productOrg?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {sub.stripeCustomerId}
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      {sub.product?.displayName || 'Unknown Product'}
                    </td>
                    <td className="py-3">
                      {sub.planName}
                    </td>
                    <td className="py-3">
                      <div className="font-medium">
                        ${(sub.amount / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        /{sub.interval}
                      </div>
                    </td>
                    <td className="py-3">
                      {getStatusBadge(sub.status)}
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {sub.currentPeriodEnd ? (
                        <>
                          Ends {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                        </>
                      ) : (
                        '—'
                      )}
                      {sub.cancelAt && (
                        <div className="text-amber-500">
                          Cancels {new Date(sub.cancelAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SKELETON
// ============================================================================

export function BillingPageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-5 w-40 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-2 w-3/4 bg-muted rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-32 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

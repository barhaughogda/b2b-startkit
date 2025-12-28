'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@startkit/ui'
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useTransition } from 'react'
import type { SubscriptionMetrics, SubscriptionListItem } from './data'

interface SubscriptionsContentProps {
  metrics: SubscriptionMetrics
  subscriptions: SubscriptionListItem[]
  total: number
  page: number
  totalPages: number
  filters: {
    plan?: string
    status?: string
  }
}

export function SubscriptionsContent({
  metrics,
  subscriptions,
  total,
  page,
  totalPages,
  filters,
}: SubscriptionsContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    if (!updates.page) {
      params.delete('page')
    }

    startTransition(() => {
      router.push(`/subscriptions?${params.toString()}`)
    })
  }

  return (
    <div className="space-y-8">
      {/* Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="MRR"
          value={`$${metrics.mrr.toLocaleString()}`}
          description="Monthly recurring revenue"
          icon={DollarSign}
          highlight
        />
        <MetricCard
          title="ARR"
          value={`$${metrics.arr.toLocaleString()}`}
          description="Annual recurring revenue"
          icon={TrendingUp}
        />
        <MetricCard
          title="Active"
          value={metrics.activeSubscriptions.toString()}
          description="Paying customers"
          icon={CreditCard}
        />
        <MetricCard
          title="Trialing"
          value={metrics.trialingSubscriptions.toString()}
          description="In trial period"
          icon={Users}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
            <CardDescription>MRR distribution across pricing tiers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.byPlan.map((item) => (
                <PlanRevenueBar
                  key={item.plan}
                  plan={item.plan}
                  count={item.count}
                  mrr={item.mrr}
                  totalMrr={metrics.mrr}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* MRR Trend */}
        <Card>
          <CardHeader>
            <CardTitle>MRR Trend</CardTitle>
            <CardDescription>Monthly recurring revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-end justify-between gap-2">
              {metrics.monthlyTrend.map((month) => (
                <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-primary/80 rounded-t transition-all"
                    style={{
                      height: `${Math.max(
                        20,
                        metrics.mrr > 0 ? (month.mrr / metrics.mrr) * 150 : 20
                      )}px`,
                    }}
                    title={`$${month.mrr.toLocaleString()} MRR`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {month.month.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                All Subscriptions
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {total.toLocaleString()} total subscriptions
              </p>
            </div>
            <div className="flex gap-2">
              <Select
                value={filters.plan || 'all'}
                onValueChange={(value) => updateFilters({ plan: value })}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => updateFilters({ status: value })}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No subscriptions found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Renews</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <Link
                              href={`/organizations/${sub.organizationId}`}
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {sub.organizationName}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {sub.organizationSlug}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <PlanBadge plan={sub.plan} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={sub.status} />
                            {sub.cancelAtPeriodEnd && (
                              <AlertTriangle className="h-4 w-4 text-amber-400" title="Cancels at period end" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sub.seatCount}
                          {sub.maxSeats && (
                            <span className="text-muted-foreground">/{sub.maxSeats}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sub.currentPeriodEnd
                            ? format(sub.currentPeriodEnd, 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Link href={`/organizations/${sub.organizationId}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || isPending}
                      onClick={() => updateFilters({ page: String(page - 1) })}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || isPending}
                      onClick={() => updateFilters({ page: String(page + 1) })}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
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
  highlight?: boolean
}

function MetricCard({ title, value, description, icon: Icon, highlight }: MetricCardProps) {
  return (
    <Card className={highlight ? 'border-primary/50 glow-admin' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

interface PlanRevenueBarProps {
  plan: string
  count: number
  mrr: number
  totalMrr: number
}

function PlanRevenueBar({ plan, count, mrr, totalMrr }: PlanRevenueBarProps) {
  const percentage = totalMrr > 0 ? (mrr / totalMrr) * 100 : 0
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
        <span className="text-muted-foreground">
          {count} subs · ${mrr.toLocaleString()}/mo
        </span>
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

function PlanBadge({ plan }: { plan: string }) {
  return (
    <Badge variant={plan === 'free' ? 'secondary' : 'default'} className="capitalize">
      {plan}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
    active: { variant: 'default', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    trialing: { variant: 'outline', className: 'border-amber-500/50 text-amber-400' },
    past_due: { variant: 'outline', className: 'border-orange-500/50 text-orange-400' },
    canceled: { variant: 'destructive', className: '' },
  }

  const config = statusConfig[status] || { variant: 'secondary' as const, className: '' }

  return (
    <Badge variant={config.variant} className={config.className}>
      {status.replace('_', ' ')}
    </Badge>
  )
}

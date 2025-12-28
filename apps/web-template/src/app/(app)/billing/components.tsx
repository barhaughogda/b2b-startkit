'use client'

import { useState, useTransition } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  toast,
  cn,
} from '@startkit/ui'
import { Check, CreditCard, AlertCircle, ExternalLink } from 'lucide-react'
import { openBillingPortal, cancelSubscription, resumeSubscription, createCheckout } from './actions'
import type { BillingData } from './data'
import { getAvailablePlans } from './data'

interface CurrentPlanCardProps {
  subscription: BillingData['subscription']
  planConfig: BillingData['planConfig']
}

export function CurrentPlanCard({ subscription, planConfig }: CurrentPlanCardProps) {
  const [isPending, startTransition] = useTransition()
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'
  const isCanceling = subscription?.cancelAtPeriodEnd

  const handleManageSubscription = () => {
    startTransition(async () => {
      const result = await openBillingPortal()
      if (result.success && result.url) {
        window.location.href = result.url
      } else {
        toast.error(result.error ?? 'Failed to open billing portal')
      }
    })
  }

  const handleCancelSubscription = () => {
    startTransition(async () => {
      const result = await cancelSubscription()
      if (result.success) {
        toast.success('Subscription will be canceled at the end of the billing period')
      } else {
        toast.error(result.error ?? 'Failed to cancel subscription')
      }
    })
  }

  const handleResumeSubscription = () => {
    startTransition(async () => {
      const result = await resumeSubscription()
      if (result.success) {
        toast.success('Subscription resumed')
      } else {
        toast.error(result.error ?? 'Failed to resume subscription')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Current Plan</CardTitle>
            <CardDescription>Your subscription details</CardDescription>
          </div>
          {isActive && !isCanceling && (
            <Badge variant="default" className="bg-green-500 text-white">
              Active
            </Badge>
          )}
          {isCanceling && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
              Canceling
            </Badge>
          )}
          {subscription?.status === 'past_due' && (
            <Badge variant="destructive">Past Due</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan info */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-3xl font-bold">{planConfig.name}</h3>
            <p className="text-muted-foreground">{planConfig.description}</p>
            {subscription?.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground mt-2">
                {isCanceling ? 'Access until' : 'Renews on'}{' '}
                {formatDate(subscription.currentPeriodEnd)}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              ${(planConfig.monthlyPrice / 100).toFixed(0)}
            </div>
            <p className="text-sm text-muted-foreground">/month</p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Included features:</h4>
          <ul className="space-y-1">
            {planConfig.features.slice(0, 4).map((feature) => (
              <li key={feature.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                {feature.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          {subscription?.stripeCustomerId && (
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={isPending}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Manage Subscription
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          )}

          {isActive && !isCanceling && subscription?.plan !== 'free' && (
            <CancelSubscriptionDialog onConfirm={handleCancelSubscription} isPending={isPending} />
          )}

          {isCanceling && (
            <Button onClick={handleResumeSubscription} disabled={isPending}>
              Resume Subscription
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface CancelSubscriptionDialogProps {
  onConfirm: () => void
  isPending: boolean
}

function CancelSubscriptionDialog({ onConfirm, isPending }: CancelSubscriptionDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-muted-foreground">
          Cancel Subscription
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel? You&apos;ll retain access until the end of your billing period.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-500/10 text-amber-600">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            Your data will be preserved. You can resubscribe anytime to regain access.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              setOpen(false)
            }}
            disabled={isPending}
          >
            Cancel Subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface UsageCardProps {
  usage: BillingData['usage']
}

export function UsageCard({ usage }: UsageCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Usage This Period</CardTitle>
        <CardDescription>Your current resource consumption</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <UsageBar
          label="API Calls"
          current={usage.apiCalls.current}
          limit={usage.apiCalls.limit}
        />
        <UsageBar
          label="Storage"
          current={usage.storage.current}
          limit={usage.storage.limit}
          unit="GB"
        />
        <UsageBar
          label="Team Members"
          current={usage.seats.current}
          limit={usage.seats.limit}
        />
      </CardContent>
    </Card>
  )
}

interface UsageBarProps {
  label: string
  current: number
  limit: number
  unit?: string
}

function UsageBar({ label, current, limit, unit = '' }: UsageBarProps) {
  const percentage = Math.min((current / limit) * 100, 100)
  const isWarning = percentage > 80
  const isDanger = percentage > 95

  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {formatNumber(current)}
          {unit} / {formatNumber(limit)}
          {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isDanger ? 'bg-destructive' : isWarning ? 'bg-amber-500' : 'bg-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isWarning && !isDanger && (
        <p className="text-xs text-amber-600 mt-1">Approaching limit</p>
      )}
      {isDanger && (
        <p className="text-xs text-destructive mt-1">At capacity - consider upgrading</p>
      )}
    </div>
  )
}

interface UpgradePlansProps {
  currentPlan: string
}

export function UpgradePlans({ currentPlan }: UpgradePlansProps) {
  const [isPending, startTransition] = useTransition()
  const plans = getAvailablePlans()

  const handleUpgrade = (priceId: string) => {
    startTransition(async () => {
      // TODO: Get actual Stripe price ID from env or config
      const result = await createCheckout(priceId)
      if (result.success && result.url) {
        window.location.href = result.url
      } else {
        toast.error(result.error ?? 'Failed to start checkout')
      }
    })
  }

  // Filter to show plans higher than current
  const tierOrder = ['free', 'starter', 'pro', 'enterprise']
  const currentTierIndex = tierOrder.indexOf(currentPlan)
  const upgradePlans = plans.filter(
    (plan) => tierOrder.indexOf(plan.tier) > currentTierIndex
  )

  if (upgradePlans.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upgrade Your Plan</CardTitle>
        <CardDescription>Get more features and higher limits</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upgradePlans.map((plan) => (
            <div
              key={plan.tier}
              className="rounded-lg border p-4 hover:border-primary transition-colors"
            >
              <h4 className="font-semibold">{plan.name}</h4>
              <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
              <p className="text-2xl font-bold mb-4">
                ${(plan.monthlyPrice / 100).toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="space-y-1 mb-4">
                {plan.features.slice(0, 3).map((feature) => (
                  <li key={feature} className="text-xs text-muted-foreground flex items-center gap-1">
                    <Check className="h-3 w-3 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                size="sm"
                disabled={isPending}
                onClick={() => handleUpgrade(`price_${plan.tier}_monthly`)}
              >
                Upgrade to {plan.name}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

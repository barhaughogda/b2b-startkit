import { requireOrganization } from '@startkit/auth/server'
import { Button } from '@startkit/ui'

/**
 * Billing page - subscription management
 */
export default async function BillingPage() {
  const { organization } = await requireOrganization()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Current Plan */}
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold capitalize">{organization.plan}</div>
              <p className="text-sm text-muted-foreground">
                {organization.plan === 'free'
                  ? 'Upgrade to unlock more features'
                  : 'Your subscription is active'}
              </p>
            </div>
            <Button variant={organization.plan === 'free' ? 'default' : 'outline'}>
              {organization.plan === 'free' ? 'Upgrade' : 'Manage Subscription'}
            </Button>
          </div>
        </section>

        {/* Usage */}
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Usage This Period</h2>
          <div className="space-y-4">
            <UsageBar label="API Calls" current={0} limit={1000} />
            <UsageBar label="Storage" current={0} limit={5} unit="GB" />
            <UsageBar label="Team Members" current={1} limit={5} />
          </div>
        </section>

        {/* Billing History */}
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Billing History</h2>
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        </section>
      </div>
    </div>
  )
}

function UsageBar({
  label,
  current,
  limit,
  unit = '',
}: {
  label: string
  current: number
  limit: number
  unit?: string
}) {
  const percentage = Math.min((current / limit) * 100, 100)
  const isWarning = percentage > 80
  const isDanger = percentage > 95

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {current}
          {unit} / {limit}
          {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            isDanger ? 'bg-destructive' : isWarning ? 'bg-yellow-500' : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

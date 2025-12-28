import { redirect } from 'next/navigation'
import { getServerAuth } from '@startkit/auth/server'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderTitle,
  PageHeaderDescription,
  Alert,
  AlertDescription,
  AlertTitle,
} from '@startkit/ui'
import { CheckCircle, XCircle } from 'lucide-react'
import { getBillingData } from './data'
import { CurrentPlanCard, UsageCard, UpgradePlans } from './components'

interface BillingPageProps {
  searchParams: Promise<{ success?: string; canceled?: string }>
}

/**
 * Billing page - subscription management
 */
export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams
  const authContext = await getServerAuth()
  
  if (!authContext) {
    redirect('/sign-in')
  }
  
  if (!authContext.organization) {
    redirect('/dashboard')
  }
  
  const { organization } = authContext
  const billingData = await getBillingData(organization.organizationId)

  return (
    <div className="space-y-8">
      {/* Page header */}
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Billing</PageHeaderTitle>
          <PageHeaderDescription>
            Manage your subscription and billing information.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      {/* Success/Cancel alerts from Stripe checkout */}
      {params.success && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Payment successful!</AlertTitle>
          <AlertDescription>
            Thank you for your subscription. Your new plan is now active.
          </AlertDescription>
        </Alert>
      )}
      {params.canceled && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <XCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle>Checkout canceled</AlertTitle>
          <AlertDescription>
            Your checkout was canceled. No charges were made.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Plan */}
        <CurrentPlanCard
          subscription={billingData.subscription}
          planConfig={billingData.planConfig}
        />

        {/* Usage */}
        <UsageCard usage={billingData.usage} />
      </div>

      {/* Upgrade Plans */}
      <UpgradePlans currentPlan={billingData.subscription?.plan ?? 'free'} />

      {/* Billing History */}
      {billingData.invoices.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Billing History</h2>
          <div className="space-y-2">
            {billingData.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'long',
                      year: 'numeric',
                    }).format(invoice.date)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.status === 'paid' ? 'Paid' : invoice.status}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">
                    ${(invoice.amount / 100).toFixed(2)}
                  </span>
                  {invoice.pdfUrl && (
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

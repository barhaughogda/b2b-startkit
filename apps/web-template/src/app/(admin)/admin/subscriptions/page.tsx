import { superadminDb } from '@startkit/database'
import { subscriptions, organizations } from '@startkit/database/schema'
import { desc, eq } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@startkit/ui'
import { CreditCard } from 'lucide-react'

/**
 * Subscriptions Admin Page
 * 
 * List and manage all subscriptions in the product
 */
export default async function SubscriptionsAdminPage() {
  // Fetch all subscriptions with organization info
  const allSubs = await superadminDb
    .select({
      id: subscriptions.id,
      plan: subscriptions.plan,
      status: subscriptions.status,
      seatCount: subscriptions.seatCount,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      createdAt: subscriptions.createdAt,
      organizationName: organizations.name,
    })
    .from(subscriptions)
    .leftJoin(organizations, eq(subscriptions.organizationId, organizations.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(100)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground">
          Manage all subscriptions in this product
        </p>
      </div>

      {/* Subscriptions list */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions ({allSubs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {allSubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscriptions found</p>
          ) : (
            <div className="space-y-4">
              {allSubs.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <CreditCard className="h-10 w-10 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{sub.organizationName || 'Unknown Org'}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.plan} • {sub.status} • {sub.seatCount} seats
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Period ends: {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(sub.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

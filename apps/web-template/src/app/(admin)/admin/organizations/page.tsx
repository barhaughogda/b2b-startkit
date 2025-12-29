import { superadminDb } from '@startkit/database'
import { organizations } from '@startkit/database/schema'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@startkit/ui'
import { Building2 } from 'lucide-react'

/**
 * Organizations Admin Page
 * 
 * List and manage all organizations in the product
 */
export default async function OrganizationsAdminPage() {
  // Fetch all organizations (limited to 100 for now)
  const allOrgs = await superadminDb
    .select()
    .from(organizations)
    .orderBy(desc(organizations.createdAt))
    .limit(100)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
        <p className="text-muted-foreground">
          Manage all organizations in this product
        </p>
      </div>

      {/* Organizations list */}
      <Card>
        <CardHeader>
          <CardTitle>All Organizations ({allOrgs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {allOrgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations found</p>
          ) : (
            <div className="space-y-4">
              {allOrgs.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{org.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {org.slug} • Status: {org.status}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(org.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { notFound } from 'next/navigation'
import { superadminDb } from '@startkit/database'
import { users, organizationMembers, organizations } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@startkit/ui'
import { Shield, Mail, Calendar, Building2 } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * User Detail Admin Page
 * 
 * View and manage a specific user
 */
export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params

  // Fetch user
  const [user] = await superadminDb
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!user) {
    notFound()
  }

  // Fetch user's organization memberships
  const memberships = await superadminDb
    .select({
      id: organizationMembers.id,
      role: organizationMembers.role,
      isAppAdmin: organizationMembers.isAppAdmin,
      joinedAt: organizationMembers.joinedAt,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(organizationMembers)
    .leftJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, user.id))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Details</h1>
        <p className="text-muted-foreground">
          View and manage user information
        </p>
      </div>

      {/* User info */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || user.email}
                className="h-20 w-20 rounded-full"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <span className="text-2xl font-medium">
                  {user.email[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{user.name || 'No name'}</h2>
                {user.isSuperadmin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    <Shield className="h-3 w-3" />
                    Platform Superadmin
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Joined:</span>
              <span className="font-medium">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization memberships */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Memberships</CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              User is not a member of any organizations
            </p>
          ) : (
            <div className="space-y-4">
              {memberships.map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{membership.organizationName}</p>
                        {membership.isAppAdmin && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <Shield className="h-3 w-3" />
                            App Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Role: {membership.role} • Joined {new Date(membership.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            User management actions will be available here:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Grant/revoke app admin access (coming soon)</li>
            <li>Impersonate user for support (coming soon)</li>
            <li>View user activity logs (coming soon)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

import Link from 'next/link'
import { superadminDb } from '@startkit/database'
import { users } from '@startkit/database/schema'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@startkit/ui'
import { Shield, ExternalLink } from 'lucide-react'

/**
 * Users Admin Page
 * 
 * List and manage all users in the product
 */
export default async function UsersAdminPage() {
  // Fetch all users (limited to 100 for now)
  const allUsers = await superadminDb
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage all users in this product
          </p>
        </div>
      </div>

      {/* Users list */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({allUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {allUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found</p>
          ) : (
            <div className="space-y-4">
              {allUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name || user.email}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {user.email[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{user.name || 'No name'}</p>
                        {user.isSuperadmin && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <Shield className="h-3 w-3" />
                            Platform Superadmin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    <Link href={`/admin/users/${user.id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
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

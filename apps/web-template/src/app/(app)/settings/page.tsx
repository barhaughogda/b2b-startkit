import { requireAuth } from '@startkit/auth/server'
import { UserButton } from '@startkit/auth'

/**
 * Settings page - user and organization settings
 */
export default async function SettingsPage() {
  const { user, organization } = await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and organization settings.</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Section */}
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Profile</h2>
          <div className="flex items-center gap-4">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-16 h-16',
                },
              }}
            />
            <div>
              <div className="font-medium">{user.name ?? 'No name set'}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        </section>

        {/* Organization Section */}
        {organization && (
          <section className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Organization</h2>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="ml-2 font-medium">{organization.name}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Your Role:</span>
                <span className="ml-2 font-medium capitalize">{organization.role}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Plan:</span>
                <span className="ml-2 font-medium capitalize">{organization.plan}</span>
              </div>
            </div>
          </section>
        )}

        {/* Danger Zone */}
        <section className="rounded-lg border border-destructive/50 bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">
            Irreversible actions. Please proceed with caution.
          </p>
        </section>
      </div>
    </div>
  )
}

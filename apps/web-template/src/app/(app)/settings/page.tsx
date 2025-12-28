import { requireAuth } from '@startkit/auth/server'
import { UserButton, OrganizationProfile } from '@startkit/auth'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderTitle,
  PageHeaderDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@startkit/ui'
import { superadminDb } from '@startkit/database'
import { organizations } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'
import { OrganizationSettingsForm, DangerZone } from './components'

/**
 * Settings page - user and organization settings
 */
export default async function SettingsPage() {
  const { user, organization } = await requireAuth()

  // Fetch organization data if in an org
  let orgData = null
  if (organization) {
    const [org] = await superadminDb
      .select()
      .from(organizations)
      .where(eq(organizations.id, organization.organizationId))
      .limit(1)
    orgData = org
  }

  const canEditOrg = organization?.role === 'owner' || organization?.role === 'admin'
  const isOwner = organization?.role === 'owner'

  return (
    <div className="space-y-8">
      {/* Page header */}
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Settings</PageHeaderTitle>
          <PageHeaderDescription>
            Manage your account and organization settings.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {organization && <TabsTrigger value="organization">Organization</TabsTrigger>}
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Profile</CardTitle>
              <CardDescription>
                Manage your personal account settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {/* Clerk UserButton provides profile management */}
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: 'w-20 h-20',
                    },
                  }}
                />
                <div>
                  <h3 className="font-semibold text-lg">{user.name ?? 'No name set'}</h3>
                  <p className="text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click your avatar to manage your profile, security settings, and more.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm">{user.userId}</p>
                </div>
              </div>
              {user.isSuperadmin && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-amber-600">⚡ Superadmin Access</p>
                  <p className="text-sm text-muted-foreground">
                    You have elevated privileges across all organizations.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        {organization && orgData && (
          <TabsContent value="organization" className="space-y-6">
            <OrganizationSettingsForm
              organization={{
                name: orgData.name,
                slug: orgData.slug,
                settings: orgData.settings ?? undefined,
              }}
              canEdit={canEditOrg}
            />

            {/* Organization Members via Clerk */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organization Profile</CardTitle>
                <CardDescription>
                  Manage organization branding and public profile.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrganizationProfile
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      card: 'shadow-none p-0 border-0',
                    },
                  }}
                />
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <DangerZone
              organization={{ name: organization.name }}
              isOwner={isOwner}
            />
          </TabsContent>
        )}

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you&apos;d like to receive.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <NotificationSetting
                  title="Product updates"
                  description="Receive emails about new features and improvements."
                  defaultEnabled={true}
                />
                <NotificationSetting
                  title="Team activity"
                  description="Get notified when team members join or leave."
                  defaultEnabled={true}
                />
                <NotificationSetting
                  title="Billing alerts"
                  description="Receive notifications about billing and payment issues."
                  defaultEnabled={true}
                />
                <NotificationSetting
                  title="Security alerts"
                  description="Get alerted about security-related events."
                  defaultEnabled={true}
                />
                <NotificationSetting
                  title="Marketing emails"
                  description="Receive promotional emails and newsletters."
                  defaultEnabled={false}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NotificationSetting({
  title,
  description,
  defaultEnabled,
}: {
  title: string
  description: string
  defaultEnabled: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          defaultChecked={defaultEnabled}
        />
        <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
      </label>
    </div>
  )
}

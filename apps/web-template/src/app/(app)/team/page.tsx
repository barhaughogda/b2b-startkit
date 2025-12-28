import { requireOrganization } from '@startkit/auth/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  PageHeaderContent,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
} from '@startkit/ui'
import { Users } from 'lucide-react'
import { getTeamMembers } from './data'
import { TeamTable, InviteMemberDialog } from './components'

/**
 * Team management page
 * 
 * Shows organization members and allows inviting new members.
 */
export default async function TeamPage() {
  const { user, organization } = await requireOrganization()
  const members = await getTeamMembers(organization.organizationId)

  const canInvite = organization.role === 'owner' || organization.role === 'admin'

  return (
    <div className="space-y-8">
      {/* Page header */}
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Team</PageHeaderTitle>
          <PageHeaderDescription>
            Manage your organization members and their roles.
          </PageHeaderDescription>
        </PageHeaderContent>
        {canInvite && (
          <PageHeaderActions>
            <InviteMemberDialog organizationId={organization.organizationId} />
          </PageHeaderActions>
        )}
      </PageHeader>

      {/* Team members table */}
      {members.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              {members.length} {members.length === 1 ? 'Member' : 'Members'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeamTable
              members={members}
              currentUserId={user.userId}
              currentUserRole={organization.role}
              organizationId={organization.organizationId}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="py-12">
          <CardContent>
            <EmptyState>
              <EmptyStateIcon>
                <Users className="h-10 w-10" />
              </EmptyStateIcon>
              <EmptyStateTitle>No team members yet</EmptyStateTitle>
              <EmptyStateDescription>
                Start building your team by inviting members to collaborate.
              </EmptyStateDescription>
              {canInvite && (
                <EmptyStateAction>
                  <InviteMemberDialog organizationId={organization.organizationId} />
                </EmptyStateAction>
              )}
            </EmptyState>
          </CardContent>
        </Card>
      )}

      {/* Role descriptions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Owner</h3>
            <p className="text-sm text-muted-foreground">
              Full access to all features, billing, and team management. 
              Can delete the organization and transfer ownership.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Admin</h3>
            <p className="text-sm text-muted-foreground">
              Can invite and remove members (except owners), manage settings, 
              and access all features except billing.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Member</h3>
            <p className="text-sm text-muted-foreground">
              Standard access to all product features. Cannot manage 
              team members or organization settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

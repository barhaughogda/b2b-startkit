import { Users } from 'lucide-react'

/**
 * Team management page
 * 
 * Shows organization members and allows inviting new members.
 */
export default function TeamPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-muted-foreground">
          Manage your organization members
        </p>
      </div>

      {/* Info card */}
      <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Team Management</h2>
        <p className="max-w-md text-muted-foreground">
          Create an organization to invite team members and collaborate on your projects.
          Use the organization switcher in the sidebar to get started.
        </p>
      </div>

      {/* Coming soon features */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-2 font-semibold">Member Management</h3>
          <p className="text-sm text-muted-foreground">
            Invite members, assign roles, and manage permissions.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-2 font-semibold">Role-Based Access</h3>
          <p className="text-sm text-muted-foreground">
            Control what team members can see and do with granular permissions.
          </p>
        </div>
      </div>
    </div>
  )
}

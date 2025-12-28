'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Alert,
  AlertDescription,
  toast,
} from '@startkit/ui'
import { AlertTriangle, Trash2, LogOut } from 'lucide-react'
import { updateOrganizationSettings, deleteOrganization, leaveOrganization } from './actions'

// Common timezones
const timezones = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
  { value: 'Asia/Shanghai', label: 'China Standard Time' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time' },
]

interface OrganizationSettingsFormProps {
  organization: {
    name: string
    slug: string
    settings?: {
      timezone?: string
    }
  }
  canEdit: boolean
}

export function OrganizationSettingsForm({ organization, canEdit }: OrganizationSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(organization.name)
  const [timezone, setTimezone] = useState(organization.settings?.timezone ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return

    const formData = new FormData()
    formData.append('name', name)
    formData.append('timezone', timezone)

    startTransition(async () => {
      const result = await updateOrganizationSettings(formData)
      if (result.success) {
        toast.success('Settings saved successfully')
      } else {
        toast.error(result.error ?? 'Failed to save settings')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Organization Settings</CardTitle>
        <CardDescription>
          Manage your organization&apos;s basic information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              placeholder="My Organization"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">Organization Slug</Label>
            <Input
              id="slug"
              value={organization.slug}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              The slug cannot be changed after creation.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={!canEdit}>
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canEdit && (
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

interface DangerZoneProps {
  organization: {
    name: string
  }
  isOwner: boolean
}

export function DangerZone({ organization, isOwner }: DangerZoneProps) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-lg text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>
          Irreversible actions. Please proceed with caution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOwner ? (
          <DeleteOrganizationDialog organizationName={organization.name} />
        ) : (
          <LeaveOrganizationDialog organizationName={organization.name} />
        )}
      </CardContent>
    </Card>
  )
}

interface DeleteOrganizationDialogProps {
  organizationName: string
}

function DeleteOrganizationDialog({ organizationName }: DeleteOrganizationDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteOrganization(confirmText)
      if (result.success) {
        toast.success('Organization deleted')
        router.push('/')
      } else {
        toast.error(result.error ?? 'Failed to delete organization')
      }
    })
  }

  const canDelete = confirmText === organizationName

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
      <div>
        <h4 className="font-medium">Delete Organization</h4>
        <p className="text-sm text-muted-foreground">
          Permanently delete this organization and all its data.
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the organization
              and remove all associated data.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> All team members will lose access, and all data 
              including projects, settings, and billing information will be permanently deleted.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-mono font-bold">{organizationName}</span> to confirm:
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={organizationName}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canDelete || isPending}
            >
              {isPending ? 'Deleting...' : 'Delete Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface LeaveOrganizationDialogProps {
  organizationName: string
}

function LeaveOrganizationDialog({ organizationName }: LeaveOrganizationDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleLeave = () => {
    startTransition(async () => {
      const result = await leaveOrganization()
      if (result.success) {
        toast.success('You have left the organization')
        router.push('/')
      } else {
        toast.error(result.error ?? 'Failed to leave organization')
      }
    })
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
      <div>
        <h4 className="font-medium">Leave Organization</h4>
        <p className="text-sm text-muted-foreground">
          Remove yourself from {organizationName}.
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Leave
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave {organizationName}? 
              You&apos;ll need to be re-invited to rejoin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLeave} disabled={isPending}>
              {isPending ? 'Leaving...' : 'Leave Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

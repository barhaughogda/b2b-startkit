'use client'

import { useState, useTransition } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@startkit/ui'
import { MoreHorizontal, Plus, Shield, Crown, User, Trash2 } from 'lucide-react'
import type { TeamMember } from './data'
import { inviteMember, updateMemberRole, removeMember } from './actions'

// Role badge colors
const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
}

// Role icons
const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  member: <User className="h-3 w-3" />,
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

interface TeamTableProps {
  members: TeamMember[]
  currentUserId: string
  currentUserRole: string
  organizationId: string
}

export function TeamTable({ members, currentUserId, currentUserRole, organizationId }: TeamTableProps) {
  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin'
  const isOwner = currentUserRole === 'owner'

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          {canManageMembers && <TableHead className="w-[70px]"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {member.avatarUrl && (
                    <AvatarImage src={member.avatarUrl} alt={member.name ?? member.email} />
                  )}
                  <AvatarFallback>{getInitials(member.name, member.email)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {member.name ?? 'Unknown'}
                    {member.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={roleBadgeVariant[member.role]} className="gap-1">
                {roleIcons[member.role]}
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(member.joinedAt)}
            </TableCell>
            {canManageMembers && (
              <TableCell>
                <MemberActions
                  member={member}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                  organizationId={organizationId}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface MemberActionsProps {
  member: TeamMember
  currentUserId: string
  isOwner: boolean
  organizationId: string
}

function MemberActions({ member, currentUserId, isOwner, organizationId }: MemberActionsProps) {
  const [isPending, startTransition] = useTransition()
  const isSelf = member.id === currentUserId
  const isTargetOwner = member.role === 'owner'

  // Can't modify self or owner (unless you're the owner changing someone else)
  const canModify = !isSelf && !isTargetOwner

  if (!canModify) return null

  const handleRoleChange = (newRole: string) => {
    startTransition(async () => {
      const result = await updateMemberRole(organizationId, member.memberId, newRole as 'admin' | 'member')
      if (result.success) {
        toast.success(`Updated ${member.name ?? member.email}'s role to ${newRole}`)
      } else {
        toast.error(result.error ?? 'Failed to update role')
      }
    })
  }

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeMember(organizationId, member.memberId)
      if (result.success) {
        toast.success(`Removed ${member.name ?? member.email} from the team`)
      } else {
        toast.error(result.error ?? 'Failed to remove member')
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isOwner && member.role === 'member' && (
          <DropdownMenuItem onClick={() => handleRoleChange('admin')}>
            <Shield className="mr-2 h-4 w-4" />
            Make Admin
          </DropdownMenuItem>
        )}
        {isOwner && member.role === 'admin' && (
          <DropdownMenuItem onClick={() => handleRoleChange('member')}>
            <User className="mr-2 h-4 w-4" />
            Make Member
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleRemove} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Remove from team
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface InviteMemberDialogProps {
  organizationId: string
}

export function InviteMemberDialog({ organizationId }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await inviteMember(organizationId, email, role)
      if (result.success) {
        toast.success(`Invitation sent to ${email}`)
        setOpen(false)
        setEmail('')
        setRole('member')
      } else {
        toast.error(result.error ?? 'Failed to send invitation')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to add a new member to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'member')}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Member</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === 'admin'
                  ? 'Admins can invite members and manage team settings.'
                  : 'Members have access to all features but cannot manage the team.'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !email}>
              {isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

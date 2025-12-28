'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@startkit/ui'
import {
  Building2,
  Users,
  CreditCard,
  Settings,
  Calendar,
  ExternalLink,
  UserCog,
  Flag,
  AlertTriangle,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import type { OrganizationDetail } from '../data'

interface OrganizationDetailContentProps {
  organization: OrganizationDetail
}

export function OrganizationDetailContent({ organization }: OrganizationDetailContentProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{organization.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="font-mono text-xs">{organization.slug}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Clerk ID</dt>
                <dd className="font-mono text-xs truncate">{organization.clerkOrgId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{format(organization.createdAt, 'PPP')}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Members ({organization.memberCount})
            </CardTitle>
            <CardDescription>Team members with access to this organization</CardDescription>
          </CardHeader>
          <CardContent>
            {organization.members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No members found</p>
              </div>
            ) : (
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organization.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.user.avatarUrl || undefined} />
                              <AvatarFallback>
                                {member.user.name?.charAt(0) || member.user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.user.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{member.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={member.role} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(member.joinedAt, { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link href={`/users/${member.user.id}`}>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" title="Impersonate user">
                              <UserCog className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {organization.subscriptionDetails ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <PlanBadge plan={organization.subscriptionDetails.plan} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={organization.subscriptionDetails.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Seats</span>
                  <span className="font-medium">
                    {organization.subscriptionDetails.seatCount}
                    {organization.subscriptionDetails.maxSeats && (
                      <span className="text-muted-foreground">
                        {' '}/ {organization.subscriptionDetails.maxSeats}
                      </span>
                    )}
                  </span>
                </div>
                {organization.subscriptionDetails.currentPeriodEnd && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Renews</span>
                    <span className="text-sm">
                      {format(organization.subscriptionDetails.currentPeriodEnd, 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                {organization.subscriptionDetails.cancelAtPeriodEnd && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Cancels at period end
                  </div>
                )}
                <div className="pt-2 border-t border-border">
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in Stripe
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No subscription</p>
                <Button variant="outline" size="sm" className="mt-4">
                  Create subscription
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Flag className="h-4 w-4 mr-2" />
              Manage feature flags
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              Extend trial
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Suspend organization
            </Button>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Organization Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(organization.settings).length === 0 ? (
              <p className="text-sm text-muted-foreground">No custom settings</p>
            ) : (
              <pre className="text-xs bg-secondary/50 rounded-md p-3 overflow-x-auto">
                {JSON.stringify(organization.settings, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const roleConfig: Record<string, { variant: 'default' | 'secondary' | 'outline'; className: string }> = {
    owner: { variant: 'default', className: 'bg-primary' },
    admin: { variant: 'outline', className: 'border-amber-500/50 text-amber-400' },
    member: { variant: 'secondary', className: '' },
  }

  const config = roleConfig[role] || roleConfig.member

  return (
    <Badge variant={config.variant} className={config.className}>
      {role}
    </Badge>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <Badge variant={plan === 'free' ? 'secondary' : 'default'} className="capitalize">
      {plan}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
    active: { variant: 'default', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    trialing: { variant: 'outline', className: 'border-amber-500/50 text-amber-400' },
    past_due: { variant: 'outline', className: 'border-orange-500/50 text-orange-400' },
    canceled: { variant: 'destructive', className: '' },
  }

  const config = statusConfig[status] || { variant: 'secondary' as const, className: '' }

  return (
    <Badge variant={config.variant} className={config.className}>
      {status.replace('_', ' ')}
    </Badge>
  )
}

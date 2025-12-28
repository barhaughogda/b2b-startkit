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
  User,
  Building2,
  Shield,
  Mail,
  Calendar,
  ExternalLink,
  UserCog,
  KeyRound,
  AlertTriangle,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import type { UserDetail } from '../data'

interface UserDetailContentProps {
  user: UserDetail
}

export function UserDetailContent({ user }: UserDetailContentProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* User info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">
                  {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{user.name || 'Not set'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium flex items-center gap-2">
                      {user.email}
                      <Mail className="h-3 w-3 text-muted-foreground" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Clerk ID</dt>
                    <dd className="font-mono text-xs truncate">{user.clerkId}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Joined</dt>
                    <dd className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {format(user.createdAt, 'PPP')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Role</dt>
                    <dd>
                      {user.isSuperadmin ? (
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          <Shield className="h-3 w-3 mr-1" />
                          Superadmin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organizations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Organizations ({user.organizationCount})
            </CardTitle>
            <CardDescription>Organizations this user belongs to</CardDescription>
          </CardHeader>
          <CardContent>
            {user.organizations.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Not a member of any organization
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <Link
                              href={`/organizations/${org.id}`}
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {org.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">{org.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={org.role} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(org.joinedAt, { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Link href={`/organizations/${org.id}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
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
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Admin Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!user.isSuperadmin && (
              <Button variant="outline" size="sm" className="w-full justify-start">
                <UserCog className="h-4 w-4 mr-2" />
                Impersonate user
              </Button>
            )}
            <Button variant="outline" size="sm" className="w-full justify-start">
              <KeyRound className="h-4 w-4 mr-2" />
              Force password reset
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Mail className="h-4 w-4 mr-2" />
              Send verification email
            </Button>
            {!user.isSuperadmin && (
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Grant superadmin
              </Button>
            )}
            {user.isSuperadmin && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-amber-400 hover:text-amber-400"
              >
                <Shield className="h-4 w-4 mr-2" />
                Revoke superadmin
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Deactivate user
            </Button>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              User Metadata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Internal ID</dt>
                <dd className="font-mono text-xs truncate">{user.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Clerk ID</dt>
                <dd className="font-mono text-xs truncate">{user.clerkId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{format(user.createdAt, 'PPpp')}</dd>
              </div>
            </dl>
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

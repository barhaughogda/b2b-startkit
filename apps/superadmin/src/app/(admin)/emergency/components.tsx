'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Input,
  Label,
  Textarea,
} from '@startkit/ui'
import {
  AlertTriangle,
  Power,
  PowerOff,
  Shield,
  Building2,
  Clock,
  User,
  XCircle,
  CheckCircle,
  Zap,
  RefreshCw,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import type { ActiveKillSwitchItem, SuspendedOrganizationItem } from './data'

interface EmergencyContentProps {
  activeKillSwitches: ActiveKillSwitchItem[]
  suspendedOrgs: SuspendedOrganizationItem[]
  stats: {
    activeKillSwitchCount: number
    suspendedOrgCount: number
    isSystemDown: boolean
  }
}

export function EmergencyContent({
  activeKillSwitches,
  suspendedOrgs,
  stats,
}: EmergencyContentProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleActivateGlobalKillSwitch = async (reason: string) => {
    setIsLoading(true)
    try {
      await fetch('/api/admin/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'global',
          targetId: 'system',
          reason,
          enabled: true,
        }),
      })
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeactivateKillSwitch = async (scope: string, targetId: string) => {
    setIsLoading(true)
    try {
      await fetch('/api/admin/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          targetId,
          enabled: false,
        }),
      })
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnsuspendOrg = async (orgId: string) => {
    setIsLoading(true)
    try {
      await fetch('/api/admin/organization/unsuspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
      })
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* System Status Banner */}
      {stats.isSystemDown && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 flex items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <h3 className="font-bold text-destructive">SYSTEM IS CURRENTLY DOWN</h3>
            <p className="text-sm text-muted-foreground">
              Global kill switch is active. All products are disabled.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={stats.isSystemDown ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            {stats.isSystemDown ? (
              <PowerOff className="h-4 w-4 text-destructive" />
            ) : (
              <Power className="h-4 w-4 text-emerald-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.isSystemDown ? (
                <span className="text-destructive">OFFLINE</span>
              ) : (
                <span className="text-emerald-400">ONLINE</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.isSystemDown ? 'All services disabled' : 'All services operational'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Kill Switches</CardTitle>
            <Shield className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeKillSwitchCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeKillSwitchCount === 0 ? 'No active blocks' : 'Active blocks'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suspended Orgs</CardTitle>
            <Building2 className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suspendedOrgCount}</div>
            <p className="text-xs text-muted-foreground">
              Organizations suspended
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Actions */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Emergency Controls
          </CardTitle>
          <CardDescription>
            Use these controls only in emergency situations. Actions are logged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div>
              <h4 className="font-semibold">Global System Kill Switch</h4>
              <p className="text-sm text-muted-foreground">
                Immediately disable ALL products for ALL users
              </p>
            </div>
            {stats.isSystemDown ? (
              <Button
                variant="outline"
                onClick={() => handleDeactivateKillSwitch('global', 'system')}
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Restore System
              </Button>
            ) : (
              <GlobalKillSwitchDialog onConfirm={handleActivateGlobalKillSwitch} isLoading={isLoading} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Kill Switches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Active Kill Switches
          </CardTitle>
          <CardDescription>
            Currently active emergency blocks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeKillSwitches.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-400/50" />
              <p className="mt-4 text-muted-foreground">No active kill switches</p>
              <p className="text-sm text-muted-foreground">All systems operating normally</p>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scope</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Activated</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeKillSwitches.map((ks) => (
                    <TableRow key={ks.id}>
                      <TableCell>
                        <ScopeBadge scope={ks.scope} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{ks.targetId}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{ks.reason || '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {ks.activatedAt
                          ? formatDistanceToNow(ks.activatedAt, { addSuffix: true })
                          : '-'}
                        {ks.activatedBy && (
                          <div className="text-xs">by {ks.activatedBy.email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {ks.expiresAt
                          ? format(ks.expiresAt, 'PPp')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivateKillSwitch(ks.scope, ks.targetId)}
                          disabled={isLoading}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspended Organizations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Suspended Organizations
          </CardTitle>
          <CardDescription>
            Organizations that have been suspended or locked
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suspendedOrgs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-400/50" />
              <p className="mt-4 text-muted-foreground">No suspended organizations</p>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Suspended</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspendedOrgs.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <Link
                          href={`/organizations/${org.id}`}
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          <Building2 className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-xs text-muted-foreground">{org.slug}</p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={org.status} />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {org.suspendedReason || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {org.suspendedAt
                          ? formatDistanceToNow(org.suspendedAt, { addSuffix: true })
                          : '-'}
                        {org.suspendedBy && (
                          <div className="text-xs">by {org.suspendedBy.email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnsuspendOrg(org.id)}
                          disabled={isLoading}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
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
  )
}

function ScopeBadge({ scope }: { scope: string }) {
  const config: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; className: string }> = {
    global: { variant: 'destructive', className: '' },
    product: { variant: 'default', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    feature: { variant: 'outline', className: 'border-blue-500/50 text-blue-400' },
    organization: { variant: 'secondary', className: '' },
  }

  const c = config[scope] || config.organization

  return (
    <Badge variant={c.variant} className={c.className}>
      {scope}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; className: string }> = {
    suspended: { variant: 'outline', className: 'border-orange-500/50 text-orange-400' },
    locked: { variant: 'destructive', className: '' },
  }

  const c = config[status] || { variant: 'secondary' as const, className: '' }

  return (
    <Badge variant={c.variant} className={c.className}>
      {status}
    </Badge>
  )
}

function GlobalKillSwitchDialog({
  onConfirm,
  isLoading,
}: {
  onConfirm: (reason: string) => void
  isLoading: boolean
}) {
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isLoading}>
          <Zap className="h-4 w-4 mr-2" />
          Emergency Shutdown
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Activate Global Kill Switch?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will immediately disable ALL products for ALL users. Only do this in a genuine emergency.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for shutdown (required)</Label>
            <Textarea
              id="reason"
              placeholder="Describe the emergency situation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!reason.trim() || isLoading}
            onClick={() => {
              onConfirm(reason)
              setOpen(false)
              setReason('')
            }}
          >
            Confirm Shutdown
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

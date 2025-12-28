'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Button,
  Checkbox,
  Label,
} from '@startkit/ui'
import {
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Building2,
  CreditCard,
  Settings,
  Flag,
  UserCog,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useState, useTransition } from 'react'
import type { ActivityLogItem } from './data'

interface ActivityLogContentProps {
  logs: ActivityLogItem[]
  total: number
  page: number
  totalPages: number
  actionTypes: string[]
  filters: {
    search?: string
    action?: string
    superadminOnly?: boolean
  }
}

export function ActivityLogContent({
  logs,
  total,
  page,
  totalPages,
  actionTypes,
  filters,
}: ActivityLogContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(filters.search || '')

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    if (!updates.page) {
      params.delete('page')
    }

    startTransition(() => {
      router.push(`/activity?${params.toString()}`)
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: searchValue || undefined })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by email, action, or resource..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-9"
                />
              </div>
            </form>

            {/* Action type filter */}
            <Select
              value={filters.action || 'all'}
              onValueChange={(value) => updateFilters({ action: value })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionTypes.map((type) => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Superadmin filter */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="superadmin"
                checked={filters.superadminOnly}
                onCheckedChange={(checked) =>
                  updateFilters({ superadmin: checked ? 'true' : undefined })
                }
              />
              <Label htmlFor="superadmin" className="text-sm cursor-pointer">
                Admin actions only
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Activity Feed
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {total.toLocaleString()} events
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No activity found</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {logs.map((log) => (
                  <ActivityLogEntry key={log.id} log={log} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || isPending}
                      onClick={() => updateFilters({ page: String(page - 1) })}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || isPending}
                      onClick={() => updateFilters({ page: String(page + 1) })}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ActivityLogEntry({ log }: { log: ActivityLogItem }) {
  const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    user: User,
    organization: Building2,
    subscription: CreditCard,
    billing: CreditCard,
    impersonation: UserCog,
    settings: Settings,
    feature_flag: Flag,
  }

  const actionCategory = log.action.split('.')[0]
  const Icon = actionIcons[actionCategory] || Activity

  return (
    <div className="flex items-start gap-4 py-3 border-b border-border last:border-0">
      <div className="mt-1 p-2 rounded-full bg-secondary">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{formatAction(log.action)}</span>
          {log.isSuperadminAction && (
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
          {log.userEmail && (
            <span>by {log.userEmail}</span>
          )}
          {log.organizationName && (
            <>
              <span>•</span>
              <Link
                href={`/organizations/${log.organizationId}`}
                className="hover:text-primary transition-colors"
              >
                {log.organizationName}
              </Link>
            </>
          )}
          {log.resourceType && log.resourceId && (
            <>
              <span>•</span>
              <span>
                {log.resourceType}: {log.resourceId.slice(0, 8)}...
              </span>
            </>
          )}
        </div>

        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div className="mt-2 p-2 rounded bg-secondary/50 text-xs">
            <pre className="overflow-x-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>{format(log.createdAt, 'PPpp')}</span>
          {log.ipAddress && (
            <span>IP: {log.ipAddress}</span>
          )}
        </div>
      </div>

      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(log.createdAt, { addSuffix: true })}
      </span>
    </div>
  )
}

function formatAction(action: string): string {
  const actionLabels: Record<string, string> = {
    'user.created': 'User created',
    'user.updated': 'User updated',
    'user.deleted': 'User deleted',
    'organization.created': 'Organization created',
    'organization.updated': 'Organization updated',
    'organization.deleted': 'Organization deleted',
    'subscription.created': 'Subscription created',
    'subscription.updated': 'Subscription updated',
    'subscription.canceled': 'Subscription canceled',
    'impersonation.started': 'Impersonation started',
    'impersonation.ended': 'Impersonation ended',
    'settings.updated': 'Settings updated',
    'feature_flag.enabled': 'Feature flag enabled',
    'feature_flag.disabled': 'Feature flag disabled',
    'billing.invoice_paid': 'Invoice paid',
    'billing.invoice_failed': 'Invoice payment failed',
  }

  return actionLabels[action] || action.split('.').map(s => 
    s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')
  ).join(' ')
}
